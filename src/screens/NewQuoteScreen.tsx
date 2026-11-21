import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Text, View } from "react-native";
import { useNavigation, useRoute } from "@react-navigation/native";
import { api, Quote, Service } from "../api";
import { Button, Card, Field, s } from "../components/ui";
import { colors } from "../config";
import { useAuth } from "../auth";

type Totals = { subTotal: number; totalTaxAmount: number; totalAmountWithTax: number };

/** Build a quote from the company's services, see the total, save it and send it. */
export default function NewQuoteScreen() {
  const nav = useNavigation<any>();
  const { dealId, dealName } = useRoute<any>().params as { dealId: string; dealName?: string };
  const { money } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [qty, setQty] = useState<Record<string, number>>({});
  const [tax, setTax] = useState("");
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");
  const [totals, setTotals] = useState<Totals | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api<{ services: Service[] }>("/sales/services").then((r) => setServices(r.services)).catch((e) => Alert.alert("Could not load services", e?.message));
  }, []);

  const items = useMemo(() => Object.entries(qty).filter(([, n]) => n > 0).map(([service, quantity]) => ({ service, quantity })), [qty]);
  const taxNum = tax.trim() === "" ? NaN : Number(tax);
  const discountNum = Number(discount) > 0 ? Number(discount) : 0;
  const ready = items.length > 0 && Number.isFinite(taxNum) && taxNum >= 0 && taxNum <= 100;

  // Live total from the server, so the phone shows exactly what the customer will get.
  useEffect(() => {
    if (!ready) { setTotals(null); return; }
    const t = setTimeout(() => {
      api<{ data: Totals }>("/sales/quotations/calculate", { method: "POST", body: { items, taxPercentage: taxNum, discountAmount: discountNum } })
        .then((r) => setTotals(r.data)).catch(() => setTotals(null));
    }, 350);
    return () => clearTimeout(t);
  }, [items, taxNum, discountNum, ready]);

  const change = (id: string, d: number) => setQty((q) => ({ ...q, [id]: Math.max(0, (q[id] || 0) + d) }));

  const sendNow = useCallback(async (q: Quote) => {
    try {
      const r = await api<{ emailSent?: boolean }>(`/sales/quotations/${q._id}/send`, { method: "POST" });
      if (r?.emailSent === false) Alert.alert("Quote marked as sent", "The email could not be sent. Your manager can resend it from the CRM.");
    } catch (e: any) {
      Alert.alert("Could not send", e?.message);
    }
    nav.goBack();
  }, [nav]);

  const save = async () => {
    setSaving(true);
    try {
      const r = await api<{ quotation: Quote }>("/sales/quotations", {
        method: "POST",
        body: { opportunityId: dealId, items, taxPercentage: taxNum, discountAmount: discountNum, notes: notes.trim() || undefined },
      });
      Alert.alert("Quote saved", `${r.quotation.quatationNumber} · ${money(r.quotation.totalAmountWithTax)}. Email it to the customer now?`, [
        { text: "Later", style: "cancel", onPress: () => nav.goBack() },
        { text: "Send now", onPress: () => sendNow(r.quotation) },
      ]);
    } catch (e: any) {
      Alert.alert("Could not save the quote", e?.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
      {dealName ? <Text style={[s.muted, { marginBottom: 8 }]}>For: {dealName}</Text> : null}
      <Text style={s.h2}>Services</Text>
      {services.map((sv) => {
        const n = qty[sv._id] || 0;
        return (
          <Card key={sv._id} style={{ paddingVertical: 12 }}>
            <View style={[s.row, { justifyContent: "space-between" }]}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={{ fontWeight: "700" }}>{sv.serviceName}</Text>
                <Text style={s.muted}>{money(sv.servicePrice)}{sv.serviceCategory ? ` · ${sv.serviceCategory}` : ""}</Text>
              </View>
              <View style={s.row}>
                <Pressable onPress={() => change(sv._id, -1)} hitSlop={8} style={stepper}><Text style={stepperText}>−</Text></Pressable>
                <Text style={{ width: 32, textAlign: "center", fontWeight: "700", fontSize: 16 }}>{n}</Text>
                <Pressable onPress={() => change(sv._id, 1)} hitSlop={8} style={[stepper, { backgroundColor: colors.primary, borderColor: colors.primary }]}><Text style={[stepperText, { color: "#fff" }]}>+</Text></Pressable>
              </View>
            </View>
          </Card>
        );
      })}
      {!services.length ? <Text style={[s.muted, { marginBottom: 12 }]}>No services yet. Ask your manager to add them in the CRM (Services).</Text> : null}

      <View style={[s.row, { gap: 10 }]}>
        <View style={{ flex: 1 }}><Field label="Tax %" value={tax} onChangeText={setTax} keyboardType="decimal-pad" placeholder="e.g. 18" /></View>
        <View style={{ flex: 1 }}><Field label="Discount" value={discount} onChangeText={setDiscount} keyboardType="decimal-pad" placeholder="0" /></View>
      </View>
      <Field label="Note for the customer (optional)" value={notes} onChangeText={setNotes} multiline />

      <Card>
        <Row label="Subtotal" value={totals ? money(totals.subTotal) : "–"} />
        <Row label={`Tax${Number.isFinite(taxNum) ? ` (${taxNum}%)` : ""}`} value={totals ? money(totals.totalTaxAmount) : "–"} />
        {discountNum ? <Row label="Discount" value={`− ${money(discountNum)}`} /> : null}
        <View style={{ height: 1, backgroundColor: colors.border, marginVertical: 8 }} />
        <Row label="Total" value={totals ? money(totals.totalAmountWithTax) : "–"} bold />
      </Card>

      <Button title="Save quote" onPress={save} disabled={!ready} loading={saving} />
      {!ready ? <Text style={[s.muted, { marginTop: 8, textAlign: "center" }]}>Add at least one service and the tax % (0 if none).</Text> : null}
    </ScrollView>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={[s.row, { justifyContent: "space-between", marginVertical: 2 }]}>
      <Text style={{ color: bold ? colors.text : colors.muted, fontWeight: bold ? "800" : "500", fontSize: bold ? 17 : 14 }}>{label}</Text>
      <Text style={{ fontWeight: bold ? "800" : "600", fontSize: bold ? 17 : 14 }}>{value}</Text>
    </View>
  );
}

const stepper = { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, alignItems: "center" as const, justifyContent: "center" as const, backgroundColor: "#fff" };
const stepperText = { fontSize: 18, fontWeight: "700" as const, color: colors.primary };
