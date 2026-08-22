import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create } from "tar";
import { expectParity, PYTHON_URL, V2_URL } from "../expect-parity";
import { PARITY_USER } from "../seed";

const BEARER = "Bearer parity-webhook-token";

async function tarGzOf(files: Record<string, string>): Promise<Buffer> {
  const dir = mkdtempSync(join(tmpdir(), "parity-hook-"));
  for (const [path, content] of Object.entries(files)) {
    writeFileSync(join(dir, path), content);
  }
  const chunks: Buffer[] = [];
  const stream = create({ gzip: true, cwd: dir }, Object.keys(files));
  for await (const chunk of stream) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

async function preReceive(
  base: string,
  archive: Buffer,
  oldArchive?: Buffer,
): Promise<{ status: number; json: Record<string, unknown> }> {
  const form = new FormData();
  form.set("owner", PARITY_USER);
  form.set("repo", "book");
  form.set("archive", new Blob([new Uint8Array(archive)]), "archive.tar.gz");
  if (oldArchive) {
    form.set(
      "old_archive",
      new Blob([new Uint8Array(oldArchive)]),
      "old.tar.gz",
    );
  }
  const res = await fetch(`${base}/webhook/gitea/pre-receive-check`, {
    method: "POST",
    headers: { Authorization: BEARER },
    body: form,
  });
  return {
    status: res.status,
    json: (await res.json()) as Record<string, unknown>,
  };
}

describe("parity: gitea webhooks", () => {
  const pushPayload = {
    repository: {
      full_name: `${PARITY_USER}/book`,
      name: "book",
      owner: { username: PARITY_USER },
    },
    sender: { username: PARITY_USER },
  };

  it("repo-push ack parity (timestamp volatile)", async () => {
    const res = await expectParity({
      operation: "webhookGiteaRepoPush",
      method: "POST",
      path: "/webhook/gitea/repo-push",
      body: pushPayload,
      auth: { header: BEARER },
      volatileFields: ["timestamp"],
    });
    expect(res.status).toBe(200);
  });

  it("repo-push — 401 on a wrong bearer token, both services", async () => {
    const res = await expectParity({
      operation: "webhookGiteaRepoPush",
      method: "POST",
      path: "/webhook/gitea/repo-push",
      body: pushPayload,
      auth: { header: "Bearer wrong-token" },
    });
    expect(res.status).toBe(401);
  });

  it("repo-create ack parity for a non-create event", async () => {
    const res = await expectParity({
      operation: "webhookGiteaRepoCreate",
      method: "POST",
      path: "/webhook/gitea/repo-create",
      body: { ...pushPayload, action: "deleted" },
      auth: { header: BEARER },
      volatileFields: ["timestamp"],
    });
    expect(res.status).toBe(200);
  });

  it("pre-receive-check: identical decisions on both services (fail-open env)", async () => {
    // No BACKEND_V2_ADMIN_TOKEN in the parity stack → both services resolve
    // maxDirectives=None → allow with reason=unlimited_or_check_unavailable.
    const archive = await tarGzOf({
      "main.bean":
        "2024-01-01 open Assets:Cash USD\n2024-02-01 open Assets:B USD\n",
    });
    const old = await tarGzOf({
      "main.bean": "2024-01-01 open Assets:Cash USD\n",
    });

    const py = await preReceive(PYTHON_URL, archive, old);
    const v2 = await preReceive(V2_URL, archive, old);

    expect(py.status).toBe(200);
    expect(v2.status).toBe(200);
    expect(py.json).toEqual(v2.json); // counts, reason, allow — all strict
    const data = v2.json.data as Record<string, unknown>;
    expect(data.allow).toBe(true);
    expect(data.new_directive_count).toBe(2);
    expect(data.old_directive_count).toBe(1);
  });

  it("pre-receive-check: corrupt tarball fails open identically", async () => {
    const py = await preReceive(PYTHON_URL, Buffer.from("garbage"));
    const v2 = await preReceive(V2_URL, Buffer.from("garbage"));
    expect(py.status).toBe(200);
    expect(v2.status).toBe(200);
    expect((py.json.data as { reason: string }).reason).toBe("check_error");
    expect(py.json).toEqual(v2.json);
  });
});
