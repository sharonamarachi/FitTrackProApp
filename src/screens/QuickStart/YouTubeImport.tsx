import React, { useState } from "react";
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
import { supabase } from "../../api/supabaseClient";
import {
  extractVideoId,
  isValidYouTubeUrl,
  getYouTubeTranscript,
  extractWorkoutFromTranscript,
} from "../../services/freeYouTubeService";

const YouTubeImport = ({ navigation }: any) => {
  const { colors, theme } = useTheme();
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [progress, setProgress] = useState(0);

  const handleImport = async () => {
    // Validation
    if (!url.trim()) {
      Alert.alert("Error", "Please paste a YouTube URL");
      return;
    }

    if (!isValidYouTubeUrl(url)) {
      Alert.alert("Invalid URL", "Please paste a valid YouTube link (youtube.com or youtu.be)");
      return;
    }

    const videoId = extractVideoId(url);
    if (!videoId) {
      Alert.alert("Invalid URL", "Could not extract video ID from URL");
      return;
    }

    setIsLoading(true);
    setProgress(10);

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("You must be logged in to import workouts");
      }

      // Check if already imported
      setStatusMessage("Checking for existing import...");
      const { data: existingImport } = await supabase
        .from('youtube_imports')
        .select('*')
        .eq('user_id', user.id)
        .eq('video_id', videoId)
        .eq('status', 'completed')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (existingImport) {
        Alert.alert(
          "Already Imported",
          "You've already imported this video. Would you like to import it again?",
          [
            { text: "Cancel", style: "cancel", onPress: () => setIsLoading(false) },
            {
              text: "Import Again",
              onPress: () => continueImport(user.id, videoId)
            }
          ]
        );
        return;
      }

      await continueImport(user.id, videoId);

    } catch (error: any) {
      console.error("Import error:", error);
      Alert.alert(
        "Import Failed",
        error.message || "Could not import workout. Please try another video with captions enabled."
      );
      setIsLoading(false);
      setProgress(0);
      setStatusMessage("");
    }
  };

  const continueImport = async (userId: string, videoId: string) => {
    try {
      // Step 1: Fetch transcript
      setStatusMessage("Fetching video transcript...");
      setProgress(30);

      const transcript = await getYouTubeTranscript(videoId);
      
      if (!transcript || transcript.length < 50) {
        throw new Error("Transcript too short or unavailable. Make sure the video has captions.");
      }

      setProgress(50);
      
      // Step 2: Extract workout data
      setStatusMessage("Analyzing workout content...");
      
      const workoutData = extractWorkoutFromTranscript(transcript);
      
      if (!workoutData.exercises || workoutData.exercises.length === 0) {
        Alert.alert(
          "No Exercises Found",
          "Couldn't find exercises in this video. Would you like to create a blank workout?",
          [
            { text: "Cancel", style: "cancel", onPress: () => {
              setIsLoading(false);
              setProgress(0);
            }},
            {
              text: "Create Blank",
              onPress: () => {
                navigation.navigate("CreateWorkoutTemplate", {
                  importedData: {
                    title: "YouTube Workout",
                    category: "general",
                    exercises: [],
                    tags: ["youtube-import"]
                  },
                  importSource: 'youtube',
                  youtubeUrl: url
                });
                setIsLoading(false);
                setProgress(0);
              }
            }
          ]
        );
        return;
      }

      setProgress(75);

      // Step 3: Save to Supabase
      setStatusMessage("Saving workout...");
      
      const { error: saveError } = await supabase
        .from('youtube_imports')
        .insert({
          user_id: userId,
          youtube_url: url,
          video_id: videoId,
          video_title: workoutData.title,
          transcript: transcript.substring(0, 10000), // Store first 10k chars
          extracted_workout: workoutData,
          status: 'completed'
        });

      if (saveError) {
        console.error("Save error:", saveError);
        // Continue anyway - saving is optional
      }

      setProgress(100);
      setStatusMessage("Success!");

      // Navigate to workout creation
      setTimeout(() => {
        navigation.navigate("CreateWorkoutTemplate", {
          importedData: workoutData,
          importSource: 'youtube',
          youtubeUrl: url,
          videoId: videoId
        });
        
        setIsLoading(false);
        setProgress(0);
        setStatusMessage("");
        setUrl(""); // Clear URL for next import
      }, 500);

    } catch (error: any) {
      throw error;
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <Header title="YouTube Import" subtitle="100% Free - No API keys needed" showBack />

      <ScrollView 
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {/* Icon */}
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primary + '20' }]}>
            <Ionicons name="logo-youtube" size={60} color="#FF0000" />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>
            Import from YouTube
          </Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Paste a workout video URL and we'll extract the exercises
          </Text>
        </View>

        {/* How It Works */}
        <View style={[styles.card, { backgroundColor: colors.card }]}>
          <View style={styles.cardHeader}>
            <Ionicons name="information-circle" size={24} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              How it works
            </Text>
          </View>
          
          <View style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumber}>1</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              Find a workout video with <Text style={{fontWeight: 'bold'}}>captions/subtitles</Text>
            </Text>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumber}>2</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              Copy the video URL from YouTube
            </Text>
          </View>

          <View style={styles.step}>
            <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
              <Text style={styles.stepNumber}>3</Text>
            </View>
            <Text style={[styles.stepText, { color: colors.textSecondary }]}>
              Paste below and tap Import
            </Text>
          </View>
        </View>

        {/* URL Input */}
        <View style={styles.inputSection}>
          <Text style={[styles.inputLabel, { color: colors.textSecondary }]}>
            YOUTUBE URL
          </Text>
          <View style={[styles.inputContainer, { 
            backgroundColor: colors.surface,
            borderColor: colors.border 
          }]}>
            <Ionicons name="link" size={20} color={colors.textSecondary} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="https://youtube.com/watch?v=..."
              placeholderTextColor={colors.textTertiary}
              value={url}
              onChangeText={setUrl}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!isLoading}
              multiline={false}
            />
            {url.length > 0 && !isLoading && (
              <TouchableOpacity onPress={() => setUrl("")} style={styles.clearButton}>
                <Ionicons name="close-circle" size={22} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>

          {/* Import Button */}
          <TouchableOpacity
            style={[
              styles.importButton, 
              { 
                backgroundColor: colors.primary,
                opacity: (isLoading || !url.trim()) ? 0.5 : 1 
              }
            ]}
            onPress={handleImport}
            disabled={isLoading || !url.trim()}
            activeOpacity={0.8}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color="#FFF" size="small" />
                <Text style={styles.buttonText}>Importing...</Text>
              </>
            ) : (
              <>
                <Ionicons name="download-outline" size={22} color="#FFF" />
                <Text style={styles.buttonText}>Import Workout</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Progress */}
        {isLoading && (
          <View style={[styles.progressCard, { backgroundColor: colors.card }]}>
            <View style={styles.progressHeader}>
              <Ionicons name="sync" size={24} color={colors.primary} />
              <Text style={[styles.progressTitle, { color: colors.text }]}>
                {statusMessage}
              </Text>
            </View>
            <View style={[styles.progressBarContainer, { backgroundColor: colors.surface }]}>
              <View 
                style={[
                  styles.progressBar, 
                  { 
                    backgroundColor: colors.primary,
                    width: `${progress}%` 
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressPercent, { color: colors.textSecondary }]}>
              {progress}% complete
            </Text>
          </View>
        )}

        {/* Tips */}
        <View style={[styles.tipsCard, { 
          backgroundColor: theme === 'dark' ? colors.surface : '#FFF9C4' 
        }]}>
          <View style={styles.tipsHeader}>
            <Ionicons name="bulb" size={20} color="#FFA000" />
            <Text style={[styles.tipsTitle, { color: theme === 'dark' ? colors.text : '#F57C00' }]}>
              Tips for best results
            </Text>
          </View>
          <Text style={[styles.tipsText, { color: theme === 'dark' ? colors.textSecondary : '#5D4037' }]}>
            • Choose videos that clearly mention exercise names{'\n'}
            • Videos with "follow along" workouts work best{'\n'}
            • Make sure captions/subtitles are available{'\n'}
            • You can edit the imported workout afterward
          </Text>
        </View>

        {/* Example URLs */}
        <View style={[styles.examplesCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.examplesTitle, { color: colors.text }]}>
            Example workout videos:
          </Text>
          <TouchableOpacity
            style={styles.exampleItem}
            onPress={() => setUrl("https://youtu.be/ml6cT4AZdqI")}
          >
            <Ionicons name="fitness" size={18} color={colors.primary} />
            <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
              Full Body HIIT Workout
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.exampleItem}
            onPress={() => setUrl("https://youtu.be/gC_L9qAHVJ8")}
          >
            <Ionicons name="barbell" size={18} color={colors.primary} />
            <Text style={[styles.exampleText, { color: colors.textSecondary }]}>
              Upper Body Strength
            </Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1 
  },
  content: { 
    padding: 20,
    paddingBottom: 40 
  },
  iconContainer: { 
    alignItems: "center", 
    marginVertical: 20,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  title: { 
    fontSize: 26, 
    fontWeight: "800", 
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  card: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  step: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  stepBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumber: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  stepText: {
    fontSize: 15,
    flex: 1,
    paddingTop: 4,
    lineHeight: 22,
  },
  inputSection: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    marginBottom: 16,
    minHeight: 60,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 12,
  },
  clearButton: {
    padding: 4,
  },
  importButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: { 
    color: "#FFF", 
    fontSize: 18, 
    fontWeight: "700" 
  },
  progressCard: {
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: "600",
    flex: 1,
  },
  progressBarContainer: {
    height: 10,
    borderRadius: 5,
    overflow: "hidden",
    marginBottom: 12,
  },
  progressBar: {
    height: "100%",
    borderRadius: 5,
  },
  progressPercent: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "right",
  },
  tipsCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  tipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  tipsText: {
    fontSize: 14,
    lineHeight: 22,
  },
  examplesCard: {
    borderRadius: 16,
    padding: 18,
  },
  examplesTitle: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 12,
  },
  exampleItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
  },
  exampleText: {
    fontSize: 14,
  },
});

export default YouTubeImport;