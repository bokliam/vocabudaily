export default {
    expo: {
      name: "vocabudaily",
      slug: "vocabudaily",
      version: "1.0.0",
      scheme: "vocabudaily",
      icon: "./assets/images/icon.png",
      android: {
        adaptiveIcon: {
          foregroundImage: "./assets/images/icon.png",
          backgroundColor: "#FFFFFF",
        },
      },
      extra: {
        WORDNIK_API_KEY: process.env.WORDNIK_API_KEY,
      },
      experiments: {
        newArchEnabled: true,
      },
      ios: {
        bundleIdentifier: "com.anonymous.vocabudaily",
        supportsTablet: true,
        permissions: {
          notifications: {
            description: "This app will send you a daily word notification at 9 AM.",
          },
        },
      },
    },
  };
  