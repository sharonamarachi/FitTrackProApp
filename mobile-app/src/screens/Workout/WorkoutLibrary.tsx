import React, { useEffect, useState, useMemo, useRef } from "react";
import {
  View,
  FlatList,
  Text,
  StyleSheet,
  Alert,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  Animated,
  SectionList,
  Keyboard,
  TouchableWithoutFeedback,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutsStackParamList } from "../../navigation/WorkoutStack";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  fetchWorkouts,
  softDeleteWorkout,
  togglePinWorkout,
  toggleFavoriteWorkout,
} from "../../services/WorkoutService";
import { Workout } from "../../domain/workout";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../api/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import { formatDurationMinsSecs } from "../../utils/time";

type Props = NativeStackScreenProps<WorkoutsStackParamList, "WorkoutLibrary">;

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildFilterOptions(workouts: Workout[]): string[] {
  const freq: Record<string, number> = {};
  workouts.forEach((w) => {
    if (w.category) {
      const cat = w.category.toLowerCase();
      freq[cat] = (freq[cat] ?? 0) + 1;
    }
    (w.tags ?? []).forEach((t) => {
      const tag = t.toLowerCase();
      freq[tag] = (freq[tag] ?? 0) + 1;
    });
  });

  const blocked = new Set([
    "transcript-import",
    "youtube-import",
    "timed",
    "reps-based",
    "manual",
    "general",
  ]);

  return Object.entries(freq)
    .filter(([tag]) => !blocked.has(tag))
    .sort((a, b) => b[1] - a[1])
    .map(([tag]) => tag);
}

function workoutMatchesFilter(w: Workout, filter: string): boolean {
  if (filter === "all") return true;
  const lowerFilter = filter.toLowerCase();
  if ((w.category ?? "").toLowerCase() === lowerFilter) return true;
  if ((w.tags ?? []).some((t) => t.toLowerCase() === lowerFilter)) return true;
  return false;
}

function formatLabel(label: string): string {
  return label
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const TAG_PALETTE = [
  "#6366f1",
  "#10b981",
  "#f97316",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#f59e0b",
];
const tagColorMap: Record<string, string> = {};
let colorIndex = 0;
function tagColor(tag: string): string {
  if (!tagColorMap[tag]) {
    tagColorMap[tag] = TAG_PALETTE[colorIndex % TAG_PALETTE.length];
    colorIndex++;
  }
  return tagColorMap[tag];
}

function matchingExercises(w: Workout, query: string): string[] {
  if (!query.trim()) return [];
  const q = query.trim().toLowerCase();
  return (w.exercises ?? [])
    .filter((e: any) => e.name?.toLowerCase().includes(q))
    .map((e: any) => e.name as string);
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function WorkoutLibrary({ navigation }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current;
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";
  const insets = useSafeAreaInsets();

  useEffect(() => {
    loadWorkouts();
    const unsubscribe = navigation.addListener("focus", loadWorkouts);
    return unsubscribe;
  }, [navigation]);

  async function loadWorkouts() {
    setLoading(true);
    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();
      if (userError || !user) {
        Alert.alert("Error", "You must be logged in to view workouts");
        setLoading(false);
        return;
      }
      const { data, error } = await fetchWorkouts(user.id);
      if (error) {
        Alert.alert("Error", "Failed to load workouts: " + error.message);
      } else {
        setWorkouts(data ?? []);
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string) {
    Alert.alert("Delete Workout", "Move this workout to Recently Deleted?", [
      { text: "Cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            const {
              data: { user },
            } = await supabase.auth.getUser();
            if (user) {
              const workoutToDelete = workouts.find((w) => w.id === id);
              if (workoutToDelete) {
                const { error } = await softDeleteWorkout(
                  user.id,
                  id,
                  workoutToDelete,
                );
                if (error) {
                  Alert.alert("Error", "Failed to delete: " + error.message);
                } else {
                  loadWorkouts();
                }
              }
            }
          } catch {
            Alert.alert("Error", "Failed to delete workout");
          }
        },
      },
    ]);
  }

  async function handleTogglePin(workout: Workout) {
    setTogglingId(workout.id);
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workout.id ? { ...w, is_pinned: !w.is_pinned } : w,
      ),
    );
    const { error } = await togglePinWorkout(
      workout.id,
      workout.is_pinned ?? false,
    );
    if (error) {
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workout.id ? { ...w, is_pinned: workout.is_pinned } : w,
        ),
      );
      Alert.alert("Error", "Failed to update pin");
    }
    setTogglingId(null);
  }

  async function handleToggleFavorite(workout: Workout) {
    setTogglingId(workout.id);
    setWorkouts((prev) =>
      prev.map((w) =>
        w.id === workout.id ? { ...w, is_favorited: !w.is_favorited } : w,
      ),
    );
    const { error } = await toggleFavoriteWorkout(
      workout.id,
      workout.is_favorited ?? false,
    );
    if (error) {
      setWorkouts((prev) =>
        prev.map((w) =>
          w.id === workout.id
            ? { ...w, is_favorited: workout.is_favorited }
            : w,
        ),
      );
      Alert.alert("Error", "Failed to update favourite");
    }
    setTogglingId(null);
  }

  const toggleSearch = () => {
    const next = !searchVisible;
    setSearchVisible(next);
    Animated.timing(searchAnim, {
      toValue: next ? 1 : 0,
      duration: 220,
      useNativeDriver: false,
    }).start(() => {
      if (!next) setSearchQuery("");
    });
  };

  const filterOptions = useMemo(() => buildFilterOptions(workouts), [workouts]);

  // ── Filtering: title + tags + category + EXERCISE NAMES ───────────────────
  const filteredWorkouts = useMemo(() => {
    let list = workouts;

    if (activeFilter === "__fav__") {
      list = list.filter((w) => w.is_favorited);
    } else if (activeFilter !== "all") {
      list = list.filter((w) => workoutMatchesFilter(w, activeFilter));
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((w) => {
        const inTitle = w.title.toLowerCase().includes(q);
        const inTags = (w.tags ?? []).some((t) => t.toLowerCase().includes(q));
        const inCategory = (w.category ?? "").toLowerCase().includes(q);
        // ── NEW: search exercise names inside each workout ─────────────
        const inExercises = (w.exercises ?? []).some((e: any) =>
          e.name?.toLowerCase().includes(q),
        );
        return inTitle || inTags || inCategory || inExercises;
      });
    }
    return list;
  }, [workouts, activeFilter, searchQuery]);

  // ── Detect whether the query is matching via exercise names ───────────────
  const isExerciseSearch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return false;
    return filteredWorkouts.some((w) => {
      const inTitle = w.title.toLowerCase().includes(q);
      const inTags = (w.tags ?? []).some((t) => t.toLowerCase().includes(q));
      const inCategory = (w.category ?? "").toLowerCase().includes(q);
      return !inTitle && !inTags && !inCategory; // only exercise matched
    });
  }, [filteredWorkouts, searchQuery]);

  const sections = useMemo(() => {
    const pinned = filteredWorkouts.filter((w) => w.is_pinned);
    const rest = filteredWorkouts.filter((w) => !w.is_pinned);
    const result = [];
    if (pinned.length > 0) result.push({ title: "📌 Pinned", data: pinned });
    if (rest.length > 0)
      result.push({
        title: pinned.length > 0 ? "All Workouts" : "",
        data: rest,
      });
    return result;
  }, [filteredWorkouts]);

  const favCount = useMemo(
    () => workouts.filter((w) => w.is_favorited).length,
    [workouts],
  );

  const searchBarHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });
  const searchBarOpacity = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  if (loading) {
    return (
      <View
        style={[
          styles.loadingContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading workouts…
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.card, paddingTop: insets.top + 16 }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              Workout Library
            </Text>
            <View style={styles.subtitleRow}>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {filteredWorkouts.length}{" "}
                {filteredWorkouts.length === 1 ? "workout" : "workouts"}
                {searchQuery || activeFilter !== "all" ? " found" : " total"}
              </Text>
              {favCount > 0 && (
                <View
                  style={[
                    styles.favBadge,
                    { backgroundColor: "#ec4899" + "22" },
                  ]}
                >
                  <Ionicons name="heart" size={12} color="#ec4899" />
                  <Text style={[styles.favBadgeText, { color: "#ec4899" }]}>
                    {favCount}
                  </Text>
                </View>
              )}
            </View>
          </View>

          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor:
                    activeFilter === "__fav__"
                      ? "#ec4899" + "22"
                      : colors.surface,
                },
              ]}
              onPress={() =>
                setActiveFilter((f) => (f === "__fav__" ? "all" : "__fav__"))
              }
              activeOpacity={0.6}
              accessibilityLabel="Show favourites"
            >
              <Ionicons
                name={activeFilter === "__fav__" ? "heart" : "heart-outline"}
                size={20}
                color={activeFilter === "__fav__" ? "#ec4899" : colors.text}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.iconBtn,
                {
                  backgroundColor: searchVisible
                    ? colors.primary + "22"
                    : colors.surface,
                },
              ]}
              onPress={toggleSearch}
              activeOpacity={0.6}
              accessibilityLabel="Toggle search"
            >
              <Ionicons
                name={searchVisible ? "close" : "search"}
                size={20}
                color={searchVisible ? colors.primary : colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Animated search bar ──────────────────────────────────────────── */}
        <Animated.View
          style={[
            styles.searchBarWrap,
            { height: searchBarHeight, opacity: searchBarOpacity },
          ]}
          pointerEvents={searchVisible ? "auto" : "none"}
        >
          <View
            style={[
              styles.searchBar,
              {
                backgroundColor: colors.surface,
                borderColor: searchQuery ? colors.primary : colors.border,
              },
            ]}
          >
            <Ionicons name="search" size={18} color={colors.textTertiary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search workouts or exercises…"
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
              onSubmitEditing={Keyboard.dismiss}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                activeOpacity={0.6}
              >
                <Ionicons
                  name="close-circle"
                  size={18}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Exercise search hint banner ──────────────────────────────────── */}
        {searchQuery.trim().length > 0 && isExerciseSearch && (
          <View
            style={[
              styles.exerciseSearchBanner,
              {
                backgroundColor: colors.primary + "14",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <Ionicons name="barbell-outline" size={13} color={colors.primary} />
            <Text
              style={[styles.exerciseSearchText, { color: colors.primary }]}
            >
              Showing workouts that contain the exercise "{searchQuery.trim()}"
            </Text>
          </View>
        )}

        {/* ── Filter pills ─────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContainer}
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor:
                  activeFilter === "all" ? colors.primary : "transparent",
                borderColor:
                  activeFilter === "all" ? colors.primary : colors.border,
              },
            ]}
            onPress={() => setActiveFilter("all")}
            activeOpacity={0.6}
          >
            <Text
              style={[
                styles.filterText,
                {
                  color: activeFilter === "all" ? "#fff" : colors.textSecondary,
                  fontWeight: activeFilter === "all" ? "700" : "500",
                },
              ]}
            >
              All ({workouts.length})
            </Text>
          </TouchableOpacity>

          {filterOptions.map((tag) => {
            const isActive = activeFilter === tag;
            const count = workouts.filter((w) =>
              workoutMatchesFilter(w, tag),
            ).length;
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? tagColor(tag) + (isDark ? "30" : "18")
                      : "transparent",
                    borderColor: isActive ? tagColor(tag) : colors.border,
                  },
                ]}
                onPress={() => setActiveFilter(isActive ? "all" : tag)}
                activeOpacity={0.6}
              >
                <Text
                  style={[
                    styles.filterText,
                    {
                      color: isActive ? tagColor(tag) : colors.textSecondary,
                      fontWeight: isActive ? "700" : "500",
                    },
                  ]}
                >
                  {formatLabel(tag)} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Section list ────────────────────────────────────────────────────── */}
      {sections.length === 0 ? (
        <EmptyState
          filter={activeFilter}
          query={searchQuery}
          colors={colors}
          onClear={() => {
            setActiveFilter("all");
            setSearchQuery("");
          }}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          stickySectionHeadersEnabled={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          renderSectionHeader={({ section }) =>
            section.title ? (
              <View style={styles.sectionHeader}>
                <Text
                  style={[
                    styles.sectionHeaderText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {section.title}
                </Text>
                {section.title.includes("Pinned") && (
                  <View
                    style={[
                      styles.pinnedDivider,
                      { backgroundColor: colors.border },
                    ]}
                  />
                )}
              </View>
            ) : null
          }
          renderItem={({ item }) => (
            <WorkoutCard
              workout={item}
              colors={colors}
              theme={theme}
              isToggling={togglingId === item.id}
              searchQuery={searchQuery}
              onPress={() =>
                navigation.navigate("WorkoutDetails", { workoutId: item.id })
              }
              onDelete={() => handleDelete(item.id)}
              onTogglePin={() => handleTogglePin(item)}
              onToggleFavorite={() => handleToggleFavorite(item)}
            />
          )}
          ListEmptyComponent={
            <EmptyState
              filter={activeFilter}
              query={searchQuery}
              colors={colors}
              onClear={() => {
                setActiveFilter("all");
                setSearchQuery("");
              }}
            />
          }
        />
      )}

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <Animated.View
        style={[styles.fabWrap, { transform: [{ scale: fabScale }] }]}
      >
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPressIn={() =>
            Animated.spring(fabScale, {
              toValue: 0.92,
              useNativeDriver: true,
            }).start()
          }
          onPressOut={() =>
            Animated.spring(fabScale, {
              toValue: 1,
              useNativeDriver: true,
            }).start()
          }
          onPress={() => navigation.navigate("CreateWorkoutTemplate")}
          activeOpacity={0.8}
          accessibilityLabel="Create new workout"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={32} color="#fff" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ── WorkoutCard ────────────────────────────────────────────────────────────────

interface CardProps {
  workout: Workout & { is_pinned?: boolean; is_favorited?: boolean };
  colors: any;
  theme: string;
  isToggling: boolean;
  searchQuery: string; // ← NEW
  onPress: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  onToggleFavorite: () => void;
}

function WorkoutCard({
  workout,
  colors,
  theme,
  isToggling,
  searchQuery,
  onPress,
  onDelete,
  onTogglePin,
  onToggleFavorite,
}: CardProps) {
  const isDark = theme === "dark";
  const isPinned = workout.is_pinned ?? false;
  const isFav = workout.is_favorited ?? false;

  const visibleTags = [
    ...(workout.category ? [workout.category] : []),
    ...(workout.tags ?? []).filter(
      (t) =>
        ![
          "transcript-import",
          "youtube-import",
          "timed",
          "reps-based",
          "manual",
          "general",
        ].includes(t.toLowerCase()) &&
        t.toLowerCase() !== (workout.category ?? "").toLowerCase(),
    ),
  ].slice(0, 3);

  const exerciseCount = workout.exercises?.length ?? 0;
  const hasTimer = workout.exercises?.some((e) => e.duration);
  const previewExercises = (workout.exercises ?? []).slice(0, 3);
  const remainingCount = Math.max(0, exerciseCount - 3);

  const totalSeconds = (workout.exercises ?? []).reduce((sum, ex) => {
    if (ex.duration) return sum + ex.duration + (ex.restTime ?? 0);
    if (ex.sets && ex.reps)
      return sum + ex.sets * (ex.reps * 3 + (ex.restTime ?? 30));
    return sum;
  }, 0);
  const estimatedMins = Math.round(totalSeconds / 60);

  const matchedExercises = matchingExercises(workout, searchQuery);
  const q = searchQuery.trim().toLowerCase();
  const titleOrTagMatch =
    !q ||
    workout.title.toLowerCase().includes(q) ||
    (workout.tags ?? []).some((t) => t.toLowerCase().includes(q)) ||
    (workout.category ?? "").toLowerCase().includes(q);
  const showExerciseMatch = matchedExercises.length > 0 && !titleOrTagMatch;

  return (
    <TouchableOpacity
      style={[
        styles.card,
        { backgroundColor: colors.card },
        isPinned && styles.pinnedCard,
        isPinned && { borderLeftColor: colors.primary },
        isDark && { borderColor: colors.border },
      ]}
      onPress={onPress}
      activeOpacity={0.75}
    >
      <View style={styles.cardTopRow}>
        <View
          style={[
            styles.typeIconWrap,
            {
              backgroundColor: hasTimer
                ? "#f97316" + "22"
                : colors.primary + "18",
            },
          ]}
        >
          <Ionicons
            name={hasTimer ? "timer-outline" : "barbell-outline"}
            size={18}
            color={hasTimer ? "#f97316" : colors.primary}
          />
        </View>

        <View style={styles.titleBlock}>
          <Text
            style={[styles.cardTitle, { color: colors.text }]}
            numberOfLines={1}
          >
            {workout.title}
          </Text>
          {estimatedMins > 0 && (
            <Text
              style={[styles.estimatedTime, { color: colors.textTertiary }]}
            >
              ~{estimatedMins} min
            </Text>
          )}
        </View>

        <View style={styles.cardActions}>
          <TouchableOpacity
            onPress={onTogglePin}
            disabled={isToggling}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={[
              styles.actionIconBtn,
              isPinned && { backgroundColor: colors.primary + "22" },
            ]}
          >
            <Ionicons
              name={isPinned ? "pin" : "pin-outline"}
              size={17}
              color={isPinned ? colors.primary : colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onToggleFavorite}
            disabled={isToggling}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={[
              styles.actionIconBtn,
              isFav && { backgroundColor: "#ec4899" + "22" },
            ]}
          >
            <Ionicons
              name={isFav ? "heart" : "heart-outline"}
              size={17}
              color={isFav ? "#ec4899" : colors.textTertiary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onDelete}
            hitSlop={{ top: 10, bottom: 10, left: 8, right: 8 }}
            style={[
              styles.actionIconBtn,
              { backgroundColor: isDark ? colors.surface : "#FEF2F2" },
            ]}
          >
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      {/* ── Tags row ──────────────────────────────────────────────────────── */}
      {visibleTags.length > 0 && (
        <View style={styles.tagRow}>
          {visibleTags.map((tag) => {
            const color = tagColor(tag);
            return (
              <View
                key={tag}
                style={[
                  styles.tagChip,
                  {
                    borderColor: color + (isDark ? "60" : "40"),
                    backgroundColor: "transparent",
                  },
                ]}
              >
                <Text style={[styles.tagText, { color }]}>
                  {formatLabel(tag)}
                </Text>
              </View>
            );
          })}
        </View>
      )}

      {/* ──Matched exercise badge ──────────────────────────────────── */}
      {showExerciseMatch && (
        <View
          style={[
            styles.exerciseMatchBanner,
            {
              backgroundColor: colors.primary + (isDark ? "20" : "12"),
              borderColor: colors.primary + "30",
            },
          ]}
        >
          <Ionicons name="barbell-outline" size={12} color={colors.primary} />
          <Text
            style={[styles.exerciseMatchText, { color: colors.primary }]}
            numberOfLines={1}
          >
            Contains: {matchedExercises.slice(0, 3).join(", ")}
            {matchedExercises.length > 3
              ? ` +${matchedExercises.length - 3} more`
              : ""}
          </Text>
        </View>
      )}

      {/* Exercise preview list ────────────────────────────────────────── */}
      {previewExercises.length > 0 && (
        <View
          style={[
            styles.previewContainer,
            { backgroundColor: isDark ? colors.surface : "#F8F9FA" },
          ]}
        >
          {previewExercises.map((ex) => {
            // Highlight exercise name if it matches the query
            const isMatch = q && ex.name?.toLowerCase().includes(q);
            return (
              <View key={ex.id} style={styles.previewRow}>
                <View
                  style={[
                    styles.previewDot,
                    {
                      backgroundColor: isMatch
                        ? colors.primary
                        : hasTimer
                          ? "#f97316"
                          : colors.primary,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.previewExName,
                    { color: colors.text },
                    isMatch && {
                      color: colors.primary,
                      fontWeight: "700",
                    },
                  ]}
                  numberOfLines={1}
                >
                  {ex.name}
                  {isMatch && " ✓"}
                </Text>
                <Text
                  style={[styles.previewExMeta, { color: colors.textTertiary }]}
                >
                  {ex.duration
                    ? formatDurationMinsSecs(ex.duration)
                    : ex.sets && ex.reps
                      ? `${ex.sets}×${ex.reps}`
                      : ""}
                  {ex.weight ? ` · ${ex.weight}kg` : ""}
                </Text>
              </View>
            );
          })}
          {remainingCount > 0 && (
            <Text style={[styles.previewMore, { color: colors.primary }]}>
              +{remainingCount} more exercise{remainingCount > 1 ? "s" : ""}
            </Text>
          )}
        </View>
      )}

      {/* ── Card footer ──────────────────────────────────────────────────── */}
      <View style={[styles.cardFooter, { borderTopColor: colors.divider }]}>
        <View style={styles.metaRow}>
          <Ionicons name="list-outline" size={13} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
          </Text>
          {hasTimer && (
            <>
              <View
                style={[
                  styles.metaDot,
                  { backgroundColor: colors.textTertiary },
                ]}
              />
              <Ionicons
                name="time-outline"
                size={13}
                color={colors.textTertiary}
              />
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                Timed
              </Text>
            </>
          )}
          {isFav && (
            <>
              <View
                style={[
                  styles.metaDot,
                  { backgroundColor: colors.textTertiary },
                ]}
              />
              <Ionicons name="heart" size={12} color="#ec4899" />
            </>
          )}
          {isPinned && (
            <>
              <View
                style={[
                  styles.metaDot,
                  { backgroundColor: colors.textTertiary },
                ]}
              />
              <Ionicons name="pin" size={12} color={colors.primary} />
            </>
          )}
        </View>
        <Text style={[styles.dateText, { color: colors.textTertiary }]}>
          {new Date(workout.created_at).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ── EmptyState ─────────────────────────────────────────────────────────────────

function EmptyState({
  filter,
  query,
  colors,
  onClear,
}: {
  filter: string;
  query: string;
  colors: any;
  onClear: () => void;
}) {
  const isFavFilter = filter === "__fav__";
  const hasFilter = filter !== "all" || query.length > 0;

  return (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={
          isFavFilter
            ? "heart-outline"
            : hasFilter
              ? "search-outline"
              : "barbell-outline"
        }
        size={64}
        color={colors.textTertiary}
      />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {isFavFilter
          ? "No favourites yet"
          : hasFilter
            ? "No matching workouts"
            : "No workouts yet"}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
        {isFavFilter
          ? "Tap the ♥ icon on any workout to add it here"
          : hasFilter
            ? query
              ? `No workouts or exercises matching "${query}"`
              : "Try a different filter"
            : "Tap the + button to create your first workout"}
      </Text>
      {hasFilter && (
        <TouchableOpacity
          style={[styles.clearBtn, { backgroundColor: colors.primary }]}
          onPress={onClear}
          activeOpacity={0.7}
        >
          <Text style={[styles.clearBtnText, { color: "#fff" }]}>
            Clear filters
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  loadingText: { fontSize: 16 },
  header: {
    paddingBottom: 14,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 5,
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  title: { fontSize: 28, fontWeight: "bold" },
  subtitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  subtitle: { fontSize: 14 },
  favBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  favBadgeText: { fontSize: 12, fontWeight: "700" },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  searchBarWrap: { overflow: "hidden", paddingHorizontal: 20, marginBottom: 4 },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, fontSize: 16, paddingVertical: 0, fontWeight: "400" },

  // ── NEW: exercise search banner ────────────────────────────────────────────
  exerciseSearchBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginHorizontal: 20,
    marginBottom: 8,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  exerciseSearchText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  filterScrollView: { paddingHorizontal: 16 },
  filterContainer: { gap: 8, paddingRight: 16, paddingBottom: 2 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  filterText: { fontSize: 14, fontWeight: "600" },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  pinnedDivider: { flex: 1, height: 1 },
  listContent: { padding: 16, paddingBottom: 140 },
  card: {
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  pinnedCard: {
    borderLeftWidth: 3,
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
  },
  typeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 2,
  },
  titleBlock: { flex: 1 },
  cardTitle: { fontSize: 15, fontWeight: "700", lineHeight: 21 },
  estimatedTime: { fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 4 },
  actionIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  tagRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: { fontSize: 11, fontWeight: "500" },

  // ── NEW: exercise match banner on card ────────────────────────────────────
  exerciseMatchBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginBottom: 10,
  },
  exerciseMatchText: {
    fontSize: 11,
    fontWeight: "600",
    flex: 1,
  },

  previewContainer: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    gap: 6,
  },
  previewRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  previewDot: { width: 6, height: 6, borderRadius: 3, flexShrink: 0 },
  previewExName: { flex: 1, fontSize: 13, fontWeight: "500" },
  previewExMeta: { fontSize: 12 },
  previewMore: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
    paddingLeft: 14,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
    marginTop: 2,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12 },
  metaDot: { width: 3, height: 3, borderRadius: 1.5, marginHorizontal: 2 },
  dateText: { fontSize: 12 },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyText: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  emptySubtext: {
    fontSize: 15,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.8,
  },
  clearBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  clearBtnText: { fontSize: 16, fontWeight: "600" },
  fabWrap: { position: "absolute", right: 20, bottom: 120 },
  fab: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
});
