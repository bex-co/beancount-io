import fs from "fs";
import path from "path";

/**
 * w21/405: with no cached profile and a failed request, Settings dropped its
 * Account section, the only way into Profile, without a word. Source checks:
 * the screen needs the native runtime.
 */
const src = fs
  .readFileSync(path.join(__dirname, "..", "main-content.tsx"), "utf8")
  .replace(/\s+/g, "");

describe("Settings' Account section", () => {
  it("reads the profile's loading and error, not only the user", () => {
    expect(
      src.includes(
        "const{user,displayName,loading:userLoading,error:userError,refetch:refetchUser,}=useCurrentUser();",
      ),
    ).toBe(true);
  });

  it("keeps its header while loading or failed", () => {
    expect(
      src.includes(
        '{(user||userLoading||userError)&&(<SectionHeadertitle={t("accountSettings")}/>)}',
      ),
    ).toBe(true);
  });

  it("shows a skeleton while loading and a retry when the profile failed", () => {
    expect(src.includes("{!user&&userLoading&&(")).toBe(true);
    expect(src.includes('testID="setting-profile-loading"')).toBe(true);
    expect(
      src.includes(
        "{!user&&!userLoading&&userError&&(<CardLoadFailureonRetry={()=>refetchUser()}/>)}",
      ),
    ).toBe(true);
  });
});
