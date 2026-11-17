import React, { useEffect, useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { api, appendPhoto, Lead, leadName } from "../api";
import { Button, Card, Chip, Field, s } from "../components/ui";
import { colors } from "../config";
import { addressFor, currentPosition, ensurePermissions } from "../tracking/tracking";
import { takePhoto } from "./HomeScreen";

const PURPOSES = ["New client", "Follow up", "Demo", "Order collection", "Payment collection", "Complaint"];

export default function StartVisitScreen() {
  const nav = useNavigation<any>();
  const route = useRoute<any>();
  const [mode, setMode] = useState<"new" | "lead">(route.params?.lead ? "lead" : "new");
  const [lead, setLead] = useState<Lead | null>(route.params?.lead ?? null);
  const [search, setSearch] = useState("");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [purpose, setPurpose] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (mode !== "lead") return;
    const t = setTimeout(() => {
      api<{ leads: Lead[] }>(`/sales/leads?scope=all&limit=20&search=${encodeURIComponent(search)}`)
        .then((r) => setLeads(r.leads)).catch(() => setLeads([]));
    }, 300);
    return () => clearTimeout(t);
  }, [mode, search]);

  const submit = async () => {
    if (mode === "new" && !clientName.trim()) return Alert.alert("Client name", "Enter the shop or client name");
    if (mode === "lead" && !lead) return Alert.alert("Choose a lead", "Pick a lead from the list");
    const p = await ensurePermissions();
    if (p === "gps_off" || p === "denied") return Alert.alert("Location needed", "Turn on GPS and allow location to start a visit.");
    setSaving(true);
    try {
      const pos = await currentPosition();
      const { latitude: lat, longitude: lng, accuracy } = pos.coords;
      const form = new FormData();
      form.append("lat", String(lat));
      form.append("lng", String(lng));
      if (accuracy != null) form.append("accuracy", String(accuracy));
      const address = await addressFor(lat, lng);
      if (address) form.append("address", address);
      if (mode === "lead" && lead) form.append("leadId", lead._id);
      else {
        form.append("clientName", clientName.trim());
        if (clientPhone.trim()) form.append("clientPhone", clientPhone.trim());
      }
      if (purpose) form.append("purpose", purpose);
      if (photo) appendPhoto(form, "photos", photo);
      await api("/sales/visits", { method: "POST", form, timeoutMs: 60000 });
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Could not start visit", e?.message || "Please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <View style={[s.row, { marginBottom: 12 }]}>
          <Chip label="New client" active={mode === "new"} onPress={() => setMode("new")} />
          <Chip label="Existing lead" active={mode === "lead"} onPress={() => setMode("lead")} />
        </View>

        {mode === "new" ? (
          <Card>
            <Field label="Shop / client name *" value={clientName} onChangeText={setClientName} placeholder="e.g. Sharma Hardware" />
            <Field label="Phone" value={clientPhone} onChangeText={setClientPhone} keyboardType="phone-pad" placeholder="Optional" />
          </Card>
        ) : (
          <Card>
            {lead ? (
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontWeight: "700", fontSize: 15 }}>{leadName(lead)}</Text>
                  <Text style={s.muted}>{lead.mobile}{lead.address?.city ? ` · ${lead.address.city}` : ""}</Text>
                </View>
                <Pressable onPress={() => setLead(null)}><Text style={{ color: colors.primary, fontWeight: "700" }}>Change</Text></Pressable>
              </View>
            ) : (
              <>
                <Field label="Search leads" value={search} onChangeText={setSearch} placeholder="Name, shop, phone or city" />
                {leads.map((l) => (
                  <Pressable key={l._id} onPress={() => setLead(l)} style={{ paddingVertical: 10, borderTopWidth: 1, borderColor: colors.border }}>
                    <Text style={{ fontWeight: "600" }}>{leadName(l)}</Text>
                    <Text style={s.muted}>{l.mobile} · {l.status}</Text>
                  </Pressable>
                ))}
                {leads.length === 0 ? <Text style={s.muted}>No leads found.</Text> : null}
              </>
            )}
          </Card>
        )}

        <Text style={s.h2}>Purpose</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
          {PURPOSES.map((p) => <Chip key={p} label={p} active={purpose === p} onPress={() => setPurpose(purpose === p ? null : p)} />)}
        </View>

        <Text style={s.h2}>Photo (shop front / meeting)</Text>
        {photo ? <Image source={{ uri: photo }} style={{ width: "100%", height: 180, borderRadius: 12, marginBottom: 8 }} /> : null}
        <Button title={photo ? "Retake photo" : "Take photo"} variant="outline" onPress={async () => setPhoto((await takePhoto(false)) ?? photo)} style={{ marginBottom: 16 }} />

        <Button title="Start visit here" onPress={submit} loading={saving} />
        <Text style={[s.muted, { textAlign: "center", marginTop: 8 }]}>Your current location is saved with the visit.</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
