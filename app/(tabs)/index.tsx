import React, { useRef, useState, useEffect } from "react";
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, useColorScheme, Animated, TouchableOpacity, Share, FlatList, Dimensions, AppState } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Notifications from "expo-notifications";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { requestNotificationPermissions, rescheduleUpcomingNotifications } from "../../notifications";
import { getDailyWord } from "../../services/wordService";
import {} from "react-native";
import { createContext, useContext } from "react";

const LAST_OPENED_KEY = "@vocabudaily/lastOpenedDate";

async function maybeRescheduleNotifications() {
  const today = new Date().toDateString();
  const lastOpened = await AsyncStorage.getItem(LAST_OPENED_KEY);
  if (lastOpened === today) return;

  await requestNotificationPermissions();
  await rescheduleUpcomingNotifications();
  await AsyncStorage.setItem(LAST_OPENED_KEY, today);
}


const APP_DOWNLOAD_LINK = "https://apps.apple.com/app/id6758642231";
const SCREEN_WIDTH = Dimensions.get("window").width;
const CARD_WIDTH = SCREEN_WIDTH * 0.90; // 85% of screen width
const WordContext = createContext();

export const WordProvider = ({ children }) => {
  const [wordData, setWordData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const lastFetchDate = useRef<string | null>(null);
  const appState = useRef(AppState.currentState);

  const fetchWord = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getDailyWord();
      setWordData(data);
      lastFetchDate.current = new Date().toDateString();
    } catch (error) {
      console.error("Error fetching word:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const today = new Date().toDateString();
    if (!wordData || lastFetchDate.current !== today) {
      fetchWord();
    }
  }, []);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextAppState) => {
      const wasBackground = appState.current.match(/inactive|background/);
      if (wasBackground && nextAppState === "active") {
        const today = new Date().toDateString();
        if (lastFetchDate.current !== today) {
          fetchWord();
        }
        maybeRescheduleNotifications();
      }
      appState.current = nextAppState;
    });
    return () => subscription.remove();
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

    maybeRescheduleNotifications();

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

  if (loading) return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDarkMode && styles.darkContainer]}>
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <ActivityIndicator size="large" color={isDarkMode ? "#fff" : "#000"} />
      </View>
    </SafeAreaView>
  );
  if (error) return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDarkMode && styles.darkContainer]}>
      <View style={[styles.container, isDarkMode && styles.darkContainer]}>
        <Text style={[styles.error, isDarkMode && styles.darkText]}>
          Error: {error}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={fetchWord}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );

  return (
    <SafeAreaView edges={["top"]} style={[styles.safeArea, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.screenTitle, isDarkMode && styles.darkText, isDarkMode && styles.darkScreenTitle]}>Word of the Day</Text>
      <ScrollView contentContainerStyle={[styles.container, isDarkMode && styles.darkContainer]}>
      {wordData ? (
        <>
          {/* Display Word */}
          <View style={styles.wordContainer}>
            <Text style={[styles.word, isDarkMode && styles.darkText]}>{wordData.word || "No word available"}</Text>
          </View>

          {/* Display Pronunciation (if available) */}
          {wordData.phonetic && (
            <Text style={[styles.pronunciation, isDarkMode && styles.darkSecondaryText]}>
              [{wordData.phonetic}]
            </Text>
          )}

          {/* Display Part of Speech (if available) */}
          {wordData.part_of_speech && (
            <Text style={[styles.partOfSpeech, isDarkMode && styles.darkSecondaryText]}>
              {wordData.part_of_speech}
            </Text>
          )}

          {/* Display Definition */}
          <Text style={[styles.definition, isDarkMode && styles.darkText]}>
          <Text style={[styles.definitionTitle, isDarkMode && styles.darkText]}>Definition: </Text>
            {wordData.definition || "Definition not available."}
          </Text>

          {/* Display Word Origin */}
          {wordData.origin && <Text style={[styles.note, isDarkMode && styles.darkText]}>Origin: {wordData.origin}</Text>}

          {/* Display an Example Sentence */}
          {wordData.examples?.length > 0 && (
            <View style={[styles.exampleContainer, isDarkMode && styles.darkExampleContainer]}>
              <Text style={[styles.exampleTitle, isDarkMode && styles.darkText]}>Example:</Text>
              <Text style={[styles.exampleText, isDarkMode && styles.darkText]}>{wordData.examples[0]}</Text>
            </View>
          )}

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
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#ccc",
  },
  darkScreenTitle: {
    borderBottomColor: "#333",
  },
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
  pronunciation: {
    fontSize: 18,
    color: "#666",
    marginBottom: 4,
    textAlign: "center",
  },
  partOfSpeech: {
    fontSize: 16,
    fontStyle: "italic",
    color: "#666",
    marginBottom: 10,
    textAlign: "center",
  },
  darkSecondaryText: {
    color: "#bbbbbb",
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
  note: {
    marginTop: 14,
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
