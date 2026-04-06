// src/screens/QuickStart/QuickStart.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  StatusBar,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { QuickStartScreenProps } from "../../navigation/types";
import { useTheme } from "../../context/ThemeContext";

export default function QuickStart({ navigation }: QuickStartScreenProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedOption, setSelectedOption] = useState("");
  const { theme, colors } = useTheme();

  const quickActions = [
    {
      key: "quickLog",
      icon: "add-circle-outline",
      title: "Quick Log",
      description: "Log a simple workout in seconds",
      color: "#007AFF",
      onPress: () => navigation.navigate("CreateWorkoutTemplate"),
    },
    {
      key: "youtube",
      icon: "logo-youtube",
      title: "YouTube Import",
      description: "Convert video to workout plan",
      color: "#FF3B30",
    },
    {
      key: "transcript",
      icon: "document-text-outline",
      title: "Transcript Import",
      description: "Paste, upload or dictate workout text",
      color: "#5856D6",
      onPress: () => navigation.navigate("TranscriptImport"),
    },
    {
      key: "quickTimer",
      icon: "stopwatch-outline",
      title: "Quick Timer",
      description: "Choose presets or customize intervals",
      color: "#FF9500",
    },
    {
      key: "video",
      icon: "videocam-outline",
      title: "Video Import",
      description: "Import workouts from video sources",
      color: "#AF52DE",
      onPress: () => navigation.navigate("VideoImport"),
    }
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Quick Start</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Choose your workout style
        </Text>
      </View>

      <View style={styles.optionsGrid}>
        {quickActions.map((action) => (
          <TouchableOpacity
            key={action.key}
            style={[styles.optionCard, { backgroundColor: colors.card }]}
            onPress={() => {
              if (action.key === "youtube") {
                navigation.navigate("YouTubeImport");
              } else if (action.key === "quickTimer") {
                navigation.navigate("QuickTimer");
              } else if (action.key === "transcript") {
                navigation.navigate("TranscriptImport");
              } else if (action.key === "quickLog") {
                navigation.navigate("CreateWorkoutTemplate");
              } else if (action.key === "video") {
                navigation.navigate("VideoImport");
              }
            }}
          >
            <View
              style={[
                styles.iconContainer,
                { backgroundColor: `${action.color}20` },
              ]}
            >
              <Ionicons
                name={action.icon as keyof typeof Ionicons.glyphMap}
                size={32}
                color={action.color}
              />
            </View>
            <Text style={[styles.optionTitle, { color: colors.text }]}>
              {action.title}
            </Text>
            <Text
              style={[
                styles.optionDescription,
                { color: colors.textSecondary },
              ]}
            >
              {action.description}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Quick Stats Footer */}
      <View style={[styles.footer, { backgroundColor: colors.card }]}>
        <Text style={[styles.footerTitle, { color: colors.text }]}>
          Ready to train? 💪
        </Text>
        <Text style={[styles.footerText, { color: colors.textSecondary }]}>
          Select an option above to get started
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    paddingTop: 60,
  },
  header: {
    marginBottom: 30,
    alignItems: "center",
  },
  title: {
    fontSize: 32,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
    textAlign: "center",
  },
  optionsGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  optionCard: {
    width: "48%",
    padding: 20,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  iconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 5,
  },
  optionDescription: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 16,
  },
  footer: {
    padding: 20,
    alignItems: "center",
    borderRadius: 15,
    marginTop: 20,
  },
  footerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  footerText: {
    fontSize: 14,
    textAlign: "center",
  },
});
