import Constants from "expo-constants";

export const API_BASE_URL: string =
  (Constants.expoConfig?.extra?.apiBaseUrl as string | undefined) ?? "http://10.0.2.2:3000/api/v1";

/** Photos stored on the server's own disk come back as "/api/v1/uploads/..."; S3 photos come back as full URLs. */
export const fileUrl = (ref?: string | null) => {
  if (!ref) return undefined;
  if (/^https?:\/\//.test(ref)) return ref;
  return API_BASE_URL.replace(/\/api\/v1\/?$/, "") + ref;
};

export const colors = {
  primary: "#0F3D91",
  primaryLight: "#E8EEFB",
  green: "#15803D",
  greenLight: "#DCFCE7",
  red: "#B91C1C",
  redLight: "#FEE2E2",
  amber: "#B45309",
  amberLight: "#FEF3C7",
  text: "#111827",
  muted: "#6B7280",
  border: "#E5E7EB",
  bg: "#F5F7FB",
  card: "#FFFFFF",
};

/** The phone's local calendar day, YYYY-MM-DD. The server groups a rep's work by this. */
export const todayKey = (d = new Date()) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

export const daysAgoKey = (n: number) => todayKey(new Date(Date.now() - n * 864e5));
