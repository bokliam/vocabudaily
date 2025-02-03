import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, Linking, ActivityIndicator, ScrollView, useColorScheme } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { requestNotificationPermissions, scheduleDailyNotification } from "../../notifications";
import { TouchableOpacity, Share } from "react-native";
import { Feather } from "@expo/vector-icons"; // For the share button icon
import { Ionicons } from "@expo/vector-icons";


const WORDNIK_API_KEY = Constants.expoConfig.extra.WORDNIK_API_KEY;
const WORDNIK_BASE_URL = "https://api.wordnik.com/v4/words.json/wordOfTheDay";
const APP_DOWNLOAD_LINK = "https://your-appstore-link.com"; // Replace with actual App Store/Google Play link


const HomeScreen = () => {
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Detect system theme (light/dark)
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  useEffect(() => {
    fetch(`${WORDNIK_BASE_URL}?api_key=${WORDNIK_API_KEY}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        setWordData(data);
      })
      .catch((error) => {
        console.error("Error fetching word:", error);
        setError(error.message);
      })
      .finally(() => {
        setLoading(false);
      });

    // Schedule Daily Notification at 9 AM
    (async () => {
      await requestNotificationPermissions();
      await scheduleDailyNotification();
    })();   
  }, []);

  const shareWord = async () => {
    if (!wordData) return;
  
    try {
      const message = `📖 Today's Word: *${wordData.word}*\n\n"${wordData.definitions?.[0]?.text || "Definition not available."}"\n\nLearn more & download the app: ${APP_DOWNLOAD_LINK}`;
  
      await Share.share({
        message,
      });
    } catch (error) {
      console.error("Error sharing word:", error);
    }
  }; 

  if (loading) return <ActivityIndicator size="large" color={isDarkMode ? "#fff" : "#000"} />;
  if (error) return <View style={[styles.container, isDarkMode && styles.darkContainer]}><Text style={[styles.error, isDarkMode && styles.darkText]}>Error: {error}</Text></View>;

  return (
    <ScrollView contentContainerStyle={[styles.container, isDarkMode && styles.darkContainer]}>
      {wordData ? (
        <>
          {/* Display Word */}
          <View style={styles.wordContainer}>
            <Text style={[styles.word, isDarkMode && styles.darkText]}>{wordData.word || "No word available"}</Text>
          </View>

          {/* Display First Definition + Required Source Attribution */}
          <Text style={[styles.definition, isDarkMode && styles.darkText]}>
            {wordData.definitions?.[0]?.text || "Definition not available."}
          </Text>
          {wordData.definitions?.[0]?.source && (
            <Text style={[styles.sourceAttribution, isDarkMode && styles.darkText]}>
              Source: {wordData.definitions[0].source}
            </Text>
          )}

          {/* Display Word Origin (if available) */}
          {wordData.note && <Text style={[styles.note, isDarkMode && styles.darkText]}>Origin: {wordData.note}</Text>}

          {/* Display an Example Sentence + Metadata */}
          {wordData.examples?.length > 0 && (
            <View style={[styles.exampleContainer, isDarkMode && styles.darkExampleContainer]}>
              <Text style={[styles.exampleTitle, isDarkMode && styles.darkText]}>Example:</Text>
              <Text style={[styles.exampleText, isDarkMode && styles.darkText]}>{wordData.examples[0].text}</Text>

              {/* Display Source Title */}
              {wordData.examples[0].title && (
                <Text style={[styles.exampleSource, isDarkMode && styles.darkText]}>
                  Source: {wordData.examples[0].title}
                </Text>
              )}

              {/* Display Clickable Source URL */}
              {wordData.examples[0].url && (
                <Text
                  style={[styles.exampleLink, isDarkMode && styles.darkLink]}
                  onPress={() => Linking.openURL(wordData.examples[0].url)}
                >
                  Read More
                </Text>
              )}
            </View>
          )}

          {/* Required Wordnik Attribution - Direct Link */}
          <Text
            style={[styles.link, isDarkMode && styles.darkLink]}
            onPress={() => Linking.openURL(`https://www.wordnik.com/words/${wordData.word}`)}
          >
            See more on Wordnik
          </Text>

          <View style={styles.shareContainer}>
            <Text
              style={[styles.shareTitle, isDarkMode && styles.darkText]}
              onPress={shareWord}
            >
              Love this word? <Text style={styles.shareClickableText}>Share it with friends!</Text> 📤
            </Text>
          </View>
        </>
      ) : (
        <Text style={[styles.error, isDarkMode && styles.darkText]}>No word data available.</Text>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#ffffff",
  },
  darkContainer: {
    backgroundColor: "#121212", // Dark background for dark mode
  },
  word: {
    fontSize: 32,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#000", // Default color for light mode
  },
  wordContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  shareContainer: {
    marginTop: 20,
    alignItems: "center",
    padding: 10,
    borderRadius: 5,
  },
  shareTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 5,
    textAlign: "center",
  },
  shareClickableText: {
    color: "#1E90FF", // Blue to indicate it's clickable
    fontWeight: "bold",
    textDecorationLine: "underline", // Underline for clarity
  },  

  definition: {
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
    fontStyle: "italic",
    color: "#000",
  },
  sourceAttribution: {
    fontSize: 14,
    fontStyle: "italic",
    marginBottom: 10,
    color: "#888",
  },
  note: {
    fontSize: 16,
    fontStyle: "italic",
    marginBottom: 10,
    color: "#555",
  },
  exampleContainer: {
    marginTop: 15,
    padding: 10,
    backgroundColor: "#f0f0f0",
    borderRadius: 5,
  },
  darkExampleContainer: {
    backgroundColor: "#333", // Dark mode example container
  },
  exampleTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  exampleText: {
    fontSize: 14,
  },
  exampleSource: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 5,
    color: "#555",
  },
  exampleLink: {
    color: "#1E90FF",
    fontSize: 14,
    marginTop: 5,
    textDecorationLine: "underline",
  },
  darkLink: {
    color: "#80bfff", // Lighter blue for dark mode
  },
  link: {
    color: "#1E90FF",
    fontSize: 16,
    marginTop: 10,
    textDecorationLine: "underline",
  },
  error: {
    fontSize: 16,
    color: "red",
  },
  darkText: {
    color: "#ffffff", // White text for dark mode
  },
});

export default HomeScreen;
