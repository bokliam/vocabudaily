export default {
    expo: {
      name: "VocabuDaily",
      slug: "vocabudaily",
      version: "1.0.3",
      scheme: "vocabudaily",
      icon: "./assets/images/icon.png",
      userInterfaceStyle: "automatic",
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
        SUPABASE_URL: process.env.SUPABASE_URL,
        SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      },
      plugins: [
        "expo-router",
        "expo-font",
        "expo-web-browser",
        [
          "expo-notifications",
          {
            "sounds": []
          }
        ],
        [
          "expo-splash-screen",
          {
            "image": "./assets/images/icon.png",
            "imageWidth": 200,
            "resizeMode": "contain",
            "backgroundColor": "#ffffff"
          }
        ]
      ],
      experiments: {
        newArchEnabled: false,
      },
      ios: {
        bundleIdentifier: "com.liam.vocabudaily",
        buildNumber: "7",
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
  