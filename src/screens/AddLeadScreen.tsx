import React, { useEffect, useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Location from "expo-location";
import { api } from "../api";
import { Button, Card, Field, s } from "../components/ui";

export default function AddLeadScreen() {
  const nav = useNavigation<any>();
  const [f, setF] = useState({ companyName: "", firstName: "", lastName: "", mobile: "", email: "", street: "", city: "", state: "", country: "", zip: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const set = (k: keyof typeof f) => (v: string) => setF((x) => ({ ...x, [k]: v }));

  // Pre-fill the address from where the rep is standing; they can edit it.
  useEffect(() => {
    (async () => {
      try {
        const perm = await Location.getForegroundPermissionsAsync();
        if (perm.status !== "granted") return;
        const pos = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 }) ?? await Location.getCurrentPositionAsync({});
        const [a] = await Location.reverseGeocodeAsync({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        if (!a) return;
        setF((x) => ({
          ...x,
          street: x.street || [a.name, a.street, a.district].filter(Boolean).join(", "),
          city: x.city || a.city || "", state: x.state || a.region || "", country: x.country || a.country || "", zip: x.zip || a.postalCode || "",
        }));
      } catch { /* leave blank */ }
    })();
  }, []);

  const submit = async () => {
    if (!f.companyName.trim() && !f.firstName.trim()) return Alert.alert("Name needed", "Enter the business name or the contact's name");
    if (!f.mobile.trim()) return Alert.alert("Mobile needed", "Enter a mobile number");
    setSaving(true);
    try {
      await api("/sales/leads", { method: "POST", body: f });
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
        <Card>
          <Field label="Business / shop name" value={f.companyName} onChangeText={set("companyName")} />
          <Field label="Contact first name" value={f.firstName} onChangeText={set("firstName")} />
          <Field label="Contact last name" value={f.lastName} onChangeText={set("lastName")} />
          <Field label="Mobile *" value={f.mobile} onChangeText={set("mobile")} keyboardType="phone-pad" />
          <Field label="Email" value={f.email} onChangeText={set("email")} keyboardType="email-address" autoCapitalize="none" />
        </Card>
        <Card>
          <Field label="Address" value={f.street} onChangeText={set("street")} />
          <Field label="City" value={f.city} onChangeText={set("city")} />
          <Field label="State / province" value={f.state} onChangeText={set("state")} />
          <Field label="Country" value={f.country} onChangeText={set("country")} />
          <Field label="PIN / postal code" value={f.zip} onChangeText={set("zip")} />
        </Card>
        <Card>
          <Field label="Notes" value={f.notes} onChangeText={set("notes")} multiline />
        </Card>
        <Button title="Save lead" onPress={submit} loading={saving} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
