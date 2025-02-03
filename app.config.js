export default {
    expo: {
      name: "vocabudaily",
      slug: "vocabudaily",
      version: "1.0.0",
      scheme: "vocabudaily",
      newArchEnabled: true,
      extra: {
        WORDNIK_API_KEY: process.env.WORDNIK_API_KEY,
      },
    },
  };
