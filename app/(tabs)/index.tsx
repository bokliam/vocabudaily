import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, Linking, ActivityIndicator, ScrollView, useColorScheme, Animated, TouchableOpacity, Share, FlatList, Dimensions } from "react-native";
import Constants from "expo-constants";
import * as Notifications from "expo-notifications";
import { requestNotificationPermissions, scheduleDailyNotification } from "../../notifications";
import {} from "react-native";
import { createContext, useContext } from "react";


const WORDNIK_API_KEY = Constants.expoConfig.extra.WORDNIK_API_KEY;
const WORDNIK_BASE_URL = "https://api.wordnik.com/v4/words.json/wordOfTheDay";
const APP_DOWNLOAD_LINK = "https://apps.apple.com/app/id6758642231";
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.90; // 85% of screen width
const WordContext = createContext();

export const WordProvider = ({ children }) => {
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchWord = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${WORDNIK_BASE_URL}?api_key=${WORDNIK_API_KEY}`);
      if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
      const data = await response.json();
      setWordData(data);
    } catch (error) {
      console.error("Error fetching word:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!wordData) {
      fetchWord();
    }
  }, []);

  return (
    <WordContext.Provider value={{ wordData, loading, error, fetchWord }}>
      {children}
    </WordContext.Provider>
  );
};


const HomeScreen = () => {
  const [activeIndex, setActiveIndex] = useState(0); // Track active example index
  const { wordData, loading, error, fetchWord } = useContext(WordContext);
  
  // Detect system theme (light/dark)
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  useEffect(() => {
    const controller = new AbortController();

    fetchWord();

    // Schedule Daily Notification at 9 AM
    (async () => {
      await requestNotificationPermissions();
      await scheduleDailyNotification();
    })(); 

    return () => controller.abort(); 
  }, []);

  const shareWord = async () => {
    if (!wordData) return;
  
    try {
      const message = `📖 Today's Word: "${wordData.word}"\n\nExpand your vocabulary with VocabuDaily! Get the app here: ${APP_DOWNLOAD_LINK}`;
  
      await Share.share({
        message,
      });
    } catch (error) {
      console.error("We’re having trouble sharing today’s word. Please try again later.", error);
    }
  }; 

  if (loading) return <ActivityIndicator size="large" color={isDarkMode ? "#fff" : "#000"} />;
  if (error) return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.error, isDarkMode && styles.darkText]}>
        Error: {error}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={fetchWord}>
        <Text style={styles.retryButtonText}>Retry</Text>
      </TouchableOpacity>
    </View>
  );

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
          <Text style={[styles.definitionTitle, isDarkMode && styles.darkText]}>Definition: </Text>
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
    fontSize: 40, // Bigger for emphasis
    fontWeight: "bold",
    marginBottom: 8,
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
  definitionTitle: {
    fontSize: 18,
    textAlign: "center",
    fontStyle: "italic",
    fontWeight: "bold",
    color: "#555", // Softer color for readability
  },
  definition: {
    fontSize: 18,
    textAlign: "center",
    fontStyle: "italic",
    color: "#555", // Softer color for readability
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
    width: CARD_WIDTH, // Ensures proper centering
    minHeight: 160,
    padding: 15,
    backgroundColor: "#f0f0f0",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    justifyContent: "center",
    marginHorizontal: 10, // Adds spacing between cards
  },
  darkExampleContainer: {
    backgroundColor: "#333",
  },
  exampleTitle: {
    fontWeight: "bold",
    fontSize: 16,
    marginBottom: 5,
  },
  exampleText: {
    fontSize: 16,
    textAlign: "center",
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
  retryButton: {
    marginTop: 15,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: "#1E90FF",
    borderRadius: 5,
  },
  retryButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default function HomeScreenWithProvider() {
  return (
    <WordProvider>
      <HomeScreen />
    </WordProvider>
  );
}
