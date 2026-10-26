import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return <><Stack screenOptions={{ headerStyle: { backgroundColor: "#101b2a" }, headerTintColor: "#ffffff", contentStyle: { backgroundColor: "#f5f7fa" } }} /><StatusBar style="auto" /></>;
}
