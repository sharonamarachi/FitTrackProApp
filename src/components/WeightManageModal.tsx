// ============================================================
// BODY WEIGHT MANAGEMENT — Drop-in additions for Progress.tsx
// ============================================================
//
// STEP 1 — Add this import near the top of Progress.tsx:
//   import WeightManageModal from './WeightManageModal';
//   (or paste the component at the bottom of Progress.tsx)
//
// STEP 2 — Add these two state variables inside Progress():
//   const [weightModalVisible, setWeightModalVisible] = useState(false);
//   const [editingMeasurement, setEditingMeasurement] = useState<BodyMeasurement | null>(null);
//
// STEP 3 — Replace the entire "Body Weight" <View style={[styles.section...}> block
//          with the JSX shown in the "REPLACE BODY WEIGHT SECTION" comment below.
//
// STEP 4 — Paste WeightManageModal anywhere in Progress.tsx (before the styles).
// ============================================================

// ── REPLACE BODY WEIGHT SECTION ──────────────────────────────────────────────
// Replace the existing Body Weight section with this:
/*
<View style={[styles.section, { backgroundColor: colors.card }]}>
  <View style={styles.sectionHeaderRow}>
    <View>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>Body Weight</Text>
      <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
        {measurements.length > 0
          ? `${measurements.length} measurement${measurements.length !== 1 ? 's' : ''} recorded`
          : 'No measurements yet'}
      </Text>
    </View>

    <TouchableOpacity
      style={[styles.editGoalBtn, { backgroundColor: colors.primary + '22' }]}
      onPress={() => { setEditingMeasurement(null); setWeightModalVisible(true); }}
    >
      <Ionicons name="add" size={16} color={colors.primary} />
      <Text style={[styles.editGoalText, { color: colors.primary }]}>Add</Text>
    </TouchableOpacity>
  </View>

  {measurements.length === 0 ? (
    <View style={[styles.emptySmall, { backgroundColor: colors.surface }]}>
      <Text style={{ fontSize: 32 }}>⚖️</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 13, textAlign: 'center' }}>
        Tap "Add" to log your first weight reading. Each entry builds your progress chart.
      </Text>
      <TouchableOpacity
        style={[styles.editGoalBtn, { backgroundColor: colors.primary, marginTop: 8 }]}
        onPress={() => { setEditingMeasurement(null); setWeightModalVisible(true); }}
      >
        <Ionicons name="add" size={14} color="#fff" />
        <Text style={[styles.editGoalText, { color: '#fff' }]}>Log Weight Now</Text>
      </TouchableOpacity>
    </View>
  ) : (
    <>
      <WeightLineChart
        measurements={measurements}
        primaryColor={colors.primary}
        colors={colors}
      />

      <View style={{ marginTop: 16, gap: 8 }}>
        <Text style={[styles.sectionSubtitle, { color: colors.textSecondary, marginBottom: 4 }]}>
          ALL ENTRIES — tap to edit, swipe to delete
        </Text>
        {[...measurements].reverse().map((m, i) => {
          const isLatest = i === 0;
          const change = i < measurements.length - 1
            ? m.weight_kg - [...measurements].reverse()[i + 1]?.weight_kg
            : null;
          return (
            <View
              key={m.id}
              style={[
                weightRowStyles.row,
                { backgroundColor: isDark ? colors.surface : '#F9FAFB', borderColor: colors.border },
                isLatest && { borderColor: colors.primary, borderWidth: 1.5 },
              ]}
            >
              <View style={[weightRowStyles.dot, { backgroundColor: isLatest ? colors.primary : colors.textTertiary }]} />
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <Text style={[weightRowStyles.weight, { color: colors.text }]}>
                    {m.weight_kg} kg
                  </Text>
                  {isLatest && (
                    <View style={[weightRowStyles.latestBadge, { backgroundColor: colors.primary + '22' }]}>
                      <Text style={[weightRowStyles.latestText, { color: colors.primary }]}>Latest</Text>
                    </View>
                  )}
                  {change !== null && (
                    <Text style={[weightRowStyles.change, { color: change < 0 ? '#10b981' : change > 0 ? '#f97316' : colors.textTertiary }]}>
                      {change > 0 ? '+' : ''}{change.toFixed(1)} kg
                    </Text>
                  )}
                </View>
                <Text style={[weightRowStyles.date, { color: colors.textSecondary }]}>
                  {new Date(m.recorded_at).toLocaleDateString('en', { day: 'numeric', month: 'short', year: 'numeric' })}
                </Text>
              </View>
              <TouchableOpacity
                style={[weightRowStyles.editBtn, { backgroundColor: colors.primary + '18' }]}
                onPress={() => { setEditingMeasurement(m); setWeightModalVisible(true); }}
              >
                <Ionicons name="create-outline" size={16} color={colors.primary} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[weightRowStyles.editBtn, { backgroundColor: '#ef444418' }]}
                onPress={() => {
                  Alert.alert(
                    'Delete Entry',
                    `Remove ${m.weight_kg} kg on ${new Date(m.recorded_at).toLocaleDateString()}?`,
                    [
                      { text: 'Cancel', style: 'cancel' },
                      {
                        text: 'Delete',
                        style: 'destructive',
                        onPress: async () => {
                          const { error } = await supabase
                            .from('body_measurements')
                            .delete()
                            .eq('id', m.id);
                          if (!error) {
                            setMeasurements(prev => prev.filter(x => x.id !== m.id));
                          } else {
                            Alert.alert('Error', 'Could not delete entry.');
                          }
                        },
                      },
                    ]
                  );
                }}
              >
                <Ionicons name="trash-outline" size={16} color="#ef4444" />
              </TouchableOpacity>
            </View>
          );
        })}
      </View>
    </>
  )}

  <WeightManageModal
    visible={weightModalVisible}
    editing={editingMeasurement}
    colors={colors}
    isDark={isDark}
    onClose={() => { setWeightModalVisible(false); setEditingMeasurement(null); }}
    onSave={async (weightKg, recordedAt, id) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      if (id) {
        // Edit existing
        const { error } = await supabase
          .from('body_measurements')
          .update({ weight_kg: weightKg, recorded_at: recordedAt })
          .eq('id', id);
        if (!error) {
          setMeasurements(prev =>
            prev.map(m => m.id === id ? { ...m, weight_kg: weightKg, recorded_at: recordedAt } : m)
          );
        }
      } else {
        // Add new
        const { data, error } = await supabase
          .from('body_measurements')
          .insert({ user_id: user.id, weight_kg: weightKg, recorded_at: recordedAt })
          .select()
          .single();
        if (!error && data) {
          setMeasurements(prev => [...prev, data]);
        }
      }
      setWeightModalVisible(false);
      setEditingMeasurement(null);
    }}
  />
</View>
*/

// ── WeightManageModal component ───────────────────────────────────────────────
// Paste this BEFORE the Progress() component styles object in Progress.tsx

import React, { useState, useEffect } from 'react';
import {
  View, Text, Modal, TouchableOpacity, TextInput, StyleSheet,
  Alert, Platform, ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';

interface BodyMeasurement {
  id: string;
  weight_kg: number;
  recorded_at: string;
}

interface WeightManageModalProps {
  visible: boolean;
  editing: BodyMeasurement | null;  // null = adding new
  colors: any;
  isDark: boolean;
  onClose: () => void;
  onSave: (weightKg: number, recordedAt: string, id?: string) => Promise<void>;
}

export function WeightManageModal({
  visible,
  editing,
  colors,
  isDark,
  onClose,
  onSave,
}: WeightManageModalProps) {
  const [weightInput, setWeightInput] = useState('');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Populate fields when editing an existing entry
  useEffect(() => {
    if (editing) {
      setWeightInput(String(editing.weight_kg));
      setDate(new Date(editing.recorded_at));
    } else {
      setWeightInput('');
      setDate(new Date());
    }
    setError('');
  }, [editing, visible]);

  const handleSave = async () => {
    const parsed = parseFloat(weightInput.replace(',', '.'));
    if (isNaN(parsed) || parsed <= 0 || parsed > 500) {
      setError('Please enter a valid weight between 1 and 500 kg.');
      return;
    }
    setSaving(true);
    try {
      await onSave(parsed, date.toISOString(), editing?.id);
    } catch {
      Alert.alert('Error', 'Could not save measurement. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDateChange = (_: any, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={wmStyles.overlay}>
        <TouchableOpacity style={wmStyles.backdrop} activeOpacity={1} onPress={onClose} />
        <View style={[wmStyles.sheet, { backgroundColor: colors.card }]}>
          {/* Handle */}
          <View style={[wmStyles.handle, { backgroundColor: colors.border }]} />

          {/* Header */}
          <View style={wmStyles.header}>
            <Text style={[wmStyles.title, { color: colors.text }]}>
              {editing ? 'Edit Weight Entry' : 'Log Weight'}
            </Text>
            <TouchableOpacity
              onPress={onClose}
              style={[wmStyles.closeBtn, { backgroundColor: colors.surface }]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </TouchableOpacity>
          </View>

          {/* Instructions */}
          <View style={[wmStyles.infoBanner, { backgroundColor: colors.primary + '14', borderColor: colors.primary + '30' }]}>
            <Ionicons name="information-circle-outline" size={16} color={colors.primary} />
            <Text style={[wmStyles.infoText, { color: isDark ? '#93c5fd' : colors.primary }]}>
              {editing
                ? 'Correct the weight or date below, then tap Save.'
                : 'Log your current weight. Each entry is saved to your progress chart.'}
            </Text>
          </View>

          {/* Weight input */}
          <View style={wmStyles.fieldGroup}>
            <Text style={[wmStyles.label, { color: colors.textSecondary }]}>Weight (kg)</Text>
            <View style={[wmStyles.inputRow, {
              backgroundColor: colors.surface,
              borderColor: error ? '#ef4444' : colors.border,
            }]}>
              <Ionicons name="fitness-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[wmStyles.input, { color: colors.text }]}
                placeholder="e.g. 72.5"
                placeholderTextColor={colors.textTertiary}
                keyboardType="decimal-pad"
                value={weightInput}
                onChangeText={(t) => { setWeightInput(t); setError(''); }}
                autoFocus={!editing}
              />
              <Text style={[wmStyles.unit, { color: colors.textSecondary }]}>kg</Text>
            </View>
            {error ? <Text style={wmStyles.errorText}>{error}</Text> : null}
          </View>

          {/* Date picker */}
          <View style={wmStyles.fieldGroup}>
            <Text style={[wmStyles.label, { color: colors.textSecondary }]}>Date</Text>
            <TouchableOpacity
              style={[wmStyles.dateRow, { backgroundColor: colors.surface, borderColor: colors.border }]}
              onPress={() => setShowDatePicker(true)}
            >
              <Ionicons name="calendar-outline" size={18} color={colors.textSecondary} />
              <Text style={[wmStyles.dateText, { color: colors.text }]}>
                {date.toLocaleDateString('en', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' })}
              </Text>
              <Ionicons name="chevron-down" size={16} color={colors.textTertiary} />
            </TouchableOpacity>

            {showDatePicker && (
              <DateTimePicker
                value={date}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                maximumDate={new Date()}
                onChange={handleDateChange}
              />
            )}
          </View>

          {/* Save button */}
          <TouchableOpacity
            style={[wmStyles.saveBtn, { backgroundColor: colors.primary }, saving && { opacity: 0.6 }]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.85}
          >
            <Ionicons name="checkmark-circle" size={20} color="#fff" />
            <Text style={wmStyles.saveBtnText}>
              {saving ? 'Saving…' : editing ? 'Save Changes' : 'Log Weight'}
            </Text>
          </TouchableOpacity>

          {/* Cancel */}
          <TouchableOpacity
            style={[wmStyles.cancelBtn, { borderColor: colors.border }]}
            onPress={onClose}
          >
            <Text style={[wmStyles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

// ── Styles for weight row (add to Progress.tsx styles) ────────────────────────
export const weightRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
  },
  dot: {
    width: 8, height: 8, borderRadius: 4, flexShrink: 0,
  },
  weight: {
    fontSize: 16, fontWeight: '700',
  },
  latestBadge: {
    paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8,
  },
  latestText: {
    fontSize: 10, fontWeight: '700',
  },
  change: {
    fontSize: 12, fontWeight: '600',
  },
  date: {
    fontSize: 12, marginTop: 2,
  },
  editBtn: {
    width: 32, height: 32, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
});

// ── Modal styles ──────────────────────────────────────────────────────────────
const wmStyles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: 12,
    paddingHorizontal: 24,
    paddingBottom: 44,
  },
  handle: {
    width: 40, height: 4, borderRadius: 2,
    alignSelf: 'center', marginBottom: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '800' },
  closeBtn: {
    width: 34, height: 34, borderRadius: 17,
    alignItems: 'center', justifyContent: 'center',
  },

  infoBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
  },
  infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '700', marginBottom: 8, letterSpacing: 0.5 },

  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  input: {
    flex: 1,
    fontSize: 22,
    fontWeight: '700',
  },
  unit: { fontSize: 14, fontWeight: '600' },
  errorText: { color: '#ef4444', fontSize: 12, marginTop: 4, marginLeft: 4 },

  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateText: { flex: 1, fontSize: 15, fontWeight: '500' },

  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 18,
    borderRadius: 18,
    marginBottom: 10,
  },
  saveBtnText: { color: '#fff', fontSize: 17, fontWeight: '800' },

  cancelBtn: {
    padding: 15,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1.5,
  },
  cancelText: { fontSize: 15, fontWeight: '600' },
});