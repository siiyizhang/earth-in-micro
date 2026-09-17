import test from "node:test";
import assert from "node:assert/strict";
import { normalizeMediaFile } from "../src/community/mediaFiles";
test("mobile MOV picker without MIME keeps original bytes and gets a video type", async () => {
  const file = new File([new Uint8Array([1,2,3])], "clip.MOV", {lastModified:123});
  const normalized = normalizeMediaFile(file);
  assert.equal(normalized.type, "video/quicktime");
  assert.equal(normalized.lastModified, 123);
  assert.deepEqual(await normalized.arrayBuffer(), await file.arrayBuffer());
});
test("generic storage videos and m4v picker aliases are recognized", () => {
  assert.equal(normalizeMediaFile(new File(["x"], "clip.mp4", {type:"application/octet-stream"})).type, "video/mp4");
  assert.equal(normalizeMediaFile(new File(["x"], "clip.m4v", {type:"video/x-m4v"})).type, "video/mp4");
});
test("unsupported explicit MIME is not disguised as a supported video", () => {
  const file = new File(["x"], "clip.mp4", {type:"application/pdf"});
  assert.equal(normalizeMediaFile(file), file);
});
