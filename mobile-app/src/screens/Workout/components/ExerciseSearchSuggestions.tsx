import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  getShortName,
  weightedSearch,
} from "../utils/searchUtils";
import {
  POPULAR_STRENGTH_EXERCISES,
  POPULAR_CARDIO_EXERCISES,
} from "../constants";

interface ExerciseSearchSuggestionsProps {
  query: string;
  workoutType: "strength" | "cardio" | "mixed";
  colors: any;
  onSelect: (originalName: string) => void;
}

const ExerciseSearchSuggestions: React.FC<ExerciseSearchSuggestionsProps> = ({
  query,
  workoutType,
  colors,
  onSelect,
}) => {
  const suggestions = useMemo(() => {
    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      let list: string[] = [];
      if (workoutType === "mixed") {
        list = [...POPULAR_STRENGTH_EXERCISES, ...POPULAR_CARDIO_EXERCISES];
      } else {
        list =
          workoutType === "strength"
            ? POPULAR_STRENGTH_EXERCISES
            : POPULAR_CARDIO_EXERCISES;
      }
      return list.map((name) => ({ original: name, display: name }));
    }

    const matches = weightedSearch(trimmedQuery);
    return matches.map((item: any) => {
      const fullName = item["Exercise Name"];
      return {
        original: fullName,
        display: getShortName(fullName),
      };
    });
  }, [query, workoutType]);

  if (suggestions.length === 0) return null;

  return (
    <View style={styles.suggestionsContainer}>
      <View style={styles.suggestionsHeader}>
        <Text
          style={[
            styles.suggestionsLabel,
            { color: colors.textSecondary },
          ]}
        >
          {query.trim() === "" ? "POPULAR (scroll →)" : "SUGGESTIONS"}
        </Text>
        {query.trim() !== "" && (
          <Text
            style={[
              styles.suggestionsSublabel,
              { color: colors.textTertiary },
            ]}
          >
            matching "{query}"
          </Text>
        )}
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.suggestionsScroll}
        keyboardShouldPersistTaps="handled"
      >
        {suggestions.map((suggestion, index) => (
          <TouchableOpacity
            key={`${suggestion.original}-${index}`}
            style={[
              styles.suggestionChip,
              {
                backgroundColor: colors.surface,
                borderColor: colors.border,
              },
            ]}
            onPress={() => onSelect(suggestion.original)}
            activeOpacity={0.7}
          >
            <View
              style={[
                styles.suggestionDot,
                { backgroundColor: colors.primary },
              ]}
            />
            <Text
              style={[styles.suggestionText, { color: colors.text }]}
              numberOfLines={1}
            >
              {suggestion.display}
            </Text>
            <View
              style={[
                styles.suggestionDivider,
                { backgroundColor: colors.border },
              ]}
            />
            <Text
              style={[
                styles.suggestionAddText,
                { color: colors.primary },
              ]}
            >
              + Add
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  suggestionsContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  suggestionsHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 6,
    marginBottom: 12,
  },
  suggestionsLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  suggestionsSublabel: { fontSize: 10, fontWeight: "500" },
  suggestionsScroll: { gap: 8, paddingBottom: 4 },
  suggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 8,
  },
  suggestionDot: { width: 6, height: 6, borderRadius: 3, marginRight: 8 },
  suggestionText: {
    fontSize: 13,
    fontWeight: "500",
    maxWidth: 160,
  },
  suggestionDivider: { width: 1, height: 14, marginHorizontal: 10 },
  suggestionAddText: { fontSize: 12, fontWeight: "700" },
});

export default ExerciseSearchSuggestions;
