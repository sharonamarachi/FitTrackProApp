import React, { useEffect, useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  TouchableOpacity,
  Alert,
  Platform,
  Linking,
  StatusBar,
  Modal,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Header from "../../components/Header";
import { useTheme } from "../../context/ThemeContext";
import {
  requestNotificationPermission,
  getPermissionStatus,
  loadNotificationPrefs,
  saveNotificationPrefs,
  scheduleStreakReminder,
  cancelStreakReminder,
  cancelStreakRiskAlert,
  scheduleStreakRiskAlert,
  cancelAllNotifications,
  sendImmediateNotification,
  DEFAULT_PREFS,
  type NotificationPrefs,
} from "../../services/NotificationService";

// ─── Time picker data ─────────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

function formatHour(h: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:00 ${suffix}`;
}

function formatTime(h: number, m: number): string {
  const suffix = h < 12 ? "AM" : "PM";
  const display = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${display}:${String(m).padStart(2, "0")} ${suffix}`;
}

// ─── Permission banner ────────────────────────────────────────────────────────

function PermissionBanner({
  status,
  onRequest,
  colors,
}: {
  status: "granted" | "denied" | "undetermined";
  onRequest: () => void;
  colors: any;
}) {
  if (status === "granted") return null;

  const isDenied = status === "denied";

  return (
    <TouchableOpacity
      style={[
        styles.permBanner,
        {
          backgroundColor: isDenied ? "#EF444418" : "#F9731618",
          borderColor: isDenied ? "#EF4444" : "#F97316",
        },
      ]}
      onPress={isDenied ? () => Linking.openSettings() : onRequest}
      activeOpacity={0.8}
    >
      <Ionicons
        name={isDenied ? "ban-outline" : "notifications-off-outline"}
        size={20}
        color={isDenied ? "#EF4444" : "#F97316"}
      />
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.permTitle,
            { color: isDenied ? "#EF4444" : "#F97316" },
          ]}
        >
          {isDenied ? "Notifications blocked" : "Enable notifications"}
        </Text>
        <Text style={[styles.permBody, { color: colors.textSecondary }]}>
          {isDenied
            ? "Tap to open device settings and allow FitTrack Pro to send notifications."
            : "Tap to grant notification permission so the app can alert you during workouts and remind you to train."}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.textTertiary} />
    </TouchableOpacity>
  );
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  subtitle,
  children,
  colors,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  colors: any;
}) {
  return (
    <View style={styles.sectionWrap}>
      <View style={styles.sectionHead}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          {title}
        </Text>
        {subtitle && (
          <Text style={[styles.sectionSub, { color: colors.textSecondary }]}>
            {subtitle}
          </Text>
        )}
      </View>
      <View
        style={[
          styles.sectionCard,
          { backgroundColor: colors.card, borderColor: colors.border },
        ]}
      >
        {children}
      </View>
    </View>
  );
}

// ─── Toggle row ───────────────────────────────────────────────────────────────

function ToggleRow({
  icon,
  iconColor,
  label,
  sublabel,
  value,
  disabled,
  onToggle,
  colors,
  isLast = false,
}: {
  icon: string;
  iconColor: string;
  label: string;
  sublabel?: string;
  value: boolean;
  disabled?: boolean;
  onToggle: (v: boolean) => void;
  colors: any;
  isLast?: boolean;
}) {
  return (
    <View
      style={[
        styles.row,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider },
        disabled && { opacity: 0.45 },
      ]}
    >
      <View style={[styles.rowIcon, { backgroundColor: iconColor + "22" }]}>
        <Ionicons name={icon as any} size={17} color={iconColor} />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: colors.text }]}>{label}</Text>
        {sublabel && (
          <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
            {sublabel}
          </Text>
        )}
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        disabled={disabled}
        trackColor={{
          false: Platform.OS === "ios" ? undefined : "#767577",
          true: iconColor,
        }}
        thumbColor={
          Platform.OS === "android" ? (value ? "#fff" : "#f4f3f4") : undefined
        }
        ios_backgroundColor="#D1D5DB"
      />
    </View>
  );
}

// ─── Time picker modal ────────────────────────────────────────────────────────

function TimePickerModal({
  visible,
  hour,
  minute,
  onConfirm,
  onClose,
  colors,
}: {
  visible: boolean;
  hour: number;
  minute: number;
  onConfirm: (h: number, m: number) => void;
  onClose: () => void;
  colors: any;
}) {
  const [h, setH] = useState(hour);
  const [m, setM] = useState(minute);

  useEffect(() => {
    setH(hour);
    setM(minute);
  }, [hour, minute, visible]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={[styles.modalCard, { backgroundColor: colors.card }]}>
          <Text style={[styles.modalTitle, { color: colors.text }]}>
            Set Reminder Time
          </Text>

          <View style={styles.timePickerRow}>
            {/* Hour picker */}
            <View style={styles.pickerCol}>
              <Text
                style={[styles.pickerLabel, { color: colors.textSecondary }]}
              >
                Hour
              </Text>
              <FlatList
                data={HOURS}
                keyExtractor={(item) => String(item)}
                showsVerticalScrollIndicator={false}
                style={styles.pickerList}
                getItemLayout={(_, i) => ({
                  length: 44,
                  offset: 44 * i,
                  index: i,
                })}
                initialScrollIndex={Math.max(0, HOURS.indexOf(h))}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[
                      styles.pickerItem,
                      item === h && { backgroundColor: colors.primary + "22" },
                    ]}
                    onPress={() => setH(item)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: item === h ? colors.primary : colors.text },
                        item === h && { fontWeight: "800" },
                      ]}
                    >
                      {formatHour(item)}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>

            {/* Minute picker */}
            <View style={styles.pickerCol}>
              <Text
                style={[styles.pickerLabel, { color: colors.textSecondary }]}
              >
                Minute
              </Text>
              <View style={styles.pickerList}>
                {MINUTES.map((min) => (
                  <TouchableOpacity
                    key={min}
                    style={[
                      styles.pickerItem,
                      min === m && { backgroundColor: colors.primary + "22" },
                    ]}
                    onPress={() => setM(min)}
                  >
                    <Text
                      style={[
                        styles.pickerItemText,
                        { color: min === m ? colors.primary : colors.text },
                        min === m && { fontWeight: "800" },
                      ]}
                    >
                      :{String(min).padStart(2, "0")}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          {/* Preview */}
          <View
            style={[
              styles.timePreview,
              { backgroundColor: colors.primary + "14" },
            ]}
          >
            <Ionicons name="alarm-outline" size={18} color={colors.primary} />
            <Text style={[styles.timePreviewText, { color: colors.primary }]}>
              Reminder will fire daily at {formatTime(h, m)}
            </Text>
          </View>

          <TouchableOpacity
            style={[styles.confirmBtn, { backgroundColor: colors.primary }]}
            onPress={() => onConfirm(h, m)}
          >
            <Text style={styles.confirmBtnText}>Confirm</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
            <Text
              style={[styles.cancelBtnText, { color: colors.textSecondary }]}
            >
              Cancel
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function NotificationsScreen() {
  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  const [permStatus, setPermStatus] = useState<
    "granted" | "denied" | "undetermined"
  >("undetermined");
  const [prefs, setPrefs] = useState<NotificationPrefs>({ ...DEFAULT_PREFS });
  const [timePickerVisible, setTimePickerVisible] = useState(false);
  const [loading, setLoading] = useState(true);

  // ── Load prefs and permission on mount ───────────────────────────────────
  useEffect(() => {
    (async () => {
      const [status, savedPrefs] = await Promise.all([
        getPermissionStatus(),
        loadNotificationPrefs(),
      ]);
      setPermStatus(status);
      setPrefs(savedPrefs);
      setLoading(false);
    })();
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  const updatePref = useCallback(
    async (key: keyof NotificationPrefs, value: boolean | number) => {
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      await saveNotificationPrefs(next);

      // Re-schedule or cancel streak reminder when its toggle or time changes
      if (key === "streakReminder") {
        if (value) {
          await scheduleStreakReminder(
            0,
            next.reminderHour,
            next.reminderMinute,
          );
        } else {
          await cancelStreakReminder();
        }
      }
      if (key === "streakRiskAlert") {
        if (!value) await cancelStreakRiskAlert();
      }
    },
    [prefs],
  );

  const handleTimeConfirm = useCallback(
    async (h: number, m: number) => {
      setTimePickerVisible(false);
      const next = { ...prefs, reminderHour: h, reminderMinute: m };
      setPrefs(next);
      await saveNotificationPrefs(next);
      if (next.streakReminder) {
        await scheduleStreakReminder(0, h, m);
      }
    },
    [prefs],
  );

  const handleRequestPermission = useCallback(async () => {
    const granted = await requestNotificationPermission();
    setPermStatus(granted ? "granted" : "denied");
    if (!granted) {
      Alert.alert(
        "Permission Required",
        "Please enable notifications in your device settings to use this feature.",
        [
          { text: "Open Settings", onPress: () => Linking.openSettings() },
          { text: "Cancel", style: "cancel" },
        ],
      );
    }
  }, []);

  const handleTestNotification = useCallback(async () => {
    const granted = await requestNotificationPermission();
    if (!granted) {
      handleRequestPermission();
      return;
    }
    await sendImmediateNotification(
      "👋 Test Notification",
      "FitTrack Pro notifications are working correctly!",
    );
    Alert.alert("Sent!", "A test notification has been dispatched.");
  }, [handleRequestPermission]);

  const handleResetAll = useCallback(() => {
    Alert.alert(
      "Reset All Notifications",
      "This will cancel every scheduled notification and reset all preferences to defaults.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Reset",
          style: "destructive",
          onPress: async () => {
            await cancelAllNotifications();
            const fresh = { ...DEFAULT_PREFS };
            setPrefs(fresh);
            await saveNotificationPrefs(fresh);
          },
        },
      ],
    );
  }, []);

  const disabled = permStatus !== "granted";

  if (loading) return null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
      <Header title="Notifications" subtitle="Manage alerts and reminders" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Permission banner ──────────────────────────────────────────── */}
        <PermissionBanner
          status={permStatus}
          onRequest={handleRequestPermission}
          colors={colors}
        />

        {/* ── Timer & Workout ────────────────────────────────────────────── */}
        <Section
          title="Timer & Workout"
          subtitle="Alerts while a workout is running"
          colors={colors}
        >
          <ToggleRow
            icon="timer-outline"
            iconColor="#10B981"
            label="Phase Change Alerts"
            sublabel="Notifies you when switching between work and rest — even with the app in the background"
            value={prefs.timerPhaseChanges}
            disabled={disabled}
            onToggle={(v) => updatePref("timerPhaseChanges", v)}
            colors={colors}
          />
          <ToggleRow
            icon="checkmark-done-circle-outline"
            iconColor="#4876EC"
            label="Workout Complete"
            sublabel="Instant notification when you finish and save a workout"
            value={prefs.workoutComplete}
            disabled={disabled}
            onToggle={(v) => updatePref("workoutComplete", v)}
            colors={colors}
            isLast
          />
        </Section>

        {/* ── Streak & Motivation ─────────────────────────────────────────── */}
        <Section
          title="Streak & Motivation"
          subtitle="Daily reminders to keep you consistent"
          colors={colors}
        >
          <ToggleRow
            icon="flame-outline"
            iconColor="#F97316"
            label="Daily Reminder"
            sublabel={`Fires every day at ${formatTime(prefs.reminderHour, prefs.reminderMinute)} to nudge you to train`}
            value={prefs.streakReminder}
            disabled={disabled}
            onToggle={(v) => updatePref("streakReminder", v)}
            colors={colors}
          />

          {/* Reminder time picker row (only shown when reminder is on) */}
          {prefs.streakReminder && (
            <TouchableOpacity
              style={[
                styles.timeRow,
                { borderBottomWidth: 1, borderBottomColor: colors.divider },
              ]}
              onPress={() => setTimePickerVisible(true)}
              activeOpacity={0.7}
              disabled={disabled}
            >
              <View style={[styles.rowIcon, { backgroundColor: "#F9731622" }]}>
                <Ionicons name="alarm-outline" size={17} color="#F97316" />
              </View>
              <View style={styles.rowText}>
                <Text style={[styles.rowLabel, { color: colors.text }]}>
                  Reminder Time
                </Text>
                <Text style={[styles.rowSub, { color: colors.textSecondary }]}>
                  Tap to change time
                </Text>
              </View>
              <View
                style={[styles.timeBadge, { backgroundColor: "#F9731622" }]}
              >
                <Text style={[styles.timeBadgeText, { color: "#F97316" }]}>
                  {formatTime(prefs.reminderHour, prefs.reminderMinute)}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={colors.textTertiary}
                style={{ marginLeft: 6 }}
              />
            </TouchableOpacity>
          )}

          <ToggleRow
            icon="warning-outline"
            iconColor="#EF4444"
            label="Streak at Risk"
            sublabel="Fires at 9 PM if you haven't logged a workout yet today and have an active streak"
            value={prefs.streakRiskAlert}
            disabled={disabled}
            onToggle={(v) => updatePref("streakRiskAlert", v)}
            colors={colors}
          />

          <ToggleRow
            icon="trophy-outline"
            iconColor="#F59E0B"
            label="Weekly Goal Reached"
            sublabel="Celebrates when you hit your weekly workout target"
            value={prefs.weeklyGoal}
            disabled={disabled}
            onToggle={(v) => updatePref("weeklyGoal", v)}
            colors={colors}
            isLast
          />
        </Section>

        {/* ── Progress ────────────────────────────────────────────────────── */}
        <Section
          title="Progress"
          subtitle="Smart nudges based on your training data"
          colors={colors}
        >
          <ToggleRow
            icon="trending-up-outline"
            iconColor="#7C3AED"
            label="Progressive Overload Nudge"
            sublabel="Alerts you when you've used the same weight for an exercise for 4+ weeks"
            value={prefs.overloadNudge}
            disabled={disabled}
            onToggle={(v) => updatePref("overloadNudge", v)}
            colors={colors}
            isLast
          />
        </Section>

        {/* ── How timer notifications work info card ─────────────────────── */}
        <View
          style={[
            styles.infoCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={styles.infoHeader}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.infoTitle, { color: colors.text }]}>
              How background timer alerts work
            </Text>
          </View>
          <Text style={[styles.infoBody, { color: colors.textSecondary }]}>
            When you start a workout and switch to another app or lock your
            screen, FitTrack Pro pre-schedules a local notification for each
            work/rest transition. These fire automatically — no internet needed.
            When you return to the app or finish the workout, all scheduled
            timer notifications are cancelled.
          </Text>
        </View>

        {/* ── Actions ─────────────────────────────────────────────────────── */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[
              styles.actionBtn,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
            onPress={handleTestNotification}
            activeOpacity={0.8}
          >
            <Ionicons
              name="notifications-outline"
              size={18}
              color={colors.primary}
            />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>
              Send Test
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.actionBtn,
              {
                backgroundColor: colors.card,
                borderColor: colors.error + "60",
              },
            ]}
            onPress={handleResetAll}
            activeOpacity={0.8}
          >
            <Ionicons name="refresh-outline" size={18} color={colors.error} />
            <Text style={[styles.actionBtnText, { color: colors.error }]}>
              Reset All
            </Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Time picker modal ──────────────────────────────────────────────── */}
      <TimePickerModal
        visible={timePickerVisible}
        hour={prefs.reminderHour}
        minute={prefs.reminderMinute}
        onConfirm={handleTimeConfirm}
        onClose={() => setTimePickerVisible(false)}
        colors={colors}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 16 },

  // Permission banner
  permBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 20,
  },
  permTitle: { fontSize: 13, fontWeight: "700", marginBottom: 3 },
  permBody: { fontSize: 12, lineHeight: 17 },

  // Section
  sectionWrap: { marginBottom: 20 },
  sectionHead: { paddingHorizontal: 4, marginBottom: 10, gap: 2 },
  sectionTitle: { fontSize: 16, fontWeight: "800" },
  sectionSub: { fontSize: 12, fontWeight: "500" },
  sectionCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // Row
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  rowIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 14, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 2, lineHeight: 17 },

  // Time row
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  timeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  timeBadgeText: { fontSize: 13, fontWeight: "700" },

  // Info card
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  infoHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  infoTitle: { fontSize: 13, fontWeight: "700", flex: 1 },
  infoBody: { fontSize: 12, lineHeight: 18 },

  // Actions
  actionsRow: { flexDirection: "row", gap: 12 },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  actionBtnText: { fontSize: 14, fontWeight: "700" },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 28,
    paddingBottom: 44,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 20,
    textAlign: "center",
  },
  timePickerRow: { flexDirection: "row", gap: 16, marginBottom: 20 },
  pickerCol: { flex: 1 },
  pickerLabel: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 0.5,
    marginBottom: 8,
    textAlign: "center",
  },
  pickerList: { height: 220 },
  pickerItem: {
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  pickerItemText: { fontSize: 15 },
  timePreview: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
  },
  timePreviewText: { fontSize: 13, fontWeight: "600" },
  confirmBtn: {
    padding: 16,
    borderRadius: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  confirmBtnText: { color: "#fff", fontSize: 16, fontWeight: "800" },
  cancelBtn: { padding: 12, alignItems: "center" },
  cancelBtnText: { fontSize: 15, fontWeight: "600" },
});
