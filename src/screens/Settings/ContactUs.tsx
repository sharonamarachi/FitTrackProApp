import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import Header from "../../components/Header";
import { useTheme } from "../../context/ThemeContext";
import { supabase } from "../../api/supabaseClient";

// ─── Subject categories derived from FitTrack Pro's core features ───────────
const SUBJECT_OPTIONS = [
  { label: "🐛  Bug Report", value: "bug_report" },
  { label: "💡  Feature Request", value: "feature_request" },
  { label: "⏱️  Timer / Audio Issue", value: "timer_issue" },
  { label: "▶️  YouTube Integration", value: "youtube_issue" },
  { label: "📊  Progress Tracking", value: "progress_tracking" },
  { label: "🔒  Privacy / Account", value: "privacy_account" },
  { label: "💬  General Enquiry", value: "general" },
];

const MAX_MESSAGE_LENGTH = 500;

// ─── Tiny reusable validation helpers ────────────────────────────────────────
const isValidEmail = (email: string) =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

export default function ContactUs() {
  const { colors } = useTheme();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = "Name is required.";
    if (!email.trim()) newErrors.email = "Email is required.";
    else if (!isValidEmail(email))
      newErrors.email = "Enter a valid email address.";
    if (!subject) newErrors.subject = "Please select a subject.";
    if (!message.trim()) newErrors.message = "Message cannot be empty.";
    else if (message.trim().length < 10)
      newErrors.message = "Message must be at least 10 characters.";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!validate()) return;
    setLoading(true);

    try {
      const { error } = await supabase.from("contact_messages").insert([
        {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          subject,
          message: message.trim(),
          created_at: new Date().toISOString(),
        },
      ]);

      if (error) {
        Alert.alert("Error", "Failed to send your message. Please try again.");
      } else {
        setSent(true);
        setName("");
        setEmail("");
        setSubject("");
        setMessage("");
        setErrors({});
      }
    } catch {
      Alert.alert("Error", "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => setSent(false);

  // ── Success state ───────────────────────────────────────────────────────────
  if (sent) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Header title="Contact Us" />
        <View style={styles.successWrapper}>
          <View
            style={[
              styles.successIcon,
              { backgroundColor: colors.primary + "22" },
            ]}
          >
            <Text style={styles.successEmoji}>✅</Text>
          </View>
          <Text style={[styles.successTitle, { color: colors.text }]}>
            Message Sent!
          </Text>
          <Text style={[styles.successBody, { color: colors.textSecondary }]}>
            Thanks for reaching out. We typically respond within 1–2 business
            days.
          </Text>
          <TouchableOpacity
            style={[styles.button, { backgroundColor: colors.primary }]}
            onPress={handleReset}
          >
            <Text style={styles.buttonText}>Send Another Message</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── Main form ───────────────────────────────────────────────────────────────
  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Header title="Contact Us" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Intro banner ───────────────────────────────────────────────── */}
        <View
          style={[
            styles.banner,
            {
              backgroundColor: colors.primary + "15",
              borderColor: colors.primary + "40",
            },
          ]}
        >
          <Text style={[styles.bannerTitle, { color: colors.primary }]}>
            We'd love to hear from you 👋
          </Text>
          <Text style={[styles.bannerBody, { color: colors.textSecondary }]}>
            Whether it's a bug, a feature idea, or a general question about
            FitTrack Pro — fill in the form below and we'll get back to you.
          </Text>
        </View>

        {/* ── Name ───────────────────────────────────────────────────────── */}
        <Field label="Full Name" error={errors.name}>
          <TextInput
            style={[styles.input, inputStyle(colors, !!errors.name)]}
            placeholder="e.g. Jane Doe"
            placeholderTextColor={colors.textSecondary}
            value={name}
            onChangeText={(v) => {
              setName(v);
              setErrors((e) => ({ ...e, name: "" }));
            }}
            returnKeyType="next"
            autoCapitalize="words"
          />
        </Field>

        {/* ── Email ──────────────────────────────────────────────────────── */}
        <Field label="Email Address" error={errors.email}>
          <TextInput
            style={[styles.input, inputStyle(colors, !!errors.email)]}
            placeholder="e.g. janedoe@example.com"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              setErrors((e) => ({ ...e, email: "" }));
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="next"
          />
        </Field>

        {/* ── Subject picker ─────────────────────────────────────────────── */}
        <Field label="Subject" error={errors.subject}>
          <View style={styles.subjectGrid}>
            {SUBJECT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[
                  styles.subjectChip,
                  {
                    backgroundColor:
                      subject === opt.value ? colors.primary : colors.card,
                    borderColor:
                      subject === opt.value
                        ? colors.primary
                        : errors.subject
                          ? "#EF4444"
                          : colors.border,
                  },
                ]}
                onPress={() => {
                  setSubject(opt.value);
                  setErrors((e) => ({ ...e, subject: "" }));
                }}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.subjectChipText,
                    { color: subject === opt.value ? "#fff" : colors.text },
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Field>

        {/* ── Message ────────────────────────────────────────────────────── */}
        <Field
          label="Message"
          error={errors.message}
          hint={`${message.length} / ${MAX_MESSAGE_LENGTH}`}
        >
          <TextInput
            style={[styles.textArea, inputStyle(colors, !!errors.message)]}
            placeholder="Describe your issue or request in detail…"
            placeholderTextColor={colors.textSecondary}
            value={message}
            onChangeText={(v) => {
              if (v.length <= MAX_MESSAGE_LENGTH) {
                setMessage(v);
                setErrors((e) => ({ ...e, message: "" }));
              }
            }}
            multiline
            numberOfLines={6}
            textAlignVertical="top"
          />
        </Field>

        {/* ── GDPR privacy note (from ethics/privacy section of report) ─── */}
        <View
          style={[
            styles.privacyNote,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <Text style={[styles.privacyText, { color: colors.textSecondary }]}>
            🔒 Your information is used solely to respond to your message and is
            handled in accordance with our Privacy Policy and GDPR requirements.
            We do not share your data with third parties.
          </Text>
        </View>

        {/* ── Submit ─────────────────────────────────────────────────────── */}
        <TouchableOpacity
          style={[
            styles.button,
            {
              backgroundColor: loading ? colors.primary + "88" : colors.primary,
            },
          ]}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {loading ? "⏳  Sending…" : "📨  Send Message"}
          </Text>
        </TouchableOpacity>

        {/* ── Divider ────────────────────────────────────────────────────── */}
        <View style={[styles.dividerRow]}>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <Text style={[styles.dividerLabel, { color: colors.textSecondary }]}>
            or reach us directly
          </Text>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
        </View>

        {/* ── Direct contact cards ───────────────────────────────────────── */}
        <DirectCard
          icon="👩‍🏫"
          title="Primary Supervisor"
          name="Dr. Fazilat Hojaji"
          detail="University of Limerick"
          colors={colors}
        />
        <DirectCard
          icon="👨‍🏫"
          title="Secondary Supervisor"
          name="Dr. Patrick Denny"
          detail="University of Limerick"
          colors={colors}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ─── Helper: input border style based on error state ─────────────────────────
const inputStyle = (colors: any, hasError: boolean) => ({
  backgroundColor: colors.card,
  color: colors.text,
  borderColor: hasError ? "#EF4444" : colors.border,
});

// ─── Reusable field wrapper ───────────────────────────────────────────────────
function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  const { colors } = useTheme();
  return (
    <View style={{ marginTop: 18 }}>
      <View style={styles.fieldHeader}>
        <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
        {hint && (
          <Text style={[styles.hint, { color: colors.textSecondary }]}>
            {hint}
          </Text>
        )}
      </View>
      {children}
      {error ? <Text style={styles.errorText}>⚠️ {error}</Text> : null}
    </View>
  );
}

// ─── Direct contact card ──────────────────────────────────────────────────────
function DirectCard({
  icon,
  title,
  name,
  detail,
  colors,
}: {
  icon: string;
  title: string;
  name: string;
  detail: string;
  colors: any;
}) {
  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: colors.border },
      ]}
    >
      <Text style={styles.cardIcon}>{icon}</Text>
      <View>
        <Text style={[styles.cardTitle, { color: colors.textSecondary }]}>
          {title}
        </Text>
        <Text style={[styles.cardName, { color: colors.text }]}>{name}</Text>
        <Text style={[styles.cardDetail, { color: colors.textSecondary }]}>
          {detail}
        </Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20 },

  // Banner
  banner: { borderRadius: 14, borderWidth: 1, padding: 16, marginBottom: 4 },
  bannerTitle: { fontSize: 15, fontWeight: "700", marginBottom: 4 },
  bannerBody: { fontSize: 13, lineHeight: 19 },

  // Field
  fieldHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  label: { fontSize: 13, fontWeight: "600" },
  hint: { fontSize: 11 },
  errorText: { fontSize: 12, color: "#EF4444", marginTop: 4 },

  // Inputs
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 130,
  },

  // Subject chips
  subjectGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  subjectChip: {
    borderWidth: 1.5,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  subjectChipText: { fontSize: 12, fontWeight: "500" },

  // Privacy note
  privacyNote: { borderRadius: 10, borderWidth: 1, padding: 12, marginTop: 18 },
  privacyText: { fontSize: 12, lineHeight: 18 },

  // Button
  button: {
    marginTop: 20,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: 0.3,
    paddingHorizontal: 20,
  },

  // Divider
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
    gap: 10,
  },
  divider: { flex: 1, height: 1 },
  dividerLabel: { fontSize: 12, fontWeight: "500" },

  // Direct contact cards
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
  },
  cardIcon: { fontSize: 28 },
  cardTitle: { fontSize: 11, fontWeight: "500", marginBottom: 2 },
  cardName: { fontSize: 14, fontWeight: "700" },
  cardDetail: { fontSize: 12, marginTop: 1 },

  // Success
  successWrapper: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
  },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  successEmoji: { fontSize: 36 },
  successTitle: { fontSize: 22, fontWeight: "700", marginBottom: 10 },
  successBody: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 30,
  },
});
