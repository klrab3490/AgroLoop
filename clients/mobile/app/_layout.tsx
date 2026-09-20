import React from "react";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/context/auth-context.js";

const RootStack = Stack as any;

export default function RootLayout() {
  return (
    <AuthProvider>
      <StatusBar style="dark" />
      <RootStack
        screenOptions={{
          headerStyle: {
            backgroundColor: "#16a34a",
          },
          headerTintColor: "#ffffff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "AgroLoop",
          }}
        />
        <Stack.Screen
          name="auth/login"
          options={{
            title: "Sign In",
          }}
        />
        <Stack.Screen
          name="auth/register"
          options={{
            title: "Register",
          }}
        />
        <Stack.Screen
          name="household/index"
          options={{
            title: "Household Waste & Pickups",
          }}
        />
        <Stack.Screen
          name="household/submit"
          options={{
            title: "Log Waste Submission",
          }}
        />
        <Stack.Screen
          name="household/pickup"
          options={{
            title: "Pickup Tracker",
          }}
        />
        <Stack.Screen
          name="household/history"
          options={{
            title: "History & Ledger",
          }}
        />
        <Stack.Screen
          name="farmer/index"
          options={{
            title: "Farmer Marketplace",
          }}
        />
        <Stack.Screen
          name="farmer/collections"
          options={{
            title: "Collection Board",
          }}
        />
        <Stack.Screen
          name="farmer/verify"
          options={{
            title: "On-Site Verification",
          }}
        />
      </RootStack>
    </AuthProvider>
  );
}
