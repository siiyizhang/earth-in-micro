// Some mobile file pickers and storage downloads omit a useful MIME type.
// Only infer a supported type for empty/generic MIME values or known aliases.
export function normalizeMediaFile(file: File): File {
  const aliases: Record<string, string> = { "video/x-m4v": "video/mp4", "image/jpg": "image/jpeg" };
  const extensions: Record<string, string> = { mp4: "video/mp4", m4v: "video/mp4", mov: "video/quicktime", webm: "video/webm", jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp" };
  const type = aliases[file.type] ?? ((!file.type || file.type === "application/octet-stream") ? extensions[file.name.split(".").pop()?.toLowerCase() ?? ""] : file.type);
  return type && type !== file.type ? new File([file], file.name, { type, lastModified: file.lastModified }) : file;
}
