import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../../api/supabaseClient";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import Header from "../../components/Header";
import { useTheme } from "../../context/ThemeContext";

export default function Settings({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const { mode, toggleDarkMode, colors } = useTheme();
  const isDark = mode === "dark";

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  const handleDeleteUser = async () => {
    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const userId = user?.id;
            if (!userId) return;
            const { error } = await supabase.auth.admin.deleteUser(userId);
            if (error) {
              Alert.alert("Error", error.message);
            } else {
              Alert.alert("Account Deleted", "Your account has been removed.");
              navigation.replace("Login");
            }
          },
        },
      ],
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Settings" />

      <ScrollView
        contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
        style={{ backgroundColor: colors.background }}
      >
        {/* ── Account ─────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Account
        </Text>
        <SettingItem
          label="Email"
          value={user?.email}
          icon="mail-outline"
          colors={colors}
        />
        <SettingItem
          label="Edit Profile"
          icon="person-circle-outline"
          onPress={() => navigation.navigate("EditProfile")}
          colors={colors}
        />

        {/* ── Appearance ──────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Appearance
        </Text>

        {/* Dark mode quick toggle — kept for convenience */}
        <View
          style={[
            styles.item,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              paddingRight: 16,
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
            <Ionicons
              name={isDark ? "moon" : "sunny"}
              size={20}
              color={colors.primary}
              style={{ marginRight: 10 }}
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>
                Dark Mode
              </Text>
              <Text
                style={[styles.itemSubtext, { color: colors.textSecondary }]}
              >
                {isDark ? "Enabled" : "Disabled"}
              </Text>
            </View>
          </View>
          <Switch
            value={isDark}
            onValueChange={toggleDarkMode}
            trackColor={{ false: "#767577", true: colors.primary }}
            thumbColor="#f4f3f4"
          />
        </View>

        {/* ── App ─────────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          App
        </Text>

        {/* Display & Audio → navigates to AppearanceAndPreferences */}
        <SettingItem
          label="Display & Audio"
          sublabel="Themes, dark mode, rest timer, coach voice"
          icon="color-palette-outline"
          onPress={() => navigation.navigate("AppearanceAndPreferences")}
          colors={colors}
        />
        <SettingItem
          label="Notifications"
          icon="notifications-outline"
          onPress={() => navigation.navigate("Notifications")}
          colors={colors}
        />

        {/* ── Legal ───────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Legal
        </Text>
        <SettingItem
          label="Terms of Use"
          icon="document-text-outline"
          colors={colors}
          onPress={() => navigation.navigate("TermsOfUse")}
        />
        <SettingItem
          label="Privacy Policy"
          icon="shield-checkmark-outline"
          colors={colors}
          onPress={() => navigation.navigate("PrivacyPolicy")}
        />

        {/* ── Support ─────────────────────────────────────────────────── */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>
          Support
        </Text>

        <SettingItem
          label="Help & FAQ"
          sublabel="Answers to common questions"
          icon="help-circle-outline"
          colors={colors}
          onPress={() => navigation.navigate("FAQ")}
        />

        <SettingItem
          label="Contact Us"
          icon="help-circle-outline"
          colors={colors}
          onPress={() => navigation.navigate("ContactUs")}
        />

        {/* ── Delete account ───────────────────────────────────────────── */}
        <TouchableOpacity
          style={[styles.deleteButton, { borderColor: colors.error }]}
          onPress={handleDeleteUser}
        >
          <Text style={[styles.deleteText, { color: colors.error }]}>
            Delete Account
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

// ── SettingItem ───────────────────────────────────────────────────────────────

const SettingItem = ({
  label,
  sublabel,
  value,
  icon,
  onPress,
  colors,
}: any) => (
  <TouchableOpacity
    style={[
      styles.item,
      { backgroundColor: colors.card, borderColor: colors.border },
    ]}
    onPress={onPress}
    disabled={!onPress}
    activeOpacity={onPress ? 0.7 : 1}
  >
    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
      {icon && (
        <View
          style={[styles.iconWrap, { backgroundColor: colors.primary + "18" }]}
        >
          <Ionicons name={icon} size={18} color={colors.primary} />
        </View>
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemLabel, { color: colors.text }]}>{label}</Text>
        {sublabel && (
          <Text style={[styles.itemSubtext, { color: colors.textSecondary }]}>
            {sublabel}
          </Text>
        )}
        {value && (
          <Text style={[styles.itemValue, { color: colors.textSecondary }]}>
            {value}
          </Text>
        )}
      </View>
    </View>
    {onPress && (
      <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
    )}
  </TouchableOpacity>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 28,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    borderRadius: 14,
    marginBottom: 8,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    flexShrink: 0,
  },
  itemLabel: { fontSize: 15, fontWeight: "600" },
  itemValue: { fontSize: 13, marginTop: 2 },
  itemSubtext: { fontSize: 12, marginTop: 2 },
  deleteButton: {
    marginTop: 32,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  deleteText: { fontSize: 16, fontWeight: "700" },
});
