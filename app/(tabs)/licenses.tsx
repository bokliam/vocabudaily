import React from "react";
import { View, Text, StyleSheet, Linking, Image, TouchableOpacity, useColorScheme } from "react-native";

const WORDNIK_LOGO_URL = "https://www.wordnik.com/img/wordnik_badge_a1.png";

const LicensesScreen = () => {
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === "dark";

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.title, isDarkMode && styles.darkText]}>Licenses & Attributions</Text>

      <Text style={[styles.sectionTitle, isDarkMode && styles.darkText]}>Wordnik API</Text>
      <Text style={[styles.text, isDarkMode && styles.darkText]}>
        This app uses the Wordnik API to fetch word definitions.
      </Text>
      
      {/* Clickable Wordnik Logo */}
      <TouchableOpacity onPress={() => Linking.openURL("https://www.wordnik.com")}>
        <Image 
          source={{ uri: WORDNIK_LOGO_URL }}
          style={styles.logo} 
          resizeMode="contain"
        />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  darkContainer: {
    backgroundColor: "#121212",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 10,
  },
  text: {
    fontSize: 16,
    textAlign: "center",
    marginVertical: 10,
  },
  logo: {
    width: 120,
    height: 40,
    marginVertical: 10,
  },
  darkText: {
    color: "#ffffff",
  },
});

export default LicensesScreen;
