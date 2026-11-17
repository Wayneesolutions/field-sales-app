import React, { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { api, outcomeLabel } from "../api";
import { useAuth } from "../auth";
import { Button, Card, Chip, s, Stat } from "../components/ui";
import { API_BASE_URL, daysAgoKey, todayKey } from "../config";
import { openBatterySettings } from "../tracking/tracking";

type Summary = { daysWorked: number; distanceKm: number; visits: number; orders: number; orderValue: number; leadsCreated: number; outcomes: Record<string, number> };

export default function ProfileScreen() {
  const { user, companyName, signOut, money } = useAuth();
  const [range, setRange] = useState<7 | 30>(7);
  const [sum, setSum] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSum(await api<Summary>(`/sales/summary?from=${daysAgoKey(range - 1)}&to=${todayKey()}`));
    } catch { /* offline */ } finally {
      setLoading(false);
    }
  }, [range]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <ScrollView contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
        <Text style={s.h1}>{user?.firstName} {user?.lastName !== "-" ? user?.lastName : ""}</Text>
        <Text style={[s.muted, { marginBottom: 14 }]}>{user?.email}{companyName ? ` · ${companyName}` : ""}</Text>

        <View style={[s.row, { marginBottom: 8 }]}>
          <Chip label="Last 7 days" active={range === 7} onPress={() => setRange(7)} />
          <Chip label="Last 30 days" active={range === 30} onPress={() => setRange(30)} />
        </View>
        <Card>
          <View style={[s.row, { marginBottom: 14 }]}>
            <Stat label="Days" value={sum?.daysWorked ?? "–"} />
            <Stat label="Km" value={sum?.distanceKm ?? "–"} />
            <Stat label="Visits" value={sum?.visits ?? "–"} />
          </View>
          <View style={s.row}>
            <Stat label="Orders" value={sum?.orders ?? "–"} />
            <Stat label="Order value" value={sum ? money(sum.orderValue) : "–"} />
            <Stat label="New leads" value={sum?.leadsCreated ?? "–"} />
          </View>
        </Card>
        {sum && Object.keys(sum.outcomes).length ? (
          <Card>
            <Text style={s.h2}>Visit outcomes</Text>
            {Object.entries(sum.outcomes).map(([k, v]) => (
              <View key={k} style={[s.row, { justifyContent: "space-between", paddingVertical: 4 }]}>
                <Text>{outcomeLabel(k)}</Text><Text style={{ fontWeight: "700" }}>{v}</Text>
              </View>
            ))}
          </Card>
        ) : null}

        <Button title="Battery settings (keep tracking on)" variant="outline" onPress={openBatterySettings} style={{ marginBottom: 12 }} />
        <Button title="Sign out" variant="danger" onPress={() => Alert.alert("Sign out?", "If you're checked in, tracking will stop.", [
          { text: "Cancel", style: "cancel" }, { text: "Sign out", style: "destructive", onPress: signOut },
        ])} />
        <Text style={[s.muted, { textAlign: "center", marginTop: 16, fontSize: 11 }]}>Server: {API_BASE_URL}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}
