import React, { useCallback, useState } from "react";
import { Alert, RefreshControl, ScrollView, Text, View } from "react-native";
import { useFocusEffect, useNavigation, useRoute } from "@react-navigation/native";
import { api, Deal, DEAL_STATUSES, DealStatus, Quote, QUOTE_LABELS, quoteDealId } from "../api";
import { Banner, Button, Card, Chip, Field, s } from "../components/ui";
import { colors } from "../config";
import { useAuth } from "../auth";

/** One deal: move it along, make a quote, send the quote to the customer. */
export default function DealScreen() {
  const nav = useNavigation<any>();
  const { id } = useRoute<any>().params as { id: string };
  const { money } = useAuth();
  const [deal, setDeal] = useState<Deal | null>(null);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);
  const [closing, setClosing] = useState<"won" | "lost" | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [d, qs] = await Promise.all([
        api<{ opportunity: Deal }>(`/sales/opportunities/${id}`),
        api<{ quotations: Quote[] }>(`/sales/quotations?limit=200`),
      ]);
      setDeal(d.opportunity);
      setQuotes(qs.quotations.filter((q) => quoteDealId(q) === id));
    } catch (e: any) {
      Alert.alert("Could not load the deal", e?.message);
    } finally {
      setLoading(false);
    }
  }, [id]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const setStatus = async (status: DealStatus, why?: string) => {
    setBusy(status);
    try {
      const body: any = { status };
      if (status === "won") body.winReason = why;
      if (status === "lost") body.lostReason = why;
      await api(`/sales/opportunities/${id}/status`, { method: "PATCH", body });
      setClosing(null);
      setReason("");
      load();
    } catch (e: any) {
      Alert.alert("Could not update", e?.message);
    } finally {
      setBusy(null);
    }
  };

  const pick = (k: DealStatus) => {
    if (k === "won" || k === "lost") { setClosing(k); setReason(""); return; }
    setStatus(k);
  };

  const send = (q: Quote) => {
    Alert.alert("Send quote?", `Quote ${q.quatationNumber} (${money(q.totalAmountWithTax)}) will be emailed to the customer with a link to approve it.`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Send",
        onPress: async () => {
          setBusy(q._id);
          try {
            const r = await api<{ emailSent?: boolean; emailError?: string }>(`/sales/quotations/${q._id}/send`, { method: "POST" });
            if (r?.emailSent === false) Alert.alert("Quote marked as sent", "The email could not be sent. Your manager can resend it from the CRM.");
            load();
          } catch (e: any) {
            Alert.alert("Could not send", e?.message);
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  };

  if (!deal) {
    return <ScrollView style={s.screen} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />} />;
  }
  const closed = deal.status === "won" || deal.status === "lost";

  return (
    <ScrollView style={s.screen} contentContainerStyle={{ padding: 16 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}>
      <Text style={s.h1}>{deal.opportunityName}</Text>
      {deal.description ? <Text style={[s.muted, { marginTop: 4 }]}>{deal.description}</Text> : null}
      {deal.status === "won" && deal.winReason ? <Banner tone="ok" text={`Won: ${deal.winReason}`} /> : null}
      {deal.status === "lost" && deal.lostReason ? <Banner tone="error" text={`Lost: ${deal.lostReason}`} /> : null}

      <Text style={[s.label, { marginTop: 16 }]}>Stage</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
        {DEAL_STATUSES.map((x) => (
          <Chip key={x.key} label={x.label} active={(closing ?? deal.status) === x.key}
            color={x.key === "won" ? colors.green : x.key === "lost" ? colors.red : colors.primary}
            onPress={() => pick(x.key)} />
        ))}
      </View>
      {closing ? (
        <Card>
          <Field
            label={closing === "won" ? "Why did we win?" : "Why did we lose?"}
            value={reason}
            onChangeText={setReason}
            placeholder={closing === "won" ? "e.g. best price, quick install" : "e.g. went with a competitor"}
            multiline
          />
          <View style={[s.row, { gap: 10 }]}>
            <Button title="Cancel" variant="outline" style={{ flex: 1 }} onPress={() => setClosing(null)} />
            <Button title={closing === "won" ? "Mark won" : "Mark lost"} variant={closing === "won" ? "success" : "danger"} style={{ flex: 1 }}
              disabled={!reason.trim()} loading={busy === closing} onPress={() => setStatus(closing, reason.trim())} />
          </View>
        </Card>
      ) : null}

      <View style={[s.row, { justifyContent: "space-between", marginTop: 16, marginBottom: 8 }]}>
        <Text style={s.h2}>Quotes</Text>
      </View>
      {quotes.map((q) => (
        <Card key={q._id}>
          <View style={[s.row, { justifyContent: "space-between" }]}>
            <Text style={{ fontWeight: "700" }}>{q.quatationNumber}</Text>
            <Text style={{ fontWeight: "700", color: q.status === "approved" ? colors.green : q.status === "rejected" ? colors.red : colors.primary }}>{QUOTE_LABELS[q.status]}</Text>
          </View>
          <Text style={{ fontSize: 20, fontWeight: "800", marginVertical: 4 }}>{money(q.totalAmountWithTax)}</Text>
          <Text style={s.muted}>{new Date(q.quatationDate).toLocaleDateString()} · incl. {q.taxPercentage}% tax{q.discountAmount ? ` · ${money(q.discountAmount)} off` : ""}</Text>
          {q.status === "draft" || q.status === "sent" ? (
            <Button title={q.status === "draft" ? "Send to customer" : "Send again"} variant={q.status === "draft" ? "primary" : "outline"}
              style={{ marginTop: 10 }} loading={busy === q._id} onPress={() => send(q)} />
          ) : null}
          {q.status === "sent" ? <Text style={[s.muted, { marginTop: 6 }]}>Waiting for the customer to approve it from the email link.</Text> : null}
        </Card>
      ))}
      {!quotes.length ? <Text style={[s.muted, { marginBottom: 12 }]}>No quote yet.</Text> : null}
      {!closed ? <Button title="+ New quote" onPress={() => nav.navigate("NewQuote", { dealId: id, dealName: deal.opportunityName })} /> : null}
    </ScrollView>
  );
}
