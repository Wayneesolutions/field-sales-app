import React, { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "../auth";
import { Banner, Button, Field, s } from "../components/ui";
import { colors } from "../config";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!email.trim() || !password) return setError("Enter your email and password");
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
    } catch (e: any) {
      setError(e?.message || "Could not sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[s.screen, { backgroundColor: colors.primary }]}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: "center", padding: 24 }} keyboardShouldPersistTaps="handled">
          <View style={{ marginBottom: 28 }}>
            <Text style={{ color: "#fff", fontSize: 30, fontWeight: "800" }}>Field Sales</Text>
            <Text style={{ color: "#C7D5F5", fontSize: 15, marginTop: 6 }}>Attendance, visits and leads on the go</Text>
          </View>
          <View style={[s.card, { padding: 20 }]}>
            {error ? <Banner tone="error" text={error} /> : null}
            <Field label="Email" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" autoComplete="email" placeholder="you@company.com" />
            <Field label="Password" value={password} onChangeText={setPassword} secureTextEntry autoComplete="password" placeholder="••••••••" onSubmitEditing={submit} />
            <Button title="Sign in" onPress={submit} loading={loading} style={{ marginTop: 8 }} />
            <Text style={[s.muted, { marginTop: 14, textAlign: "center" }]}>Your manager creates your login in the CRM.</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
