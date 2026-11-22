import { describe, expect, it } from "vitest";
import { clipboardFiles, mergeComposerImages } from "./composerClipboard";
import { MAX_INLINE_IMAGE_BYTES } from "./inlineImages";

describe("AI composer clipboard", () => {
  const screenshot = () => new File(["image"], "image.png", { type: "image/png", lastModified: 1 });
  const textItem: Pick<DataTransferItem, "kind" | "type" | "getAsFile"> = { kind: "string", type: "text/plain", getAsFile: () => null };
  const clipboard = (items: typeof textItem[], files: File[] = []) => ({ items, files }) as unknown as DataTransfer;

  it("leaves ordinary text to the browser and extracts image files from mixed payloads once", () => {
    const file = screenshot();
    expect(clipboardFiles(clipboard([textItem]))).toEqual([]);
    expect(clipboardFiles(clipboard([textItem, { ...textItem, kind: "file", getAsFile: () => file }], [file]))).toEqual([file]);
    expect(clipboardFiles(clipboard([], [file]))).toEqual([file]);
  });

  it("retains distinct screenshots even when the browser gives both the same name and timestamp", () => {
    const first = screenshot();
    const next = screenshot();
    expect(mergeComposerImages([first], [first, next])).toEqual({ files: [first, next] });
  });

  it("keeps real-sized captures in the draft while rejecting a fifth file or an unsupported image", () => {
    const draft = [screenshot()];
    const big = new File([new Uint8Array(MAX_INLINE_IMAGE_BYTES + 1)], "large.png", { type: "image/png" });
    const fake = new File(["test"], "no.svg", { type: "image/svg+xml" });
    expect(mergeComposerImages(draft, [big])).toEqual({ files: [draft[0], big] });
    expect(mergeComposerImages(draft, [big, screenshot(), screenshot(), screenshot()])).toEqual({ error: "IMAGE_COUNT" });
    expect(mergeComposerImages(draft, [fake])).toEqual({ error: "IMAGE_INVALID" });
    expect(draft).toHaveLength(1);
  });
});
