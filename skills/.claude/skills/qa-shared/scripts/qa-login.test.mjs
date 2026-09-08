import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { once } from "node:events";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { fileURLToPath } from "node:url";
import test from "node:test";

const helper = fileURLToPath(new URL("./qa-login.mjs", import.meta.url));
const email = "qa-fixture@example.test";
const password = "synthetic credential for helper tests";
const token = "synthetic-session-value";

function start(args, credentials = true) {
  const child = spawn(process.execPath, [helper, ...args], {
    env: {
      ...process.env,
      QA_EMAIL: credentials ? email : "",
      QA_PASSWORD: credentials ? password : "",
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  const output = { stdout: "", stderr: "" };
  child.stdout.on("data", (chunk) => {
    output.stdout += chunk;
  });
  child.stderr.on("data", (chunk) => {
    output.stderr += chunk;
  });
  return { child, output, closed: once(child, "close") };
}

test("missing variables and invalid targets fail without exposing values", async () => {
  for (const [args, credentials] of [
    [[], false],
    [["--server-url", "http://example.test"], true],
  ]) {
    const run = start(args, credentials);
    assert.equal((await run.closed)[0], 2);
    assert.equal(run.output.stdout, "");
    assert.ok(!run.output.stderr.includes(password));
  }
});

test("session handoff authenticates, keeps secrets out of logs and serves once", async (t) => {
  const server = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    const parsed = JSON.parse(body);
    assert.equal(request.url, "/prefix/api-gateway/");
    assert.deepEqual(parsed.variables, { email, password });
    response.setHeader(
      "Set-Cookie",
      `authSess:beancount.io=${token}; Path=/; HttpOnly; SameSite=Lax`,
    );
    response.end(
      JSON.stringify({
        data: { signIn: { token, expireAt: "2099-01-01T00:00:00Z" } },
      }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const run = start([
    "--server-url",
    `http://127.0.0.1:${server.address().port}/prefix`,
  ]);
  t.after(() => run.child.kill());
  await once(run.child.stdout, "data");
  const url = run.output.stdout.trim().replace(/^ok /, "");
  assert.match(url, /^http:\/\/127\.0\.0\.1:\d+\/[a-f0-9]{48}\.json$/);
  const results = await Promise.allSettled([fetch(url), fetch(url)]);
  const successful = results.filter(
    (result) => result.status === "fulfilled" && result.value.status === 200,
  );
  assert.equal(successful.length, 1);
  const response = successful[0].value;
  assert.equal(response.headers.get("cache-control"), "no-store");
  const state = await response.json();
  assert.equal(state.cookies[0].value, token);
  assert.equal(state.cookies[0].httpOnly, true);
  assert.equal(state.cookies[0].sameSite, "Lax");
  assert.equal((await run.closed)[0], 0);
  for (const secret of [email, password, token]) {
    assert.ok(!run.output.stdout.includes(secret));
    assert.ok(!run.output.stderr.includes(secret));
  }
});

test("upstream rejection never echoes a response containing credentials", async (t) => {
  const server = http.createServer((_, response) => {
    response.end(
      JSON.stringify({ errors: [{ message: `${email} ${password}` }] }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const run = start([
    "--server-url",
    `http://127.0.0.1:${server.address().port}`,
  ]);
  assert.equal((await run.closed)[0], 1);
  assert.equal(run.output.stdout, "");
  assert.ok(!run.output.stderr.includes(password));
});

test("an explicit package file selects its own account without ambient fallback", async (t) => {
  const scratch = new URL("../../../../tmp/", import.meta.url);
  await mkdir(scratch, { recursive: true });
  const directory = await mkdtemp(
    fileURLToPath(new URL("qa-env-test-", scratch)),
  );
  t.after(() => rm(directory, { recursive: true, force: true }));
  const envFile = `${directory}/.env`;
  const fileEmail = "mobile-fixture@example.test";
  const filePassword = "different synthetic account";
  await writeFile(
    envFile,
    `QA_EMAIL=${fileEmail}\nQA_PASSWORD="${filePassword}"\n`,
    {
      mode: 0o600,
    },
  );
  let submitted;
  const server = http.createServer(async (request, response) => {
    let body = "";
    for await (const chunk of request) body += chunk;
    submitted = JSON.parse(body).variables;
    response.end(
      JSON.stringify({ errors: [{ message: "fixture rejection" }] }),
    );
  });
  server.listen(0, "127.0.0.1");
  await once(server, "listening");
  t.after(() => server.close());
  const args = [
    "--env-file",
    envFile,
    "--server-url",
    `http://127.0.0.1:${server.address().port}`,
  ];
  const complete = start(args);
  assert.equal((await complete.closed)[0], 1);
  assert.deepEqual(submitted, { email: fileEmail, password: filePassword });
  for (const secret of [email, password, fileEmail, filePassword]) {
    assert.ok(!complete.output.stdout.includes(secret));
    assert.ok(!complete.output.stderr.includes(secret));
  }
  submitted = undefined;
  await writeFile(envFile, `QA_EMAIL=${fileEmail}\n`);
  const incomplete = start(args);
  assert.equal((await incomplete.closed)[0], 2);
  assert.equal(submitted, undefined);
  assert.equal(incomplete.output.stdout, "");
});
