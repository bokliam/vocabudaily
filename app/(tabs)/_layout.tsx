import { Tabs } from "expo-router";

export default function Layout() {
  return (
    <Tabs>
      {/* Home Screen - Word of the Day */}
      <Tabs.Screen name="index" options={{ title: "Word of the Day" }} />

      {/* Licenses Screen - Correctly updated from "explore" to "licenses" */}
      <Tabs.Screen name="licenses" options={{ title: "Licenses & Attributions" }} />
    </Tabs>
  );
}
