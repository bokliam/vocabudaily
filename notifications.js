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

// ✅ Schedule one-off 9 AM notifications for the next N days starting tomorrow.
// Using DATE triggers (not DAILY) lets the app skip a day by simply re-anchoring
// the batch whenever the user opens the app.
const NOTIFICATION_HORIZON_DAYS = 14;

export async function rescheduleUpcomingNotifications() {
  await cancelScheduledNotifications();

  const now = new Date();
  for (let offset = 1; offset <= NOTIFICATION_HORIZON_DAYS; offset++) {
    const fireDate = new Date(now);
    fireDate.setDate(fireDate.getDate() + offset);
    fireDate.setHours(9, 0, 0, 0);

    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Word of the Day 📖",
        body: "Tap to learn your new word!",
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fireDate,
      },
    });
  }
}
