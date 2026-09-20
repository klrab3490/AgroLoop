import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

const RootStack = Stack as any;

export default function RootLayout() {
  return (
    <>
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
          name="household/index"
          options={{
            title: "Household Waste & Pickups",
          }}
        />
        <Stack.Screen
          name="farmer/index"
          options={{
            title: "Farmer Marketplace",
          }}
        />
      </RootStack>
    </>
  );
}
