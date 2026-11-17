import React, { useState } from "react";
import { Alert, Image, KeyboardAvoidingView, Platform, ScrollView, Switch, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { api, appendPhoto, LEAD_STATUSES, LeadStatus, Outcome, OUTCOMES, Visit } from "../api";
import { Button, Card, Chip, Field, s } from "../components/ui";
import { colors, todayKey } from "../config";
import { takePhoto } from "./HomeScreen";

const FOLLOW_UPS = [{ label: "Tomorrow", days: 1 }, { label: "In 3 days", days: 3 }, { label: "Next week", days: 7 }, { label: "In 2 weeks", days: 14 }];

export default function CompleteVisitScreen() {
  const nav = useNavigation<any>();
  const visit: Visit = useRoute<any>().params.visit;
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");
  const [orderValue, setOrderValue] = useState("");
  const [followDays, setFollowDays] = useState<number | null>(null);
  const [leadStatus, setLeadStatus] = useState<LeadStatus | null>(null);
  const [saveAsLead, setSaveAsLead] = useState(true);
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    if (!outcome) return Alert.alert("Outcome", "How did the visit go? Pick an outcome.");
    setSaving(true);
    try {
      const form = new FormData();
      form.append("outcome", outcome);
      if (notes.trim()) form.append("notes", notes.trim());
      if (outcome === "order_placed" && orderValue.trim()) form.append("orderValue", orderValue.replace(/[^\d.]/g, ""));
      if (followDays) form.append("followUpDate", todayKey(new Date(Date.now() + followDays * 864e5)));
      if (visit.lead && leadStatus) form.append("leadStatus", leadStatus);
      if (!visit.lead) form.append("saveAsLead", String(saveAsLead));
      photos.forEach((p) => appendPhoto(form, "photos", p));
      await api(`/sales/visits/${visit._id}/complete`, { method: "PATCH", form, timeoutMs: 60000 });
      nav.goBack();
    } catch (e: any) {
      Alert.alert("Could not save", e?.message || "Please try again");
    } finally {
      setSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={s.screen}>
      <ScrollView contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
        <Text style={s.h1}>{visit.clientName}</Text>
        <Text style={[s.muted, { marginBottom: 14 }]}>{visit.startLocation?.address || ""}</Text>

        <Text style={s.h2}>Outcome *</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
          {OUTCOMES.map((o) => (
            <Chip key={o.key} label={o.label} active={outcome === o.key} onPress={() => setOutcome(o.key)}
              color={o.key === "order_placed" ? colors.green : o.key === "not_interested" ? colors.red : colors.primary} />
          ))}
        </View>

        <Card>
          {outcome === "order_placed" ? (
            <Field label="Order value" value={orderValue} onChangeText={setOrderValue} keyboardType="decimal-pad" placeholder="e.g. 12500" />
          ) : null}
          <Field label="Notes" value={notes} onChangeText={setNotes} multiline placeholder="What was discussed, requirements, objections…" />

          {outcome && outcome !== "not_interested" && outcome !== "order_placed" ? (
            <>
              <Text style={s.label}>Follow up</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {FOLLOW_UPS.map((f) => <Chip key={f.days} label={f.label} active={followDays === f.days} onPress={() => setFollowDays(followDays === f.days ? null : f.days)} />)}
              </View>
            </>
          ) : null}

          {visit.lead ? (
            <>
              <Text style={[s.label, { marginTop: 8 }]}>Update lead status</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                {LEAD_STATUSES.map((l) => <Chip key={l.key} label={l.label} active={leadStatus === l.key} onPress={() => setLeadStatus(leadStatus === l.key ? null : l.key)} />)}
              </View>
            </>
          ) : outcome !== "not_interested" ? (
            <View style={[s.row, { justifyContent: "space-between", marginTop: 4 }]}>
              <Text style={{ flex: 1, color: colors.text }}>Save this client as a lead in the CRM</Text>
              <Switch value={saveAsLead} onValueChange={setSaveAsLead} />
            </View>
          ) : null}
        </Card>

        <Text style={s.h2}>Photos</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", marginBottom: 8 }}>
          {photos.map((p) => <Image key={p} source={{ uri: p }} style={{ width: 90, height: 90, borderRadius: 10, marginRight: 8, marginBottom: 8 }} />)}
        </View>
        {photos.length < 4 ? (
          <Button title="Add photo" variant="outline" onPress={async () => { const p = await takePhoto(false); if (p) setPhotos([...photos, p]); }} style={{ marginBottom: 16 }} />
        ) : null}

        <Button title="Finish visit" onPress={submit} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
