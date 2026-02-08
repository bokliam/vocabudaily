export default {
    expo: {
      name: "VocabuDaily",
      slug: "vocabudaily",
      version: "1.0.0",
      scheme: "vocabudaily",
      icon: "./assets/images/icon.png",
      android: {
        package: "com.liam.vocabudaily",
        adaptiveIcon: {
          foregroundImage: "./assets/images/icon.png",
          backgroundColor: "#FFFFFF",
        },
      },
      extra: {
        eas: {
          projectId: "9fc44391-4258-4e61-9eb4-73211c3ca7a1"
        },
        WORDNIK_API_KEY: process.env.WORDNIK_API_KEY,
      },
      experiments: {
        newArchEnabled: true,
      },
      ios: {
        bundleIdentifier: "com.liam.vocabudaily",
        supportsTablet: true,
        config: {
          usesNonExemptEncryption: false
        },
        permissions: {
          notifications: {
            description: "This app will send you a daily word notification at 9 AM.",
          },
        },
      },
    },
  };
  