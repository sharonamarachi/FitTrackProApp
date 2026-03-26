import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Modal,
  TouchableWithoutFeedback,
  Alert,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { supabase } from "../../api/supabaseClient";
import { useTheme } from "../../context/ThemeContext";
import Header from "../../components/Header";

interface Profile {
  username: string;
  bio: string;
  gender: string;
}

const genderOptions = ["Man", "Woman", "Prefer not to say"];

export default function EditProfile({ navigation }: any) {
  const { colors, theme } = useTheme();
  const isDark = theme === "dark";

  const [profile, setProfile] = useState<Profile>({
    username: "",
    bio: "",
    gender: "",
  });
  const [weightInput, setWeightInput] = useState("");
  const [birthday, setBirthday] = useState<Date | null>(null);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<
    Partial<Record<keyof Profile | "weight" | "date_of_birth", string>>
  >({});
  const [showGenderModal, setShowGenderModal] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) return;
      const { data, error } = await supabase
        .from("user_profiles")
        .select("*")
        .eq("user_id", userId)
        .single();
      if (error) throw error;
      if (data) {
        setProfile({
          username: data.username || "",
          bio: data.bio || "",
          gender: data.gender || "",
        });
        setWeightInput(data.weight?.toString() || "");
        setBirthday(data.date_of_birth ? new Date(data.date_of_birth) : null);
      }
    } catch {
      Alert.alert("Error", "Failed to load profile.");
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = (field: keyof Profile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
    validateField(field, value);
  };

  const handleWeightChange = (value: string) => {
    const filtered = value.replace(/[^0-9.]/g, "");
    setWeightInput(filtered);
    validateField("weight", filtered);
  };

  const validateField = (
    field: keyof Profile | "weight" | "date_of_birth",
    value: string | Date | null,
  ) => {
    const next = { ...errors };
    if (field === "username") {
      const v = value as string;
      if (!v || v.length < 2) next.username = "At least 2 characters required";
      else if (v.length > 30) next.username = "Maximum 30 characters";
      else if (!/^[a-zA-Z0-9._-]+$/.test(v))
        next.username = "Letters, numbers, dots, dashes, underscores only";
      else delete next.username;
    }
    if (field === "bio") {
      const v = value as string;
      if (v && v.length > 500) next.bio = "Maximum 500 characters";
      else delete next.bio;
    }
    if (field === "weight") {
      const v = parseFloat(value as string);
      if (value && (isNaN(v) || v <= 0 || v > 1000))
        next.weight = "Enter a valid weight (1–1000 kg)";
      else delete next.weight;
    }
    if (field === "date_of_birth") {
      const v = value as Date;
      if (v) {
        const age = new Date().getFullYear() - v.getFullYear();
        if (age < 13) next.date_of_birth = "Must be at least 13 years old";
        else if (age > 120)
          next.date_of_birth = "Please enter a valid birth date";
        else delete next.date_of_birth;
      }
    }
    setErrors(next);
  };

  const validate = () => {
    validateField("username", profile.username);
    validateField("bio", profile.bio);
    validateField("weight", weightInput);
    if (birthday) validateField("date_of_birth", birthday);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) {
      Alert.alert("Validation Error", "Please fix the errors before saving.");
      return;
    }
    setLoading(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;
      if (!userId) throw new Error("Not found");
      const newWeight = weightInput ? parseFloat(weightInput) : null;

      const { error: profileError } = await supabase
        .from("user_profiles")
        .update({
          username: profile.username.trim(),
          updated_at: new Date().toISOString(),
          bio: profile.bio.trim(),
          gender: profile.gender || null,
          weight: newWeight,
          date_of_birth: birthday ? birthday.toISOString().split("T")[0] : null,
        })
        .eq("user_id", userId);

      if (profileError) {
        if (
          profileError.code === "42703" ||
          profileError.message?.includes("column")
        ) {
          await supabase
            .from("user_profiles")
            .update({
              username: profile.username.trim(),
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        } else throw profileError;
      }

      if (newWeight && !isNaN(newWeight)) {
        await supabase.from("body_measurements").insert({
          user_id: userId,
          weight_kg: newWeight,
          recorded_at: new Date().toISOString(),
        });
      }
      Alert.alert("Saved", "Profile updated successfully");
      navigation.goBack();
    } catch {
      Alert.alert("Error", "Failed to update profile.");
    } finally {
      setLoading(false);
    }
  };

  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === "ios");
    if (selectedDate) {
      setBirthday(selectedDate);
      validateField("date_of_birth", selectedDate);
    }
  };

  // ── Icon box background: higher opacity in dark mode so it's visible ──────
  const iconBoxBg = isDark ? colors.primary + "50" : colors.primary + "20";

  // ── Runtime theme styles ──────────────────────────────────────────────────
  const d = {
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },

    // ── Avatar card ────────────────────────────────────────────────────────
    avatarCard: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 0.5,
      borderColor: colors.border,
      padding: 24,
      alignItems: "center" as const,
      gap: 8,
    },
    avatarRing: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: colors.surface,
      borderWidth: 2.5,
      borderColor: colors.primary,
      alignItems: "center" as const,
      justifyContent: "center" as const,
    },
    editBadge: {
      position: "absolute" as const,
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      width: 28,
      height: 28,
      borderRadius: 14,
      justifyContent: "center" as const,
      alignItems: "center" as const,
      borderWidth: 2.5,
      borderColor: colors.card,
    },

    // ── Section label ──────────────────────────────────────────────────────
    sectionLabel: {
      fontSize: 13,
      fontWeight: "600" as const,
      color: colors.textSecondary,
      letterSpacing: 0.3,
      paddingHorizontal: 4,
      marginBottom: 8,
      marginTop: 22,
    },

    // ── Field card ─────────────────────────────────────────────────────────
    card: {
      backgroundColor: colors.card,
      borderRadius: 20,
      borderWidth: 0.5,
      borderColor: colors.border,
      overflow: "hidden" as const,
    },

    // ── Row with bottom divider ────────────────────────────────────────────
    row: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 15,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.divider,
    },
    // ── Last row in a card — no divider ────────────────────────────────────
    rowLast: {
      flexDirection: "row" as const,
      alignItems: "center" as const,
      gap: 14,
      paddingHorizontal: 16,
      paddingVertical: 15,
    },

    // ── Icon box: readable in both light and dark ──────────────────────────
    iconBox: {
      width: 38,
      height: 38,
      borderRadius: 11,
      backgroundColor: iconBoxBg,
      alignItems: "center" as const,
      justifyContent: "center" as const,
      flexShrink: 0,
    },

    // ── Text styles ────────────────────────────────────────────────────────
    fl: { fontSize: 12, color: colors.textSecondary, marginBottom: 4 },
    fv: { fontSize: 17, fontWeight: "500" as const, color: colors.text },
    ph: {
      fontSize: 17,
      color: colors.textTertiary,
      fontWeight: "400" as const,
    },
    input: {
      fontSize: 17,
      fontWeight: "500" as const,
      color: colors.text,
      flex: 1,
      paddingVertical: 0,
    },
    charCount: { fontSize: 13, color: colors.textTertiary },
    errorText: { color: colors.error, fontSize: 13, marginTop: 5 },
    weightHint: {
      fontSize: 13,
      color: colors.textTertiary,
      fontStyle: "italic" as const,
      marginTop: 5,
    },

    // ── Update badge (weight row) ──────────────────────────────────────────
    updateBadge: {
      backgroundColor: isDark ? colors.success + "40" : colors.success + "18",
      borderWidth: 0.5,
      borderColor: colors.success + "60",
      borderRadius: 10,
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    // ── Bottom save button ─────────────────────────────────────────────────
    saveBottom: {
      backgroundColor: colors.primary,
      borderRadius: 16,
      padding: 18,
      alignItems: "center" as const,
      marginTop: 10,
    },

    // ── Gender modal ───────────────────────────────────────────────────────
    modalBg: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.45)",
      justifyContent: "flex-end" as const,
    },
    modalSheet: {
      backgroundColor: colors.card,
      borderTopLeftRadius: 28,
      borderTopRightRadius: 28,
      padding: 24,
      maxHeight: "55%" as any,
    },
    handle: {
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      alignSelf: "center" as const,
      marginBottom: 20,
    },
    modalTitle: {
      fontSize: 19,
      fontWeight: "700" as const,
      color: colors.text,
    },
    optionRow: {
      flexDirection: "row" as const,
      justifyContent: "space-between" as const,
      alignItems: "center" as const,
      paddingVertical: 17,
      borderBottomWidth: 0.5,
      borderBottomColor: colors.divider,
    },
    optionText: { fontSize: 17, color: colors.text },
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <View style={d.screen}>
        {/* ── Header ───────────────────────────────────────────────────── */}
        <Header
          title="Edit Profile"
          subtitle="Update your personal details"
          rightAction={{
            icon: loading ? "hourglass-outline" : "checkmark",
            onPress: handleSave,
          }}
        />

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Avatar card ────────────────────────────────────────────── */}
          <View style={d.avatarCard}>
            <View style={{ position: "relative" }}>
              <View style={d.avatarRing}>
                <Ionicons name="person" size={42} color={colors.textTertiary} />
              </View>
              <View style={d.editBadge}>
                <Ionicons name="camera" size={14} color="#fff" />
              </View>
            </View>
            <Text
              style={{
                fontSize: 22,
                fontWeight: "700",
                color: colors.text,
                letterSpacing: -0.3,
              }}
            >
              {profile.username || "Your name"}
            </Text>
            <Text style={{ fontSize: 15, color: colors.textSecondary }}>
              Tap a field below to update
            </Text>
          </View>

          {/* ════════════════════════════════════════════════════════════════
              IDENTITY — Username + Bio
          ════════════════════════════════════════════════════════════════ */}
          <Text style={d.sectionLabel}>Identity</Text>
          <View style={d.card}>
            {/* Username */}
            <View style={d.row}>
              <View style={d.iconBox}>
                <Ionicons
                  name="person-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.fl}>Username *</Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 8 }}
                >
                  <TextInput
                    style={d.input}
                    value={profile.username}
                    onChangeText={(v) => updateProfile("username", v)}
                    autoCapitalize="none"
                    maxLength={30}
                    placeholderTextColor={colors.textTertiary}
                    placeholder="Enter username"
                  />
                  <Text style={d.charCount}>{profile.username.length}/30</Text>
                </View>
                {errors.username ? (
                  <Text style={d.errorText}>{errors.username}</Text>
                ) : null}
              </View>
            </View>

            {/* Bio */}
            <View style={d.rowLast}>
              <View style={d.iconBox}>
                <Ionicons
                  name="document-text-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.fl}>Bio</Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "flex-start",
                    gap: 8,
                  }}
                >
                  <TextInput
                    style={[d.input, { paddingTop: 2 }]}
                    value={profile.bio}
                    onChangeText={(v) => updateProfile("bio", v)}
                    multiline
                    maxLength={500}
                    placeholderTextColor={colors.textTertiary}
                    placeholder="Tell us about yourself…"
                    numberOfLines={2}
                  />
                  <Text style={[d.charCount, { paddingTop: 2 }]}>
                    {profile.bio.length}/500
                  </Text>
                </View>
                {errors.bio ? (
                  <Text style={d.errorText}>{errors.bio}</Text>
                ) : null}
              </View>
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════════════
              PERSONAL — Date of birth (own row) + Gender (own row)
          ════════════════════════════════════════════════════════════════ */}
          <Text style={d.sectionLabel}>Personal</Text>
          <View style={d.card}>
            {/* Date of birth */}
            <View style={d.row}>
              <View style={d.iconBox}>
                <Ionicons
                  name="calendar-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1}}>
                <Text style={d.fl}>Date of birth</Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker((v) => !v)}
                  activeOpacity={0.7}
                >
                  <Text style={birthday ? d.fv : d.ph}>
                    {birthday
                      ? birthday.toLocaleDateString("en", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "Not set — tap to add"}
                  </Text>
                </TouchableOpacity>
                {errors.date_of_birth ? (
                  <Text style={d.errorText}>{errors.date_of_birth}</Text>
                ) : null}
                {showDatePicker && (
                  <DateTimePicker
                    value={birthday || new Date(2000, 0, 1)}
                    mode="date"
                    display={Platform.OS === "ios" ? "spinner" : "default"}
                    maximumDate={new Date()}
                    onChange={handleDateChange}
                    themeVariant={isDark ? "dark" : "light"} // ← add this
                    style={{ marginTop: 8 }}
                  />
                )}
              </View>
              <TouchableOpacity
                onPress={() => setShowDatePicker((v) => !v)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name={showDatePicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>

            {/* Gender */}
            <View style={d.rowLast}>
              <View style={d.iconBox}>
                <Ionicons
                  name="people-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.fl}>Gender</Text>
                <TouchableOpacity
                  onPress={() => setShowGenderModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={profile.gender ? d.fv : d.ph}>
                    {profile.gender || "Not set — tap to select"}
                  </Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setShowGenderModal(true)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textTertiary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* ════════════════════════════════════════════════════════════════
              BODY METRICS — Weight
          ════════════════════════════════════════════════════════════════ */}
          <Text style={d.sectionLabel}>Body metrics</Text>
          <View style={d.card}>
            <View style={d.rowLast}>
              <View style={d.iconBox}>
                <Ionicons
                  name="fitness-outline"
                  size={20}
                  color={colors.primary}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={d.fl}>Weight (kg)</Text>
                <TextInput
                  style={d.input}
                  value={weightInput}
                  onChangeText={handleWeightChange}
                  keyboardType="decimal-pad"
                  placeholderTextColor={colors.textTertiary}
                  placeholder="e.g. 72.5"
                />
                {errors.weight ? (
                  <Text style={d.errorText}>{errors.weight}</Text>
                ) : (
                  <Text style={d.weightHint}>
                    Each save records a new entry in your weight chart.
                  </Text>
                )}
              </View>
              {weightInput ? (
                <View style={d.updateBadge}>
                  <Text
                    style={{
                      fontSize: 14,
                      color: colors.success,
                      fontWeight: "500",
                    }}
                  >
                    Update
                  </Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* ── Save button ───────────────────────────────────────────────── */}
          <TouchableOpacity
            style={d.saveBottom}
            onPress={handleSave}
            disabled={loading}
            activeOpacity={0.85}
          >
            <Text style={styles.saveBtnText}>
              {loading ? "Saving…" : "Save changes"}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── Gender bottom sheet ───────────────────────────────────────── */}
        <Modal visible={showGenderModal} transparent animationType="slide">
          <TouchableWithoutFeedback onPress={() => setShowGenderModal(false)}>
            <View style={d.modalBg}>
              <TouchableWithoutFeedback>
                <View style={d.modalSheet}>
                  <View style={d.handle} />
                  <View style={styles.modalHeader}>
                    <Text style={d.modalTitle}>Select gender</Text>
                    <TouchableOpacity onPress={() => setShowGenderModal(false)}>
                      <Ionicons
                        name="close"
                        size={24}
                        color={colors.textSecondary}
                      />
                    </TouchableOpacity>
                  </View>
                  {genderOptions.map((option) => (
                    <TouchableOpacity
                      key={option}
                      style={d.optionRow}
                      onPress={() => {
                        updateProfile("gender", option);
                        setShowGenderModal(false);
                      }}
                    >
                      <Text style={d.optionText}>{option}</Text>
                      {profile.gender === option ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color={colors.primary}
                        />
                      ) : (
                        <Ionicons
                          name="ellipse-outline"
                          size={22}
                          color={colors.textTertiary}
                        />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </KeyboardAvoidingView>
  );
}

// ── Static styles (no runtime color values) ───────────────────────────────────
const styles = StyleSheet.create({
  scrollContent: {
    padding: 16,
    paddingBottom: 50,
  },
  saveBtnText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 0.2,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 14,
  },
});
