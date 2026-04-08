import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from "react-native";
import { useEffect, useState, useCallback } from "react";
import { useFocusEffect } from "@react-navigation/native";
import { supabase } from "../../api/supabaseClient";
import { User } from "@supabase/supabase-js";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../../context/ThemeContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function Profile({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState("");
  const [workoutCount, setWorkoutCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const { theme, colors } = useTheme();
  const insets = useSafeAreaInsets();

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [])
  );

  async function loadProfile() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUser(user);

    // Get username from user_profiles
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("username")
      .eq("user_id", user.id)
      .single();

    setUsername(profile?.username || user.email?.split("@")[0] || "");

    // Real workout count
    const { count } = await supabase
      .from("workouts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    setWorkoutCount(count ?? 0);

    // Current streak from logs
    const { data: logs } = await supabase
      .from("workout_logs")
      .select("completed_at")
      .eq("user_id", user.id)
      .order("completed_at", { ascending: false });

    setStreak(calcStreak(logs ?? []));
  }

  function calcStreak(logs: { completed_at: string }[]): number {
    if (!logs.length) return 0;
    const days = [...new Set(logs.map((l) => new Date(l.completed_at).toDateString()))]
      .map((d) => new Date(d))
      .sort((a, b) => b.getTime() - a.getTime());

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const first = new Date(days[0]);
    first.setHours(0, 0, 0, 0);
    if ((today.getTime() - first.getTime()) / 86400000 > 1) return 0;

    let count = 1;
    for (let i = 1; i < days.length; i++) {
      const prev = new Date(days[i - 1]); prev.setHours(0, 0, 0, 0);
      const cur  = new Date(days[i]);     cur.setHours(0, 0, 0, 0);
      if (Math.floor((prev.getTime() - cur.getTime()) / 86400000) === 1) {
        count++;
      } else break;
    }
    return count;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === "dark" ? "light-content" : "dark-content"} />

      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.primary, paddingTop: insets.top + 20 }]}>
          <View style={[styles.avatar, { backgroundColor: theme === "dark" ? colors.primaryLight : "#6c63ff" }]}>
            <Ionicons name="person" size={50} color="white" />
          </View>
          <Text style={styles.username}>{username || "Username"}</Text>
          <Text style={styles.memberSince}>
            Member since{" "}
            {user ? new Date(user.created_at).toLocaleDateString() : "..."}
          </Text>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{workoutCount}</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Workouts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>
              {streak > 0 ? `${streak} 🔥` : "0"}
            </Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <ActionButton
            label="Edit Profile"
            icon="person-outline"
            onPress={() => navigation.navigate("EditProfile")}
            colors={colors}
          />
          <ActionButton
            label="Recently Deleted"
            icon="trash-outline"
            onPress={() => navigation.navigate("RecentlyDeleted")}
            colors={colors}
          />
          <ActionButton
            label="Settings"
            icon="settings-outline"
            onPress={() => navigation.navigate("SettingsStack")}
            colors={colors}
          />
          <ActionButton
            label="Logout"
            icon="log-out-outline"
            danger
            onPress={async () => {
              await supabase.auth.signOut();
              navigation.replace("Login");
            }}
            colors={colors}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const ActionButton = ({ label, icon, onPress, danger, colors }: any) => (
  <TouchableOpacity
    style={[
      styles.actionButton,
      { backgroundColor: colors.card, borderColor: colors.border },
      danger && { borderColor: colors.error },
    ]}
    onPress={onPress}
  >
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? colors.error : colors.primary}
        style={{ marginRight: 10 }}
      />
      <Text style={[styles.actionText, { color: colors.text }, danger && { color: colors.error }]}>
        {label}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: "center",
    paddingBottom: 40,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  username: { fontSize: 22, fontWeight: "700", color: "white" },
  memberSince: { fontSize: 14, color: "rgba(255,255,255,0.8)", marginTop: 4 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    marginTop: -20,
    marginBottom: 30,
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: { alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "bold" },
  statLabel: { fontSize: 13, marginTop: 4 },
  actions: { marginTop: 10, paddingHorizontal: 20 },
  actionButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    marginVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  actionText: { fontSize: 16, fontWeight: "500" },
});