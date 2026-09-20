import { del, head, put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { mkdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, join, resolve, sep } from "node:path";

export interface StoredFile {
  /** Provider key; persist it (e.g. in `items.fileRef`). */
  key: string;
  url: string;
  contentType: string;
  size: number;
}

/** Generic object-storage client so the provider can be swapped (SPEC.md §3.3). */
export interface FileStore {
  upload(
    data: Uint8Array | string,
    contentType: string,
    options?: { path?: string },
  ): Promise<StoredFile>;
  getUrl(key: string): Promise<string | null>;
  delete(key: string): Promise<void>;
}

const LOCAL_ROOT = join(process.cwd(), ".local-blob");

function byteLength(data: Uint8Array | string): number {
  return typeof data === "string" ? new TextEncoder().encode(data).length : data.byteLength;
}

/**
 * Dev fallback that stores files on disk and serves them via `/api/files/[key]`
 * (route arrives with the Phase 3 file endpoints, behind the session guard).
 */
export class LocalDiskFileStore implements FileStore {
  constructor(private readonly root: string = LOCAL_ROOT) {}

  async upload(
    data: Uint8Array | string,
    contentType: string,
    options: { path?: string } = {},
  ): Promise<StoredFile> {
    const key = `${options.path ?? "uploads"}/${randomUUID()}`;
    const target = this.resolve(key);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
    await writeFile(`${target}.meta`, JSON.stringify({ contentType }));
    return {
      key,
      url: `/api/files/${key.replaceAll(sep, "/")}`,
      contentType,
      size: byteLength(data),
    };
  }

  /** Local references are already app URLs (`/api/files/...`); return as-is. */
  async getUrl(key: string): Promise<string | null> {
    const ref = key.startsWith("/api/files/") ? key : `/api/files/${key.replaceAll(sep, "/")}`;
    return (await this.exists(this.toPath(ref))) ? ref : null;
  }

  async delete(key: string): Promise<void> {
    try {
      await unlink(this.resolve(this.toPath(key)));
      await unlink(`${this.resolve(this.toPath(key))}.meta`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        throw error;
      }
    }
  }

  /** Serve path for the local route: returns null when the file is missing. */
  async read(key: string): Promise<{ data: Uint8Array; contentType: string } | null> {
    const target = this.resolve(this.toPath(key));
    try {
      let contentType = "application/octet-stream";
      try {
        contentType = (JSON.parse(await readFile(`${target}.meta`, "utf8")) as { contentType: string }).contentType;
      } catch {
        // missing/corrupt sidecar — fall back to the generic type
      }
      return { data: new Uint8Array(await readFile(target)), contentType };
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw error;
    }
  }

  private async exists(key: string): Promise<boolean> {
    try {
      await stat(this.resolve(this.toPath(key)));
      return true;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") {
        return false;
      }
      throw error;
    }
  }

  /** Accepts raw keys and full `/api/files/...` references. */
  private toPath(key: string): string {
    return key.startsWith("/api/files/") ? key.slice("/api/files/".length) : key;
  }

  /** Normalize and confine keys under the store root (no path traversal). */
  private resolve(key: string): string {
    const base = resolve(this.root);
    const target = resolve(this.root, ...key.split(/[\\/]/));
    if (isAbsolute(key) || (target !== base && !target.startsWith(base + sep))) {
      throw new Error(`Invalid file key: ${key}`);
    }
    return target;
  }
}

/** Vercel Blob backed store (requires `BLOB_READ_WRITE_TOKEN`). */
export class VercelBlobFileStore implements FileStore {
  async upload(
    data: Uint8Array | string,
    contentType: string,
    options: { path?: string } = {},
  ): Promise<StoredFile> {
    void options.path; // keep the signature stable across providers
    const body: string | Buffer = typeof data === "string" ? data : Buffer.from(data);
    const result = await put(`uploads/${randomUUID()}`, body, {
      access: "public",
      contentType,
      addRandomSuffix: false,
      cacheControlMaxAge: 31_536_000,
    });
    return {
      key: result.pathname,
      url: result.url,
      contentType: result.contentType,
      size: byteLength(data),
    };
  }

  async getUrl(key: string): Promise<string | null> {
    if (/^https?:\/\//.test(key)) {
      return key;
    }
    try {
      return (await head(key)).url;
    } catch (error) {
      if (error instanceof Error && /not found/i.test(error.message)) {
        return null;
      }
      throw error;
    }
  }

  async delete(key: string): Promise<void> {
    await del(key);
  }
}

export function createFileStore(): FileStore {
  if (process.env.BLOB_READ_WRITE_TOKEN) {
    return new VercelBlobFileStore();
  }
  return new LocalDiskFileStore();
}

/** App-wide file store; swap the provider by changing the env vars. */
export const fileStore = createFileStore();
