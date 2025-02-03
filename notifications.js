import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

// 🛠 Configure Notification Behavior (for foreground notifications)
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// ✅ Request Notification Permissions
export async function requestNotificationPermissions() {
  const { status } = await Notifications.requestPermissionsAsync();
  if (status !== "granted") {
    console.warn("Notification permissions not granted.");
  }
}

// ✅ Cancel Any Existing Notifications
export async function cancelScheduledNotifications() {
  await Notifications.cancelAllScheduledNotificationsAsync();
}

// ✅ Schedule a Daily Notification at 9 AM Local Time
export async function scheduleDailyNotification() {
  await cancelScheduledNotifications(); // Ensure no duplicate notifications

  const localTime = new Date();
  localTime.setHours(9, 0, 0, 0); // Set time to 9 AM

  // Adjust for past time today (schedule for next day if needed)
  if (localTime <= new Date()) {
    localTime.setDate(localTime.getDate() + 1);
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Word of the Day 📖",
      body: "Tap to learn your new word!",
      sound: true,
    },
    trigger: {
      hour: 9,
      minute: 0,
      repeats: true, // Repeat daily at 9 AM
    },
  });
}
