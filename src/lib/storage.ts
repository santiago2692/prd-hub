import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Local-disk storage driver. Swap for Google Cloud Storage / S3 in production by keeping the same three functions.
 */
const root = path.resolve(process.env.UPLOAD_DIR || path.join(process.cwd(), "uploads"));

export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export const ALLOWED_MIME_PREFIXES = [
  "image/",
  "application/pdf",
  "text/",
  "application/msword",
  "application/vnd.openxmlformats-officedocument",
  "application/vnd.ms-excel",
  "application/vnd.ms-powerpoint",
  "application/json",
];

// Types a browser would run as a page or script if served inline.
const BLOCKED_MIME = ["text/html", "image/svg+xml", "text/javascript", "application/xhtml+xml"];

export function mimeAllowed(mime: string) {
  const m = mime.toLowerCase();
  if (BLOCKED_MIME.some((b) => m.startsWith(b))) return false;
  return ALLOWED_MIME_PREFIXES.some((p) => m.startsWith(p));
}

/** Only these are shown inline in the browser; everything else downloads. */
export function inlineSafe(mime: string) {
  const m = mime.toLowerCase();
  return /^image\/(png|jpe?g|gif|webp|avif)$/.test(m) || m === "application/pdf" || m === "text/plain";
}

export async function saveFile(data: Buffer): Promise<string> {
  await mkdir(root, { recursive: true });
  const key = randomUUID();
  await writeFile(path.join(root, key), data);
  return key;
}

function safePath(key: string) {
  if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error("Bad storage key");
  return path.join(root, key);
}

export async function readStoredFile(key: string) {
  return readFile(safePath(key));
}

export async function deleteStoredFile(key: string) {
  await unlink(safePath(key)).catch(() => undefined);
}
