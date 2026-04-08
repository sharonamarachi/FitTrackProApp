import React, { useState, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import Header from "../../components/Header";
import { supabase } from "../../api/supabaseClient";
import { createWorkout } from "../../services/WorkoutService";
import { POPULAR_TAGS } from "./constants";
import AddExerciseForm from "./components/AddExerciseForm";

type WorkoutType = "strength" | "cardio";

interface Exercise {
  id: string;
  name: string;
  sets?: number;
  reps?: number;
  weight?: number;
  duration?: number;
  restTime?: number;
}

export default function CreateWorkoutTemplate({ navigation, route }: any) {
  const { theme, colors } = useTheme();
  const [selectedType, setSelectedType] = useState<WorkoutType | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [currentExercise, setCurrentExercise] = useState({
    name: "",
    sets: "",
    reps: "",
    weight: "",
    durationMin: "",
    durationSec: "",
    restTime: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const startEdit = (exercise: Exercise) => {
    setEditingId(exercise.id);
    setCurrentExercise({
      name: exercise.name,
      sets: exercise.sets ? exercise.sets.toString() : "",
      reps: exercise.reps ? exercise.reps.toString() : "",
      weight: exercise.weight ? exercise.weight.toString() : "",
      durationMin: exercise.duration
        ? Math.floor(exercise.duration / 60).toString()
        : "",
      durationSec: exercise.duration ? (exercise.duration % 60).toString() : "",
      restTime: exercise.restTime ? exercise.restTime.toString() : "",
    });
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setCurrentExercise({
      name: "",
      sets: "",
      reps: "",
      weight: "",
      durationMin: "",
      durationSec: "",
      restTime: "",
    });
    Keyboard.dismiss();
  };

  React.useEffect(() => {
    if (route?.params?.importedData) {
      const data = route.params.importedData;
      if (data.title) setWorkoutName(data.title);
      if (data.exercises && Array.isArray(data.exercises)) {
        const formattedExercises = data.exercises.map(
          (ex: any, index: number) => ({
            id: ex.id || `ex_${Date.now()}_${index}`,
            name: ex.name,
            sets: ex.sets,
            reps: ex.reps,
            weight: ex.weight,
            duration: ex.duration,
            restTime: ex.restTime,
          }),
        );
        setExercises(formattedExercises);
        const hasTimedExercises = formattedExercises.some(
          (ex: Exercise) => ex.duration,
        );
        setSelectedType(hasTimedExercises ? "cardio" : "strength");
      }
      if (data.tags && Array.isArray(data.tags)) setSelectedTags(data.tags);
      if (data.category && !data.tags?.includes(data.category)) {
        setSelectedTags((prev) => [...prev, data.category]);
      }
    }
  }, [route?.params?.importedData]);

  const handleSelectSuggestion = (originalName: string) => {
    if (selectedType === "strength") {
      setCurrentExercise({
        ...currentExercise,
        name: originalName,
        sets: "3",
        reps: "10",
        weight: "0",
      });
    } else {
      setCurrentExercise({
        ...currentExercise,
        name: originalName,
        durationMin: "0",
        durationSec: "40",
        restTime: "20",
      });
    }
  };

  const addExercise = () => {
    if (!currentExercise.name.trim()) {
      Alert.alert("Error", "Please enter an exercise name");
      return;
    }
    const updatedExercise: Exercise = {
      id: editingId || Date.now().toString(),
      name: currentExercise.name.trim(),
    };
    if (selectedType === "strength") {
      if (currentExercise.sets)
        updatedExercise.sets = parseInt(currentExercise.sets);
      if (currentExercise.reps)
        updatedExercise.reps = parseInt(currentExercise.reps);
      if (currentExercise.weight)
        updatedExercise.weight = parseInt(currentExercise.weight);
    } else {
      const mins = parseInt(currentExercise.durationMin) || 0;
      const secs = parseInt(currentExercise.durationSec) || 0;
      const totalSeconds = mins * 60 + secs;
      if (totalSeconds > 0) updatedExercise.duration = totalSeconds;
      if (currentExercise.restTime)
        updatedExercise.restTime = parseInt(currentExercise.restTime);
    }

    if (editingId) {
      setExercises(
        exercises.map((ex) => (ex.id === editingId ? updatedExercise : ex)),
      );
    } else {
      setExercises([...exercises, updatedExercise]);
    }

    setEditingId(null);
    setCurrentExercise({
      name: "",
      sets: "",
      reps: "",
      weight: "",
      durationMin: "",
      durationSec: "",
      restTime: "",
    });
    Keyboard.dismiss();
  };

  const removeExercise = (id: string) =>
    setExercises(exercises.filter((ex) => ex.id !== id));

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
    );
  };

  const saveWorkout = async () => {
    if (!workoutName.trim()) {
      Alert.alert("Error", "Please enter a workout name");
      return;
    }
    if (exercises.length === 0) {
      Alert.alert("Error", "Please add at least one exercise");
      return;
    }
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        Alert.alert("Error", "You must be logged in");
        return;
      }
      const newWorkout = {
        title: workoutName,
        exercises,
        category: selectedType === "strength" ? "strength" : "cardio",
        tags: selectedTags,
      };
      const { error } = await createWorkout(user.id, newWorkout);
      if (error) throw error;
      Alert.alert("Success", "Workout saved!", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      Alert.alert("Error", "Failed to save workout");
    }
  };

  if (!selectedType) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar
          barStyle={theme === "dark" ? "light-content" : "dark-content"}
        />
        <Header title="Create Workout" subtitle="Choose your template" />

        <ScrollView
          contentContainerStyle={styles.templateScrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[styles.templateCard, { backgroundColor: colors.card }]}
            onPress={() => setSelectedType("strength")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.templateIcon, { backgroundColor: "#10b98120" }]}
            >
              <Ionicons name="barbell" size={40} color="#10b981" />
            </View>
            <Text style={[styles.templateTitle, { color: colors.text }]}>
              Sets & Reps
            </Text>
            <Text
              style={[
                styles.templateDescription,
                { color: colors.textSecondary },
              ]}
            >
              Traditional strength training with sets and repetitions
            </Text>
            <View style={styles.templateFeatures}>
              <FeatureTag
                icon="checkmark-circle"
                text="Set Name"
                colors={colors}
              />
              <FeatureTag icon="refresh" text="Sets × Reps" colors={colors} />
              <FeatureTag icon="list" text="Exercise Order" colors={colors} />
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.templateCard, { backgroundColor: colors.card }]}
            onPress={() => setSelectedType("cardio")}
            activeOpacity={0.7}
          >
            <View
              style={[styles.templateIcon, { backgroundColor: "#f9731620" }]}
            >
              <Ionicons name="timer" size={40} color="#f97316" />
            </View>
            <Text style={[styles.templateTitle, { color: colors.text }]}>
              Interval Timer
            </Text>
            <Text
              style={[
                styles.templateDescription,
                { color: colors.textSecondary },
              ]}
            >
              Time-based workouts with intervals and rest periods
            </Text>
            <View style={styles.templateFeatures}>
              <FeatureTag icon="time" text="Work/Rest" colors={colors} />
              <FeatureTag icon="repeat" text="Auto Loop" colors={colors} />
            </View>
          </TouchableOpacity>

          <View style={styles.templateBottomPadding}>
            <Text
              style={[
                styles.templateBottomHint,
                { color: colors.textTertiary },
              ]}
            >
              Choose a type above to get started
            </Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      <StatusBar
        barStyle={theme === "dark" ? "light-content" : "dark-content"}
      />
      <Header
        title={
          selectedType === "strength"
            ? "Strength Workout"
            : "Cardio Workout"
        }
        subtitle="Build your workout"
        rightAction={{ icon: "checkmark", onPress: saveWorkout }}
      />

      <ScrollView
        ref={scrollViewRef}
        style={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            WORKOUT NAME
          </Text>
          <TextInput
            style={[
              styles.workoutNameInput,
              {
                backgroundColor: colors.card,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="e.g., Upper Body Strength"
            placeholderTextColor={colors.textTertiary}
            value={workoutName}
            onChangeText={setWorkoutName}
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: colors.textSecondary }]}>
            TAGS (OPTIONAL)
          </Text>
          <View style={styles.tagsContainer}>
            {POPULAR_TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.tagChip,
                  {
                    backgroundColor: selectedTags.includes(tag)
                      ? colors.primary
                      : colors.surface,
                  },
                ]}
                onPress={() => toggleTag(tag)}
                activeOpacity={0.7}
              >
                <Text
                  style={[
                    styles.tagText,
                    {
                      color: selectedTags.includes(tag)
                        ? "#FFFFFF"
                        : colors.text,
                    },
                  ]}
                >
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {exercises.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text
                style={[styles.sectionLabel, { color: colors.textSecondary }]}
              >
                EXERCISES ({exercises.length})
              </Text>
            </View>

            {exercises.map((exercise, index) => (
              <TouchableOpacity
                key={exercise.id}
                onPress={() => startEdit(exercise)}
                activeOpacity={0.7}
                style={[
                  styles.exerciseItem,
                  {
                    backgroundColor: colors.card,
                    borderColor:
                      editingId === exercise.id
                        ? colors.primary
                        : colors.border,
                    borderWidth: editingId === exercise.id ? 2 : 1,
                  },
                ]}
              >
                <View style={styles.exerciseItemLeft}>
                  <View
                    style={[
                      styles.exerciseNumber,
                      { backgroundColor: colors.primary + "20" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.exerciseNumberText,
                        { color: colors.primary },
                      ]}
                    >
                      {index + 1}
                    </Text>
                  </View>
                  <View style={styles.exerciseInfo}>
                    <View style={styles.exerciseNameRow}>
                      <Text
                        style={[styles.exerciseName, { color: colors.text }]}
                      >
                        {exercise.name}
                      </Text>
                      <Ionicons
                        name="create-outline"
                        size={14}
                        color={colors.textTertiary}
                        style={{ marginLeft: 6, marginBottom: 2 }}
                      />
                    </View>
                    {selectedType === "strength" ? (
                      <Text
                        style={[
                          styles.exerciseMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {exercise.sets} sets × {exercise.reps} reps
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.exerciseMeta,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {exercise.duration}s work · {exercise.restTime}s rest
                      </Text>
                    )}
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => removeExercise(exercise.id)}
                  style={styles.deleteButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={24}
                    color={colors.error}
                  />
                </TouchableOpacity>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <AddExerciseForm
          workoutType={selectedType}
          colors={colors}
          editingId={editingId}
          currentExercise={currentExercise}
          onExerciseChange={(field, value) =>
            setCurrentExercise({ ...currentExercise, [field]: value })
          }
          onAddExercise={addExercise}
          onCancelEdit={cancelEdit}
          onSelectSuggestion={handleSelectSuggestion}
        />

        <View style={{ height: exercises.length > 0 ? 100 : 40 }} />
      </ScrollView>

      {exercises.length > 0 && (
        <View
          style={[
            styles.footer,
            {
              backgroundColor: colors.background,
              borderTopColor: colors.border,
            },
          ]}
        >
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.primary }]}
            onPress={saveWorkout}
            activeOpacity={0.8}
          >
            <Ionicons name="checkmark-circle" size={24} color="#fff" />
            <Text style={styles.saveButtonText}>Save Workout</Text>
          </TouchableOpacity>
        </View>
      )}
    </KeyboardAvoidingView>
  );
}

const FeatureTag = ({ icon, text, colors }: any) => (
  <View style={styles.featureTag}>
    <Ionicons name={icon} size={14} color={colors.textSecondary} />
    <Text style={[styles.featureTagText, { color: colors.textSecondary }]}>
      {text}
    </Text>
  </View>
);

const styles = StyleSheet.create({
  container: { flex: 1 },

  templateScrollContent: {
    padding: 20,
    gap: 20,
    paddingBottom: 40,
  },
  templateBottomPadding: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 20,
  },
  templateBottomHint: {
    fontSize: 13,
    fontWeight: "500",
  },

  templateCard: {
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 12,
    elevation: 4,
  },
  templateIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  templateTitle: { fontSize: 24, fontWeight: "700", marginBottom: 8 },
  templateDescription: { fontSize: 15, lineHeight: 22, marginBottom: 20 },
  templateFeatures: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  featureTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
    gap: 4,
  },
  featureTagText: { fontSize: 12, fontWeight: "500" },

  content: { flex: 1, padding: 20 },
  section: { marginBottom: 24 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1,
    marginBottom: 12,
  },
  workoutNameInput: {
    borderRadius: 16,
    padding: 16,
    fontSize: 18,
    fontWeight: "600",
    borderWidth: 2,
  },
  exerciseMeta: { fontSize: 14, marginTop: 2 },
  exerciseItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  exerciseItemLeft: { flexDirection: "row", alignItems: "center", flex: 1 },
  exerciseNumber: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  exerciseNumberText: { fontSize: 16, fontWeight: "700" },
  exerciseInfo: {
    flex: 1,
    minWidth: 0,
  },
  exerciseNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },

  exerciseName: {
    fontSize: 16,
    fontWeight: "600",
    flexShrink: 1,
  },
  deleteButton: { padding: 4 },
  tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  tagChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    marginBottom: 4,
  },
  tagText: { fontSize: 14, fontWeight: "500" },
  footer: { padding: 20, borderTopWidth: 1 },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 18,
    borderRadius: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 4,
  },
  saveButtonText: { color: "#fff", fontSize: 18, fontWeight: "700" },
});
