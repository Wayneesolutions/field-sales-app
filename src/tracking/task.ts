// Background GPS: runs while the rep is checked in, even with the app closed.
// Points are queued on the phone first, so nothing is lost without internet; the queue is sent in batches.
import * as TaskManager from "expo-task-manager";
import * as Location from "expo-location";
import * as Battery from "expo-battery";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api, ApiError, getToken } from "../api";

export const LOCATION_TASK = "field-sales-location";
const QUEUE_KEY = "fs_location_queue";
const LAST_SYNC_KEY = "fs_last_sync";
const MAX_QUEUE = 5000;   // ~2 days of points; oldest dropped beyond this
const BATCH = 200;

export type QueuedPoint = { lat: number; lng: number; at: string; accuracy?: number; speed?: number };

async function readQueue(): Promise<QueuedPoint[]> {
  try { return JSON.parse((await AsyncStorage.getItem(QUEUE_KEY)) || "[]"); } catch { return []; }
}
async function writeQueue(q: QueuedPoint[]) {
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q.slice(-MAX_QUEUE)));
}

export async function enqueue(locations: Location.LocationObject[]) {
  if (!locations.length) return;
  const q = await readQueue();
  for (const l of locations) {
    q.push({
      lat: l.coords.latitude,
      lng: l.coords.longitude,
      at: new Date(l.timestamp).toISOString(),
      accuracy: l.coords.accuracy ?? undefined,
      speed: l.coords.speed ?? undefined,
    });
  }
  await writeQueue(q);
}

export const queuedCount = async () => (await readQueue()).length;
export const lastSyncAt = async () => AsyncStorage.getItem(LAST_SYNC_KEY);
export const clearQueue = () => AsyncStorage.removeItem(QUEUE_KEY);

let flushing = false;
/** Sends queued points. Returns false when the server says the rep is off duty (tracking should stop). */
export async function flushQueue(): Promise<boolean> {
  if (flushing) return true;
  flushing = true;
  try {
    if (!(await getToken())) return true;
    let battery: number | undefined;
    try { battery = Math.round((await Battery.getBatteryLevelAsync()) * 100); } catch { /* not available */ }
    for (;;) {
      const q = await readQueue();
      if (!q.length) return true;
      const batch = q.slice(0, BATCH);
      try {
        await api("/sales/location", { method: "POST", body: { points: batch, battery } });
      } catch (e) {
        if (e instanceof ApiError && e.code === "OFF_DUTY") {
          await clearQueue();
          return false;
        }
        return true; // offline or server error: keep the queue, try next time
      }
      const rest = (await readQueue()).slice(batch.length);
      await writeQueue(rest);
      await AsyncStorage.setItem(LAST_SYNC_KEY, new Date().toISOString());
    }
  } finally {
    flushing = false;
  }
}

TaskManager.defineTask(LOCATION_TASK, async ({ data, error }) => {
  if (error) return;
  const { locations } = (data || {}) as { locations?: Location.LocationObject[] };
  if (locations?.length) await enqueue(locations);
  const onDuty = await flushQueue();
  if (!onDuty) {
    try { await Location.stopLocationUpdatesAsync(LOCATION_TASK); } catch { /* already stopped */ }
  }
});
