import type { ApiResponse } from "@/types";

// Client-side fetch helpers that unwrap the { data, error } envelope.

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.error || json.data === null) {
    throw new Error(json.error ?? `Error ${res.status}`);
  }
  return json.data;
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as ApiResponse<T>;
  if (!res.ok || json.error || json.data === null) {
    throw new Error(json.error ?? `Error ${res.status}`);
  }
  return json.data;
}
