import { toLedgerPublic } from "@/api/ledgers";
import { toFileContentPublic } from "@/api/files";
import { toUserPublic } from "@/api/serializers";
import { boolQuery, intQuery, strQuery } from "@/api/query-params";
import type {
  ContentsResponse,
  Repository,
  User,
} from "@/features/gitea/client/gitea-api";

describe("projections drop extra Gitea fields and include nulls", () => {
  it("toLedgerPublic — fixed 10-field shape", () => {
    const out = toLedgerPublic({
      id: 7,
      name: "book",
      full_name: "u/book",
      empty: false,
      private: true,
      size: 12,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-02T00:00:00Z",
      stars_count: 99, // extra Gitea field must be dropped
    } as unknown as Repository);
    expect(Object.keys(out).sort()).toEqual([
      "created_at",
      "description",
      "empty",
      "full_name",
      "id",
      "name",
      "permissions",
      "private",
      "size",
      "updated_at",
    ]);
    expect(out.description).toBeNull();
    expect(out.permissions).toBeNull();
    expect(out.created_at).toBe("2026-01-01T00:00:00Z"); // Z preserved
  });

  it("toFileContentPublic — nulls for absent optional fields", () => {
    const out = toFileContentPublic({
      name: "main.bean",
      path: "main.bean",
      type: "file",
      sha: "abc",
      size: 10,
    } as unknown as ContentsResponse);
    expect(out.content).toBeNull();
    expect(out.encoding).toBeNull();
    expect(out.last_commit_sha).toBeNull();
  });

  it("toUserPublic — all 14 fields present", () => {
    const out = toUserPublic({ id: 1, login: "u" } as unknown as User);
    expect(Object.keys(out)).toHaveLength(14);
    expect(out.full_name).toBeNull();
  });
});

describe("query-params coercion", () => {
  it("intQuery parses ints, rejects garbage, unwraps arrays", () => {
    expect(intQuery("5")).toBe(5);
    expect(intQuery(["7", "8"])).toBe(7);
    expect(intQuery("x")).toBeUndefined();
    expect(intQuery(undefined)).toBeUndefined();
  });
  it("boolQuery accepts true/1 only", () => {
    expect(boolQuery("true")).toBe(true);
    expect(boolQuery("1")).toBe(true);
    expect(boolQuery("false")).toBe(false);
    expect(boolQuery(undefined)).toBeUndefined();
  });
  it("strQuery unwraps arrays", () => {
    expect(strQuery(["a", "b"])).toBe("a");
  });
});
