import React, { useCallback, useEffect, useState } from "react";
import { Alert, FlatList, Linking, Modal, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api, Lead, leadName, LEAD_STATUSES, LeadStatus } from "../api";
import { Button, Chip, Field, s } from "../components/ui";
import { colors } from "../config";

const statusColor: Record<LeadStatus, string> = { new: colors.primary, contacted: colors.amber, qualified: colors.green, unqualified: colors.muted };

export default function LeadsScreen() {
  const nav = useNavigation<any>();
  const [scope, setScope] = useState<"mine" | "all">("mine");
  const [status, setStatus] = useState<LeadStatus | "">("");
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(false);
  const [picked, setPicked] = useState<Lead | null>(null);
  const [dealEmail, setDealEmail] = useState("");
  const [converting, setConverting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = `scope=${scope}&limit=50${status ? `&status=${status}` : ""}${search ? `&search=${encodeURIComponent(search)}` : ""}`;
      setLeads((await api<{ leads: Lead[] }>(`/sales/leads?${q}`)).leads);
    } catch (e: any) {
      Alert.alert("Could not load leads", e?.message);
    } finally {
      setLoading(false);
    }
  }, [scope, status, search]);

  useEffect(() => { const t = setTimeout(load, 300); return () => clearTimeout(t); }, [load]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setLeadStatus = async (lead: Lead, next: LeadStatus) => {
    try {
      await api(`/sales/leads/${lead._id}/status`, { method: "PATCH", body: { status: next } });
      setPicked(null);
      load();
    } catch (e: any) {
      Alert.alert("Could not update", e?.message);
    }
  };

  // Customer is interested: turn the lead into a deal (and a customer). Needs an email for quotes.
  const makeDeal = async (lead: Lead) => {
    setConverting(true);
    try {
      const r = await api<{ opportunity: { _id: string } }>(`/sales/leads/${lead._id}/convert`, {
        method: "POST",
        body: dealEmail.trim() ? { email: dealEmail.trim() } : {},
      });
      setPicked(null);
      setDealEmail("");
      load();
      nav.navigate("Deal", { id: r.opportunity._id });
    } catch (e: any) {
      Alert.alert("Could not make it a deal", e?.message);
    } finally {
      setConverting(false);
    }
  };

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <View style={[s.row, { justifyContent: "space-between", marginBottom: 12 }]}>
          <Text style={s.h1}>Leads</Text>
          <Pressable onPress={() => nav.navigate("AddLead")}><Text style={{ color: colors.primary, fontWeight: "800", fontSize: 16 }}>+ Add</Text></Pressable>
        </View>
        <Field label="Search" value={search} onChangeText={setSearch} placeholder="Name, shop, phone or city" />
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Chip label="My leads" active={scope === "mine"} onPress={() => setScope("mine")} />
          <Chip label="+ Unassigned" active={scope === "all"} onPress={() => setScope("all")} />
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Chip label="Any status" active={status === ""} onPress={() => setStatus("")} />
          {LEAD_STATUSES.map((x) => <Chip key={x.key} label={x.label} active={status === x.key} onPress={() => setStatus(x.key)} />)}
        </View>
      </View>
      <FlatList
        data={leads}
        keyExtractor={(l) => l._id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? <Text style={s.muted}>No leads here yet.</Text> : null}
        renderItem={({ item }) => (
          <Pressable onPress={() => setPicked(item)} style={s.card}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <Text style={{ fontWeight: "700", fontSize: 15, flex: 1 }}>{leadName(item)}</Text>
              <Text style={{ color: item.convertedToOppurtunity ? colors.green : statusColor[item.status], fontWeight: "700", fontSize: 12, textTransform: "capitalize" }}>{item.convertedToOppurtunity ? "Deal" : item.status}</Text>
            </View>
            <Text style={s.muted}>{item.mobile}{item.address?.city ? ` · ${item.address.city}` : ""}</Text>
          </Pressable>
        )}
      />

      <Modal visible={!!picked} transparent animationType="slide" onRequestClose={() => { setPicked(null); setDealEmail(""); }}>
        <Pressable style={{ flex: 1, backgroundColor: "#0006" }} onPress={() => { setPicked(null); setDealEmail(""); }} />
        {picked ? (
          <View style={{ backgroundColor: "#fff", padding: 20, borderTopLeftRadius: 18, borderTopRightRadius: 18 }}>
            <Text style={s.h1}>{leadName(picked)}</Text>
            <Text style={[s.muted, { marginBottom: 12 }]}>{picked.mobile}{picked.address?.street ? ` · ${picked.address.street}` : ""}</Text>
            {picked.notes ? <Text style={{ marginBottom: 12 }}>{picked.notes}</Text> : null}
            <Text style={s.label}>Status</Text>
            <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
              {LEAD_STATUSES.map((x) => <Chip key={x.key} label={x.label} active={picked.status === x.key} onPress={() => setLeadStatus(picked, x.key)} />)}
            </View>
            <View style={[s.row, { gap: 10 }]}>
              <Button title="Call" variant="outline" style={{ flex: 1 }} onPress={() => Linking.openURL(`tel:${picked.mobile}`)} />
              <Button title="Visit now" style={{ flex: 1 }} onPress={() => { const l = picked; setPicked(null); nav.navigate("StartVisit", { lead: l }); }} />
            </View>
            {picked.convertedToOppurtunity ? (
              <Button title="Open deal" variant="success" style={{ marginTop: 10 }}
                onPress={() => { const id = picked.convertedToOppurtunity!; setPicked(null); nav.navigate("Deal", { id }); }} />
            ) : (
              <View style={{ marginTop: 12 }}>
                {!picked.email ? (
                  <Field label="Customer email (for the quote)" value={dealEmail} onChangeText={setDealEmail}
                    keyboardType="email-address" autoCapitalize="none" placeholder="name@example.com" />
                ) : null}
                <Button title="Make it a deal" variant="success" loading={converting}
                  disabled={!picked.email && !dealEmail.trim()} onPress={() => makeDeal(picked)} />
              </View>
            )}
          </View>
        ) : null}
      </Modal>
    </SafeAreaView>
  );
}
