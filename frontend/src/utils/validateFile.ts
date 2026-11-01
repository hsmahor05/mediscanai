export const MAX_MB = Number(import.meta.env.VITE_MAX_UPLOAD_MB ?? 10);
const OK_EXT = ["pdf", "jpg", "jpeg", "png"];
const OK_MIME = ["application/pdf", "image/jpeg", "image/png"];

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

/** Returns an error message, or null if the file is acceptable. */
export function validateFile(file: File): string | null {
  if (file.size === 0) return "This file is empty. Please choose a different file.";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  const typeOk = file.type === "" || OK_MIME.includes(file.type);
  if (!OK_EXT.includes(ext) || !typeOk) return "Unsupported file type. Please upload a PDF, JPG or PNG file.";
  if (file.size > MAX_MB * 1024 * 1024) return `This file is ${formatSize(file.size)}; the limit is ${MAX_MB} MB.`;
  return null;
}
