import * as SecureStore from "expo-secure-store";
import { API_BASE_URL } from "./config";

const TOKEN_KEY = "fs_token";
let cachedToken: string | null | undefined;
let onUnauthorized: (() => void) | null = null;

export const setUnauthorizedHandler = (fn: (() => void) | null) => { onUnauthorized = fn; };

export async function getToken() {
  if (cachedToken === undefined) cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
  return cachedToken;
}
export async function setToken(token: string | null) {
  cachedToken = token;
  if (token) await SecureStore.setItemAsync(TOKEN_KEY, token);
  else await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export class ApiError extends Error {
  constructor(message: string, public status: number, public body: any) { super(message); }
  get code(): string | undefined { return this.body?.code; }
}

type Options = { method?: string; body?: any; form?: FormData; auth?: boolean; timeoutMs?: number };

export async function api<T = any>(path: string, { method = "GET", body, form, auth = true, timeoutMs = 30000 }: Options = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: "application/json" };
  if (auth) {
    const token = await getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }
  if (body !== undefined && !form) headers["Content-Type"] = "application/json";

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res: Response;
  try {
    res = await fetch(API_BASE_URL + path, {
      method,
      headers,
      body: form ?? (body !== undefined ? JSON.stringify(body) : undefined),
      signal: ctrl.signal,
    });
  } catch (err: any) {
    const isTimeout = err?.name === "AbortError";
    const msg = isTimeout
      ? `Request timed out after ${timeoutMs / 1000}s (${API_BASE_URL})`
      : `Cannot reach server (${API_BASE_URL}) — check your internet connection.`;
    throw new ApiError(msg, 0, null);
  } finally {
    clearTimeout(timer);
  }

  let data: any = null;
  try { data = await res.json(); } catch { /* empty or non-JSON body */ }
  if (res.status === 401 && auth) {
    await setToken(null);
    onUnauthorized?.();
  }
  if (!res.ok) throw new ApiError(data?.message || `Request failed (${res.status})`, res.status, data);
  return data as T;
}

/** Adds a photo taken with the camera to a multipart form. */
export function appendPhoto(form: FormData, field: string, uri: string) {
  const name = uri.split("/").pop() || "photo.jpg";
  // React Native's FormData accepts { uri, name, type } objects for files.
  form.append(field, { uri, name, type: "image/jpeg" } as any);
}

// ---- Types shared by the screens ----
export type Place = { at?: string; lat?: number; lng?: number; address?: string | null; selfie?: string | null };
export type SalesDay = {
  _id: string; dayKey: string; status: "on_duty" | "off_duty";
  checkIn: Place; checkOut: Place | null; distanceMeters: number; visitsCount: number;
  lastPoint?: { lat: number; lng: number; at: string };
};
export type Outcome = "interested" | "follow_up" | "demo_given" | "order_placed" | "not_interested" | "not_available";
export type Visit = {
  _id: string; clientName: string; clientPhone?: string | null; purpose?: string | null;
  status: "in_progress" | "completed"; startedAt: string; endedAt?: string | null;
  outcome?: Outcome | null; notes?: string | null; orderValue?: number | null; photos: string[]; lead?: string | null;
  startLocation?: { address?: string };
};
export type LeadStatus = "new" | "contacted" | "qualified" | "unqualified";
export type Lead = {
  _id: string; firstName: string; lastName: string; companyName?: string | null; mobile: string; email?: string;
  status: LeadStatus; notes?: string | null; address?: { street?: string; city?: string };
  updatedAt: string;
};
export type User = { _id: string; firstName: string; lastName: string; email: string; mobile: string; employeeId?: string };

export const leadName = (l: Lead) => l.companyName || [l.firstName, l.lastName].filter((x) => x && x !== "-").join(" ");

export const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: "order_placed", label: "Order placed" },
  { key: "interested", label: "Interested" },
  { key: "follow_up", label: "Follow up" },
  { key: "demo_given", label: "Demo given" },
  { key: "not_interested", label: "Not interested" },
  { key: "not_available", label: "Not available" },
];
export const outcomeLabel = (o?: string | null) => OUTCOMES.find((x) => x.key === o)?.label ?? "";
export const LEAD_STATUSES: { key: LeadStatus; label: string }[] = [
  { key: "new", label: "New" },
  { key: "contacted", label: "Contacted" },
  { key: "qualified", label: "Qualified" },
  { key: "unqualified", label: "Unqualified" },
];
