import React, { useCallback, useState } from "react";
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { api, customerOf, Deal, DEAL_STATUSES, dealStatusLabel, DealStatus, Quote, quoteDealId } from "../api";
import { Chip, s } from "../components/ui";
import { colors } from "../config";
import { useAuth } from "../auth";

export const dealColor: Record<DealStatus, string> = {
  open: colors.primary, "in-progress": colors.amber, "proposal-sent": colors.primary, won: colors.green, lost: colors.muted,
};

/** The rep's own deals. A deal starts from a lead ("Make it a deal" on the Leads tab). */
export default function DealsScreen() {
  const nav = useNavigation<any>();
  const { money } = useAuth();
  const [status, setStatus] = useState<DealStatus | "">("");
  const [deals, setDeals] = useState<Deal[]>([]);
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const q = `limit=100${status ? `&status=${status}` : ""}`;
      const [d, qs] = await Promise.all([
        api<{ opportunities: Deal[] }>(`/sales/opportunities?${q}`),
        api<{ quotations: Quote[] }>(`/sales/quotations?limit=200`),
      ]);
      setDeals(d.opportunities);
      setQuotes(qs.quotations);
    } catch (e: any) {
      Alert.alert("Could not load deals", e?.message);
    } finally {
      setLoading(false);
    }
  }, [status]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const latestQuote = (d: Deal) => quotes.find((q) => quoteDealId(q) === d._id);

  return (
    <SafeAreaView style={s.screen} edges={["top"]}>
      <View style={{ padding: 16, paddingBottom: 0 }}>
        <Text style={[s.h1, { marginBottom: 12 }]}>Deals</Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          <Chip label="All" active={status === ""} onPress={() => setStatus("")} />
          {DEAL_STATUSES.map((x) => <Chip key={x.key} label={x.label} active={status === x.key} onPress={() => setStatus(x.key)} />)}
        </View>
      </View>
      <FlatList
        data={deals}
        keyExtractor={(d) => d._id}
        contentContainerStyle={{ padding: 16, paddingTop: 4 }}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
        ListEmptyComponent={!loading ? (
          <Text style={s.muted}>No deals yet. Open a lead on the Leads tab and tap "Make it a deal" when the customer is interested.</Text>
        ) : null}
        renderItem={({ item }) => {
          const q = latestQuote(item);
          return (
            <Pressable onPress={() => nav.navigate("Deal", { id: item._id })} style={s.card}>
              <View style={[s.row, { justifyContent: "space-between" }]}>
                <Text style={{ fontWeight: "700", fontSize: 15, flex: 1 }}>{item.opportunityName}</Text>
                <Text style={{ color: dealColor[item.status], fontWeight: "700", fontSize: 12 }}>{dealStatusLabel(item.status)}</Text>
              </View>
              <Text style={s.muted}>{customerOf(item) || " "}</Text>
              {q ? <Text style={[s.muted, { marginTop: 4 }]}>Quote {q.quatationNumber} · {money(q.totalAmountWithTax)} · {q.status}</Text> : null}
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}
