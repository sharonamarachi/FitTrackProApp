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
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutsStackParamList } from "../../navigation/WorkoutStack";
import { fetchWorkouts, softDeleteWorkout } from "../../services/WorkoutService";
import { Workout } from "../../domain/workout";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../api/supabaseClient";
import { useTheme } from "../../context/ThemeContext";

type Props = NativeStackScreenProps<WorkoutsStackParamList, "WorkoutLibrary">;

// ── Helpers ────────────────────────────────────────────────────────────────────

/** Collect every unique tag/category across all workouts, sorted by frequency */
function buildFilterOptions(workouts: Workout[]): string[] {
  const freq: Record<string, number> = {};

  workouts.forEach((w) => {
    // Include category
    if (w.category) {
      const cat = w.category.toLowerCase();
      freq[cat] = (freq[cat] ?? 0) + 1;
    }
    // Include tags
    (w.tags ?? []).forEach((t) => {
      const tag = t.toLowerCase();
      freq[tag] = (freq[tag] ?? 0) + 1;
    });
  });

  // Skip meta/import tags that aren't useful as filters
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

/** Check whether a workout matches the active filter */
function workoutMatchesFilter(w: Workout, filter: string): boolean {
  if (filter === "all") return true;
  const lowerFilter = filter.toLowerCase();

  // Match against category
  if ((w.category ?? "").toLowerCase() === lowerFilter) return true;

  // Match against tags
  if ((w.tags ?? []).some((t) => t.toLowerCase() === lowerFilter)) return true;

  return false;
}

/** Format a tag/category label nicely */
function formatLabel(label: string): string {
  return label
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

/** Pick a colour for a tag chip */
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

// ── Component ──────────────────────────────────────────────────────────────────

export default function WorkoutLibrary({ navigation }: Props) {
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchVisible, setSearchVisible] = useState(false);
  const searchAnim = useRef(new Animated.Value(0)).current;
  const fabScale = useRef(new Animated.Value(1)).current; // for FAB press animation
  const { theme, colors } = useTheme();

  // ── Data loading ─────────────────────────────────────────────────────────────

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
    } catch (err) {
      Alert.alert("Error", "An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────

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
                const { error } = await softDeleteWorkout(user.id, id, workoutToDelete);
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

  // ── Search toggle ─────────────────────────────────────────────────────────────

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

  // ── Derived data ──────────────────────────────────────────────────────────────

  const filterOptions = useMemo(() => buildFilterOptions(workouts), [workouts]);

  const filteredWorkouts = useMemo(() => {
    let list = workouts;

    // 1. apply category/tag filter
    if (activeFilter !== "all") {
      list = list.filter((w) => workoutMatchesFilter(w, activeFilter));
    }

    // 2. apply search
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((w) => {
        const inTitle = w.title.toLowerCase().includes(q);
        const inTags = (w.tags ?? []).some((t) => t.toLowerCase().includes(q));
        const inCategory = (w.category ?? "").toLowerCase().includes(q);
        return inTitle || inTags || inCategory;
      });
    }

    return list;
  }, [workouts, activeFilter, searchQuery]);

  const searchBarHeight = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 52],
  });

  const searchBarOpacity = searchAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // ── Loading state ─────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading workouts…
        </Text>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <View style={[styles.header, { backgroundColor: colors.card }]}>
        <View style={styles.headerTop}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>
              Workout Library
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {filteredWorkouts.length}{" "}
              {filteredWorkouts.length === 1 ? "workout" : "workouts"}
              {searchQuery || activeFilter !== "all" ? " found" : " total"}
            </Text>
          </View>

          <View style={styles.headerActions}>
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
              accessibilityRole="button"
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
              placeholder="Search by name or tag…"
              placeholderTextColor={colors.textTertiary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCapitalize="none"
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery("")} activeOpacity={0.6}>
                <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>

        {/* ── Filter pills ─────────────────────────────────────────────────── */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.filterScrollView}
          contentContainerStyle={styles.filterContainer}
        >
          {/* "All" pill */}
          <TouchableOpacity
            style={[
              styles.filterPill,
              {
                backgroundColor: activeFilter === "all" ? colors.primary : "transparent",
                borderColor: activeFilter === "all" ? colors.primary : colors.border,
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

          {/* Dynamic tag/category pills */}
          {filterOptions.map((tag) => {
            const isActive = activeFilter === tag;
            const count = workouts.filter((w) => workoutMatchesFilter(w, tag)).length;
            return (
              <TouchableOpacity
                key={tag}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: isActive
                      ? tagColor(tag) + (theme === "dark" ? "30" : "18")
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

      {/* ── Workout cards ────────────────────────────────────────────────────── */}
      <FlatList
        data={filteredWorkouts}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <WorkoutCard
            workout={item}
            colors={colors}
            theme={theme}
            onPress={() =>
              navigation.navigate("WorkoutDetails", { workoutId: item.id })
            }
            onDelete={() => handleDelete(item.id)}
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

      {/* ── FAB ──────────────────────────────────────────────────────────────── */}
      <Animated.View style={{ transform: [{ scale: fabScale }] }}>
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: colors.primary }]}
          onPressIn={() => Animated.spring(fabScale, { toValue: 0.92, useNativeDriver: true }).start()}
          onPressOut={() => Animated.spring(fabScale, { toValue: 1, useNativeDriver: true }).start()}
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
  workout: Workout;
  colors: any;
  theme: string;
  onPress: () => void;
  onDelete: () => void;
}

function WorkoutCard({ workout, colors, theme, onPress, onDelete }: CardProps) {
  const isDark = theme === "dark";

  // Visible tags: skip meta tags, dedupe with category
  const visibleTags = [
    ...(workout.category ? [workout.category] : []),
    ...(workout.tags ?? []).filter(
      (t) =>
        !["transcript-import", "youtube-import", "timed", "reps-based", "manual", "general"].includes(
          t.toLowerCase()
        ) && t.toLowerCase() !== (workout.category ?? "").toLowerCase()
    ),
  ].slice(0, 4); // cap at 4 chips

  const exerciseCount = workout.exercises?.length ?? 0;
  const hasTimer = workout.exercises?.some((e) => e.duration);

  return (
    <TouchableOpacity
      style={[styles.card, { backgroundColor: colors.card }]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityLabel={`${workout.title} workout`}
      accessibilityRole="button"
    >
      {/* Top row: type icon + title + delete */}
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

        <Text
          style={[styles.cardTitle, { color: colors.text }]}
          numberOfLines={2}
        >
          {workout.title}
        </Text>

        <TouchableOpacity
          onPress={onDelete}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          style={[styles.deleteBtn, { backgroundColor: isDark ? colors.surface : "#FEF2F2" }]}
          activeOpacity={0.6}
        >
          <Ionicons name="trash-outline" size={16} color="#EF4444" />
        </TouchableOpacity>
      </View>

      {/* Tag chips */}
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

      {/* Footer: meta + date */}
      <View style={[styles.cardFooter, { borderTopColor: colors.divider }]}>
        <View style={styles.metaRow}>
          <Ionicons name="list-outline" size={13} color={colors.textTertiary} />
          <Text style={[styles.metaText, { color: colors.textTertiary }]}>
            {exerciseCount} {exerciseCount === 1 ? "exercise" : "exercises"}
          </Text>

          {hasTimer && (
            <>
              <View style={[styles.metaDot, { backgroundColor: colors.textTertiary }]} />
              <Ionicons name="time-outline" size={13} color={colors.textTertiary} />
              <Text style={[styles.metaText, { color: colors.textTertiary }]}>
                Timed
              </Text>
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
  const hasFilter = filter !== "all" || query.length > 0;
  return (
    <View style={styles.emptyContainer}>
      <Ionicons
        name={hasFilter ? "search-outline" : "barbell-outline"}
        size={64}
        color={colors.textTertiary}
      />
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {hasFilter ? "No matching workouts" : "No workouts yet"}
      </Text>
      <Text style={[styles.emptySubtext, { color: colors.textTertiary }]}>
        {hasFilter
          ? "Try a different search or filter"
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

  // Header
  header: {
    paddingTop: 60,
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
  subtitle: { fontSize: 14, marginTop: 4 },
  headerActions: { flexDirection: "row", gap: 8 },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },

  // Search bar
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

  // Filters
  filterScrollView: { paddingHorizontal: 16 },
  filterContainer: { gap: 8, paddingRight: 16, paddingBottom: 2 },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 24,
    borderWidth: 1,
  },
  filterText: { fontSize: 14, fontWeight: "600" },

  // List
  listContent: { padding: 16, paddingBottom: 120 },

  // Card
  card: {
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  typeIconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    marginTop: 1,
  },
  cardTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 22,
  },
  deleteBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },

  // Tags
  tagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  tagChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "500",
  },

  // Card footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 10,
    borderTopWidth: 1,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: { fontSize: 12 },
  metaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    marginHorizontal: 2,
  },
  dateText: { fontSize: 12 },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingTop: 100,
    paddingHorizontal: 40,
    gap: 16,
  },
  emptyText: { fontSize: 20, fontWeight: "700", marginTop: 8 },
  emptySubtext: { fontSize: 15, textAlign: "center", lineHeight: 22, opacity: 0.8 },
  clearBtn: {
    marginTop: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 30,
  },
  clearBtnText: { fontSize: 16, fontWeight: "600" },

  // FAB
  fab: {
    position: "absolute",
    right: 20,
    bottom: 120,
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