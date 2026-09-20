export type ItemType = "link" | "note" | "file";
export type EmbedStatus = "unknown" | "yes" | "no";

export interface ItemView {
  _id: string;
  type: ItemType;
  title: string;
  url: string | null;
  description: string | null;
  thumbnail: string | null;
  favicon: string | null;
  domain: string | null;
  tags: string[];
  collectionId: string | null;
  note: string | null;
  canEmbed: EmbedStatus;
  fileRef: string | null;
  fileType: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CollectionView {
  _id: string;
  name: string;
  parentId: string | null;
  icon: string | null;
  order: number;
  createdAt: string;
}

export interface ItemsResponse {
  items: ItemView[];
  hasMore: boolean;
  total: number;
}

export type ItemInput =
  | {
      type: "link";
      url: string;
      title?: string;
      description?: string;
      collectionId?: string | null;
      tags?: string[];
      note?: string;
    }
  | {
      type: "note";
      body: string;
      title?: string;
      collectionId?: string | null;
      tags?: string[];
      note?: string;
    };

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  if (response.status === 401 && typeof window !== "undefined") {
    // Not a component context — full reload clears stale client state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/gate");
    throw new ApiError(401, "UNAUTHORIZED", "Session expired");
  }
  const body = (await response.json().catch(() => null)) as
    | { error?: { code?: string; message?: string } }
    | null;
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body?.error?.code ?? "UNKNOWN",
      body?.error?.message ?? "Request failed",
    );
  }
  return body as T;
}

export const api = {
  get<T>(path: string): Promise<T> {
    return request<T>(path);
  },
  post<T>(path: string, data: unknown): Promise<T> {
    return request<T>(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  postForm<T>(path: string, form: FormData): Promise<T> {
    return request<T>(path, { method: "POST", body: form });
  },
  patch<T>(path: string, data: unknown): Promise<T> {
    return request<T>(path, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  },
  del<T>(path: string): Promise<T> {
    return request<T>(path, { method: "DELETE" });
  },
};
