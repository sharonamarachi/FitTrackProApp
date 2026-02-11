import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import Header from "../../components/Header";

const YouTubeImport = ({ navigation }: any) => {
  const { colors } = useTheme();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleImport = async () => {
    // 1. Validation
    if (!url.includes("youtube.com") && !url.includes("youtu.be")) {
      Alert.alert("Invalid URL", "Please paste a valid YouTube link.");
      return;
    }

    setIsLoading(true);
    setStatusMessage("Connecting to local AI server...");

    try {
      const PC_IP = "172.17.86.63";

      const response = await fetch(`http://${PC_IP}:4000/import-workout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!response.ok) throw new Error("Backend failed to process");

      const workoutData = await response.json();

      navigation.navigate("CreateWorkoutTemplate", {
        importedData: workoutData,
      });
    } catch (error) {
      console.log("Network Error Details:", error);
      Alert.alert(
        "Connection Error",
        "Could not reach the backend. Check your IP and Wi-Fi.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Header title="YouTube Import" showBack />

      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.iconContainer}>
          <Ionicons name="logo-youtube" size={80} color="#FF0000" />
          <Text style={[styles.title, { color: colors.text }]}>
            Import Workout from Video
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Paste a link to a workout video, and our AI will extract the
            exercises for you.
          </Text>
        </View>

        <View style={styles.inputWrapper}>
          <TextInput
            style={[
              styles.input,
              {
                color: colors.text,
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            placeholder="Paste YouTube URL here..."
            placeholderTextColor={colors.textSecondary}
            value={url}
            onChangeText={setUrl}
            autoCapitalize="none"
            autoCorrect={false}
          />

          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleImport}
            disabled={isLoading || !url}
          >
            {isLoading ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.buttonText}>Generate Workout</Text>
            )}
          </TouchableOpacity>
        </View>

        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.primary }]}>
              {statusMessage}
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 20, alignItems: "center" },
  iconContainer: { alignItems: "center", marginTop: 40, marginBottom: 30 },
  title: { fontSize: 22, fontWeight: "bold", marginTop: 15 },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 20,
  },
  inputWrapper: { width: "100%", marginTop: 20 },
  input: {
    height: 55,
    borderRadius: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    fontSize: 16,
    marginBottom: 15,
  },
  button: {
    height: 55,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    elevation: 2,
  },
  buttonText: { color: "#FFF", fontSize: 18, fontWeight: "600" },
  loadingContainer: { marginTop: 25, alignItems: "center" },
  loadingText: { fontSize: 14, fontWeight: "500", textAlign: "center" },
});

export default YouTubeImport;
