import React from "react";
import { ActivityIndicator, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { AuthProvider, useAuth } from "./src/auth";
import { colors } from "./src/config";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import LeadsScreen from "./src/screens/LeadsScreen";
import ProfileScreen from "./src/screens/ProfileScreen";
import StartVisitScreen from "./src/screens/StartVisitScreen";
import CompleteVisitScreen from "./src/screens/CompleteVisitScreen";
import AddLeadScreen from "./src/screens/AddLeadScreen";

const Stack = createNativeStackNavigator();
const Tabs = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tabs.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarIcon: ({ color, size }) => {
          const icon = { Today: "today-outline", Leads: "people-outline", Me: "person-circle-outline" }[route.name] as any;
          return <Ionicons name={icon} size={size} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="Today" component={HomeScreen} />
      <Tabs.Screen name="Leads" component={LeadsScreen} />
      <Tabs.Screen name="Me" component={ProfileScreen} />
    </Tabs.Navigator>
  );
}

function Root() {
  const { ready, user } = useAuth();
  if (!ready) {
    return <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}><ActivityIndicator color={colors.primary} size="large" /></View>;
  }
  return (
    <Stack.Navigator screenOptions={{ headerTintColor: colors.primary }}>
      {user ? (
        <>
          <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
          <Stack.Screen name="StartVisit" component={StartVisitScreen} options={{ title: "Start visit" }} />
          <Stack.Screen name="CompleteVisit" component={CompleteVisitScreen} options={{ title: "Finish visit" }} />
          <Stack.Screen name="AddLead" component={AddLeadScreen} options={{ title: "New lead" }} />
        </>
      ) : (
        <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
      )}
    </Stack.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <StatusBar style="dark" />
          <Root />
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
