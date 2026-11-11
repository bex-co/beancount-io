import fs from "fs";
import path from "path";

// w22/028: the editor is a web view; it must stay mounted to boot, so the
// skeleton cannot replace it. The wiring needs the native runtime and Apollo,
// so it is checked on the screen's source.
const screen = fs
  .readFileSync(path.join(__dirname, "..", "index.tsx"), "utf8")
  .replace(/\s+/gu, "");

describe("the file editor's boot skeleton", () => {
  it("keeps the editor mounted for the whole of the content state", () => {
    expect(
      screen.includes('editorState==="content"?(<FadeInViewfill><CodeEditor'),
    ).toBe(true);
  });

  it("lays the skeleton over the editor, after it, and fades it out", () => {
    const cover = screen.indexOf(
      "{coversEditorWithSkeleton(editorState,editorReady)?(<FadeOutViewfill",
    );
    expect(cover > -1).toBe(true);
    expect(cover > screen.indexOf("<CodeEditor")).toBe(true);
    expect(screen.includes('skeletonCover:{position:"absolute"')).toBe(true);
  });

  it("lifts it when the editor announces itself, first thing", () => {
    const ready = screen.slice(screen.indexOf("consthandleEditorReady="));
    const body = ready.slice(0, ready.indexOf("[],);"));
    expect(
      body.startsWith(
        "consthandleEditorReady=useCallback(async()=>{setEditorReady(true);constplan=",
      ),
    ).toBe(true);
    expect(
      screen.includes("[editorReady,setEditorReady]=useState(false)"),
    ).toBe(true);
  });
});
