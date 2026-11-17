import * as Location from "expo-location";
import * as IntentLauncher from "expo-intent-launcher";
import { Linking, Platform } from "react-native";
import { LOCATION_TASK, flushQueue, clearQueue } from "./task";
import { api } from "../api";

export type PermissionState = "granted" | "foreground_only" | "denied" | "gps_off";

/** Asks for "while using" and then "all the time" location. Android 11+ sends the rep to Settings for the second one. */
export async function ensurePermissions(): Promise<PermissionState> {
  if (!(await Location.hasServicesEnabledAsync())) return "gps_off";
  const fg = await Location.requestForegroundPermissionsAsync();
  if (fg.status !== "granted") return "denied";
  const bg = await Location.requestBackgroundPermissionsAsync();
  return bg.status === "granted" ? "granted" : "foreground_only";
}

export async function permissionState(): Promise<PermissionState> {
  if (!(await Location.hasServicesEnabledAsync())) return "gps_off";
  const fg = await Location.getForegroundPermissionsAsync();
  if (fg.status !== "granted") return "denied";
  const bg = await Location.getBackgroundPermissionsAsync();
  return bg.status === "granted" ? "granted" : "foreground_only";
}

export async function currentPosition() {
  const last = await Location.getLastKnownPositionAsync({ maxAge: 60_000, requiredAccuracy: 100 });
  if (last) return last;
  return Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
}

/** Best-effort street address for a point (shown to the manager next to check-ins and visits). */
export async function addressFor(lat: number, lng: number): Promise<string | undefined> {
  try {
    const [a] = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
    if (!a) return undefined;
    return [a.name, a.street, a.district, a.city, a.region].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i).join(", ");
  } catch {
    return undefined;
  }
}

export const isTracking = async () => {
  try { return await Location.hasStartedLocationUpdatesAsync(LOCATION_TASK); } catch { return false; }
};

export async function startTracking() {
  if (await isTracking()) return;
  await Location.startLocationUpdatesAsync(LOCATION_TASK, {
    accuracy: Location.Accuracy.High,
    timeInterval: 30_000,        // at most every 30 s
    distanceInterval: 25,        // or every 25 m moved
    deferredUpdatesInterval: 60_000,
    pausesUpdatesAutomatically: false,
    showsBackgroundLocationIndicator: true,
    activityType: Location.ActivityType.AutomotiveNavigation,
    foregroundService: {
      notificationTitle: "On duty",
      notificationBody: "Your location is shared with your manager until you check out.",
      notificationColor: "#0F3D91",
      killServiceOnDestroy: false,
    },
  });
}

export async function stopTracking() {
  if (await isTracking()) {
    try { await Location.stopLocationUpdatesAsync(LOCATION_TASK); } catch { /* already stopped */ }
  }
}

/** Called at check-out: send what's left, then stop. */
export async function finishTracking() {
  await flushQueue();
  await stopTracking();
  await clearQueue();
}

export async function reportIssue(type: "permission_denied" | "gps_off" | "app_killed" | "other", note?: string) {
  try { await api("/sales/tracking-issue", { method: "POST", body: { type, note } }); } catch { /* best effort */ }
}

/** Phones from Xiaomi, Oppo, Vivo, Realme, Samsung etc. kill background apps to save battery. This opens the setting to exempt the app. */
export async function openBatterySettings() {
  if (Platform.OS !== "android") return Linking.openSettings();
  try {
    await IntentLauncher.startActivityAsync(IntentLauncher.ActivityAction.IGNORE_BATTERY_OPTIMIZATION_SETTINGS);
  } catch {
    await Linking.openSettings();
  }
}
