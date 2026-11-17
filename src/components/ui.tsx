import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View, ViewStyle } from "react-native";
import { colors } from "../config";

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function Button({ title, onPress, variant = "primary", loading, disabled, style }: {
  title: string; onPress: () => void; variant?: "primary" | "danger" | "outline" | "success";
  loading?: boolean; disabled?: boolean; style?: ViewStyle;
}) {
  const bg = { primary: colors.primary, danger: colors.red, success: colors.green, outline: "transparent" }[variant];
  const fg = variant === "outline" ? colors.primary : "#fff";
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [s.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "outline" && { borderWidth: 1.5, borderColor: colors.primary }, style]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[s.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.label}>{label}</Text>
      <TextInput placeholderTextColor={colors.muted} {...props} style={[s.input, props.multiline && { height: 90, textAlignVertical: "top" }, props.style]} />
    </View>
  );
}

export function Chip({ label, active, onPress, color = colors.primary }: { label: string; active?: boolean; onPress: () => void; color?: string }) {
  return (
    <Pressable onPress={onPress} style={[s.chip, active && { backgroundColor: color, borderColor: color }]}>
      <Text style={[s.chipText, active && { color: "#fff" }]}>{label}</Text>
    </Pressable>
  );
}

export function Banner({ tone, text, action, onPress }: { tone: "warn" | "error" | "ok" | "info"; text: string; action?: string; onPress?: () => void }) {
  const map = {
    warn: [colors.amberLight, colors.amber], error: [colors.redLight, colors.red],
    ok: [colors.greenLight, colors.green], info: [colors.primaryLight, colors.primary],
  } as const;
  const [bg, fg] = map[tone];
  return (
    <Pressable onPress={onPress} disabled={!onPress} style={[s.banner, { backgroundColor: bg }]}>
      <Text style={{ color: fg, flex: 1, fontSize: 13 }}>{text}</Text>
      {action ? <Text style={{ color: fg, fontWeight: "700", marginLeft: 8 }}>{action}</Text> : null}
    </Pressable>
  );
}

export function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <View style={{ flex: 1, alignItems: "center" }}>
      <Text style={{ fontSize: 20, fontWeight: "700", color: colors.text }}>{value}</Text>
      <Text style={{ fontSize: 12, color: colors.muted, marginTop: 2 }}>{label}</Text>
    </View>
  );
}

export const s = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  card: { backgroundColor: colors.card, borderRadius: 14, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  btn: { height: 50, borderRadius: 12, alignItems: "center", justifyContent: "center", paddingHorizontal: 16 },
  btnText: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 13, color: colors.muted, marginBottom: 6, fontWeight: "600" },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, height: 46, fontSize: 15, color: colors.text, backgroundColor: "#fff" },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: "#fff", marginRight: 8, marginBottom: 8 },
  chipText: { fontSize: 13, color: colors.text, fontWeight: "600" },
  banner: { flexDirection: "row", alignItems: "center", padding: 12, borderRadius: 10, marginBottom: 12 },
  h1: { fontSize: 22, fontWeight: "800", color: colors.text },
  h2: { fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 },
  muted: { fontSize: 13, color: colors.muted },
  row: { flexDirection: "row", alignItems: "center" },
});
