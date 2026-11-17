import React, { useCallback, useEffect, useRef, useState } from "react";
import { Alert, AppState, Image, Linking, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { api, appendPhoto, outcomeLabel, SalesDay, Visit } from "../api";
import { useAuth } from "../auth";
import { Banner, Button, Card, s, Stat } from "../components/ui";
import { colors, fileUrl, todayKey } from "../config";
import {
  addressFor, currentPosition, ensurePermissions, finishTracking, isTracking, openBatterySettings,
  permissionState, PermissionState, reportIssue, startTracking,
} from "../tracking/tracking";
import { flushQueue, lastSyncAt, queuedCount } from "../tracking/task";

const time = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "");
const hoursSince = (iso?: string) => {
  if (!iso) return "0h";
  const m = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

export async function takePhoto(front = false): Promise<string | null> {
  const perm = await ImagePicker.requestCameraPermissionsAsync();
  if (!perm.granted) {
    Alert.alert("Camera needed", "Allow camera access to take the photo.", [{ text: "Open settings", onPress: () => Linking.openSettings() }, { text: "Cancel" }]);
    return null;
  }
  const res = await ImagePicker.launchCameraAsync({
    mediaTypes: ["images"],
    quality: 0.4,
    cameraType: front ? ImagePicker.CameraType.front : ImagePicker.CameraType.back,
    allowsEditing: false,
  });
  return res.canceled ? null : res.assets[0]?.uri ?? null;
}

export default function HomeScreen() {
  const nav = useNavigation<any>();
  const { user, companyName, money } = useAuth();
  const [day, setDay] = useState<SalesDay | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [perm, setPerm] = useState<PermissionState>("granted");
  const [tracking, setTracking] = useState(false);
  const [pending, setPending] = useState(0);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<"in" | "out" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const reported = useRef<string | null>(null);

  const onDuty = day?.status === "on_duty";
  const current = visits.find((v) => v.status === "in_progress");

  const refreshTracking = useCallback(async (d: SalesDay | null) => {
    const p = await permissionState();
    setPerm(p);
    let t = await isTracking();
    if (d?.status === "on_duty") {
      // Phone restarted or the app was force-closed: resume tracking quietly.
      if (!t && p === "granted") {
        try { await startTracking(); t = true; } catch { /* shown as a banner */ }
      }
      if (p !== "granted" && reported.current !== p) {
        reported.current = p;
        reportIssue(p === "gps_off" ? "gps_off" : "permission_denied", p);
      }
      await flushQueue();
    } else if (t) {
      await finishTracking();
      t = false;
    }
    setTracking(t);
    setPending(await queuedCount());
    setLastSync(await lastSyncAt());
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api<{ day: SalesDay | null; visits: Visit[] }>(`/sales/day/today?dayKey=${todayKey()}`);
      setDay(res.day);
      setVisits(res.visits);
      setError(null);
      await refreshTracking(res.day);
    } catch (e: any) {
      setError(e?.message || "Could not load today");
      await refreshTracking(day);
    } finally {
      setLoading(false);
    }
  }, [refreshTracking]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  useEffect(() => {
    const sub = AppState.addEventListener("change", (st) => st === "active" && load());
    return () => sub.remove();
  }, [load]);
  useEffect(() => {
    if (!onDuty) return;
    const id = setInterval(async () => {
      await flushQueue();
      setPending(await queuedCount());
      setLastSync(await lastSyncAt());
    }, 60_000);
    return () => clearInterval(id);
  }, [onDuty]);

  const checkIn = async () => {
    const p = await ensurePermissions();
    setPerm(p);
    if (p === "gps_off") return Alert.alert("Turn on GPS", "Location (GPS) is off. Turn it on and try again.");
    if (p === "denied") return Alert.alert("Location needed", "Allow location access to check in.", [{ text: "Open settings", onPress: () => Linking.openSettings() }, { text: "Cancel" }]);
    if (p === "foreground_only") {
      return Alert.alert(
        "Allow location all the time",
        "To record your route while you're on duty, set Location to \"Allow all the time\" for this app. Tracking stops when you check out.",
        [{ text: "Open settings", onPress: () => Linking.openSettings() }, { text: "Cancel" }]
      );
    }
    const selfie = await takePhoto(true);
    if (!selfie) return;
    setBusy("in");
    try {
      const pos = await currentPosition();
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      const form = new FormData();
      appendPhoto(form, "selfie", selfie);
      form.append("lat", String(lat));
      form.append("lng", String(lng));
      if (accuracy != null) form.append("accuracy", String(accuracy));
      form.append("dayKey", todayKey());
      const address = await addressFor(lat, lng);
      if (address) form.append("address", address);
      await api("/sales/day/check-in", { method: "POST", form, timeoutMs: 60000 });
      await startTracking();
      await load();
    } catch (e: any) {
      Alert.alert("Check-in failed", e?.message || "Please try again");
    } finally {
      setBusy(null);
    }
  };

  const checkOut = () => {
    Alert.alert("Check out?", current ? `Your visit at ${current.clientName} will be closed too.` : "Tracking will stop.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Check out", style: "destructive", onPress: async () => {
          setBusy("out");
          try {
            await flushQueue();
            const form = new FormData();
            try {
              const pos = await currentPosition();
              form.append("lat", String(pos.coords.latitude));
              form.append("lng", String(pos.coords.longitude));
              const address = await addressFor(pos.coords.latitude, pos.coords.longitude);
              if (address) form.append("address", address);
            } catch { /* check out without a final position */ }
            await api("/sales/day/check-out", { method: "POST", form });
            await finishTracking();
            await load();
          } catch (e: any) {
            Alert.alert("Check-out failed", e?.message || "Please try again");
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  const permBanner = onDuty && perm !== "granted" ? (
    <Banner
      tone="error"
      text={perm === "gps_off" ? "GPS is off. Your route is not being recorded." : "Location is not set to \"Allow all the time\". Your route is not being recorded."}
      action="Fix"
      onPress={() => Linking.openSettings()}
    />
  ) : null;

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Text style={s.muted}>{companyName || " "}</Text>
        <Text style={[s.h1, { marginBottom: 14 }]}>Hi {user?.firstName || "there"}</Text>

        {error ? <Banner tone="warn" text={error} action="Retry" onPress={load} /> : null}
        {permBanner}

        <Card>
          {onDuty ? (
            <>
              <View style={[s.row, { justifyContent: "space-between", marginBottom: 12 }]}>
                <View>
                  <Text style={{ color: colors.green, fontWeight: "800", fontSize: 16 }}>● On duty</Text>
                  <Text style={s.muted}>Since {time(day?.checkIn.at)}{day?.checkIn.address ? ` · ${day.checkIn.address}` : ""}</Text>
                </View>
                {day?.checkIn.selfie ? <Image source={{ uri: fileUrl(day.checkIn.selfie) }} style={{ width: 44, height: 44, borderRadius: 22 }} /> : null}
              </View>
              <View style={[s.row, { paddingVertical: 8 }]}>
                <Stat label="Hours" value={hoursSince(day?.checkIn.at)} />
                <Stat label="Km" value={((day?.distanceMeters || 0) / 1000).toFixed(1)} />
                <Stat label="Visits" value={visits.length} />
              </View>
              <Text style={[s.muted, { textAlign: "center", marginVertical: 8 }]}>
                {tracking ? "Route recording" : "Route NOT recording"}
                {pending ? ` · ${pending} points waiting for internet` : lastSync ? ` · synced ${time(lastSync)}` : ""}
              </Text>
              <Button title="Check out" variant="danger" onPress={checkOut} loading={busy === "out"} />
            </>
          ) : (
            <>
              <Text style={s.h2}>{day?.status === "off_duty" ? `Checked out at ${time(day.checkOut?.at)}` : "You're not checked in"}</Text>
              <Text style={[s.muted, { marginBottom: 14 }]}>
                {day?.status === "off_duty"
                  ? `Today: ${((day.distanceMeters || 0) / 1000).toFixed(1)} km · ${visits.length} visits. You can check in again if you go back to work.`
                  : "Check in with a selfie to start your day. Your location is shared only while you're checked in."}
              </Text>
              <Button title={day?.status === "off_duty" ? "Check in again" : "Check in"} variant="success" onPress={checkIn} loading={busy === "in"} />
            </>
          )}
        </Card>

        {onDuty ? (
          current ? (
            <Card style={{ borderColor: colors.primary }}>
              <Text style={[s.muted, { color: colors.primary, fontWeight: "700" }]}>VISIT IN PROGRESS</Text>
              <Text style={[s.h2, { marginTop: 4 }]}>{current.clientName}</Text>
              <Text style={[s.muted, { marginBottom: 12 }]}>Started {time(current.startedAt)}{current.purpose ? ` · ${current.purpose}` : ""}</Text>
              <Button title="Finish visit" onPress={() => nav.navigate("CompleteVisit", { visit: current })} />
            </Card>
          ) : (
            <Button title="+ Start a client visit" onPress={() => nav.navigate("StartVisit")} style={{ marginBottom: 12 }} />
          )
        ) : null}

        {onDuty ? (
          <Banner tone="info" text="Tracking stops on some phones (Xiaomi, Oppo, Vivo, Realme, Samsung) unless battery saving is off for this app." action="Battery settings" onPress={openBatterySettings} />
        ) : null}

        <Text style={[s.h2, { marginTop: 8 }]}>Today's visits</Text>
        {visits.length === 0 ? <Text style={s.muted}>No visits yet.</Text> : null}
        {visits.map((v) => (
          <Card key={v._id}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontWeight: "700", fontSize: 15, color: colors.text, flex: 1 }}>{v.clientName}</Text>
              <Text style={{ color: v.status === "in_progress" ? colors.primary : colors.green, fontWeight: "600", fontSize: 12 }}>
                {v.status === "in_progress" ? "In progress" : outcomeLabel(v.outcome) || "Closed"}
              </Text>
            </View>
            <Text style={s.muted}>
              {time(v.startedAt)}{v.endedAt ? ` – ${time(v.endedAt)}` : ""}{v.orderValue ? ` · ${money(v.orderValue)}` : ""}
            </Text>
            {v.notes ? <Text style={{ marginTop: 6, color: colors.text }}>{v.notes}</Text> : null}
          </Card>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}
