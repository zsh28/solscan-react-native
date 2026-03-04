import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

export async function registerForPushNotifications(): Promise<string | null> {
  if (!Device.isDevice) {
    return null;
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== "granted") {
    return null;
  }

  if (Platform.OS === "android") {
    await Notifications.setNotificationChannelAsync("default", {
      name: "Default",
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: "#9945FF",
    });
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({
      projectId: Constants.expoConfig?.extra?.eas?.projectId,
    });
    return token.data;
  } catch {
    return null;
  }
}

export async function notifyTransactionSent(amountSol: number): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Transaction Submitted",
      body: `Sending ${amountSol} SOL...`,
      data: { type: "transaction_sent" },
      sound: "default",
    },
    trigger: null,
  });
}

export async function notifyTransactionConfirmed(signature: string): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Transaction Confirmed",
      body: "Your SOL transfer was confirmed successfully.",
      data: { type: "transaction", signature },
      sound: "default",
    },
    trigger: null,
  });
}
