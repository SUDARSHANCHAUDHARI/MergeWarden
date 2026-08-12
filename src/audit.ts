import { appendFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { AuditRecord } from "./types.js";

export async function writeAudit(path: string, record: AuditRecord): Promise<void> {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true, mode: 0o700 });
  await appendFile(absolute, `${JSON.stringify(record)}\n`, { encoding: "utf8", mode: 0o600 });
}
