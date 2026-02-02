// src/screens/Progress/Progress.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';


export default function Progress() {
  const { theme, colors } = useTheme();

  // Mock progress data
  const progressData = {
    workoutsCompleted: 12,
    currentStreak: 5,
    personalRecords: 3,
    totalWeightLifted: 12500,
  };

  const progressStats = [
    { label: 'Workouts Completed', value: progressData.workoutsCompleted, icon: 'barbell', color: colors.primary },
    { label: 'Current Streak', value: `${progressData.currentStreak} days`, icon: 'flame', color: colors.warning },
    { label: 'Personal Records', value: progressData.personalRecords, icon: 'trophy', color: colors.warning },
    { label: 'Total Weight Lifted', value: `${progressData.totalWeightLifted} kg`, icon: 'fitness', color: colors.success },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <ScrollView>
        <View style={[styles.header, { backgroundColor: colors.card }]}>
          <Text style={[styles.title, { color: colors.text }]}>Progress & Stats</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Track your fitness journey
          </Text>
        </View>

        {/* Progress Overview */}
        <View style={styles.statsGrid}>
          {progressStats.map((stat, index) => (
            <View 
              key={index} 
              style={[styles.statCard, { backgroundColor: colors.card }]}
            >
              <View style={[
                styles.iconContainer, 
                { backgroundColor: `${stat.color}20` }
              ]}>
                <Ionicons 
                  name={stat.icon as keyof typeof Ionicons.glyphMap} 
                  size={24} 
                  color={stat.color} 
                />
              </View>
              <Text style={[styles.statValue, { color: colors.text }]}>
                {stat.value}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                {stat.label}
              </Text>
            </View>
          ))}
        </View>

        {/* Charts Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Progress Charts
          </Text>
          <View style={[styles.chartPlaceholder, { backgroundColor: colors.card }]}>
            <Ionicons name="stats-chart" size={48} color={colors.textTertiary} />
            <Text style={[styles.placeholderText, { color: colors.textSecondary }]}>
              Progress charts coming soon
            </Text>
            <Text style={[styles.placeholderSubtext, { color: colors.textTertiary }]}>
              Track your workouts to see detailed analytics
            </Text>
          </View>
        </View>

        {/* Personal Records */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Personal Records
          </Text>
          <View style={[styles.prCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.prTitle, { color: colors.text }]}>
              🏋️ Bench Press
            </Text>
            <Text style={[styles.prValue, { color: colors.primary }]}>
              85 kg
            </Text>
            <Text style={[styles.prDate, { color: colors.textSecondary }]}>
              Set on March 15, 2024
            </Text>
          </View>
          <View style={[styles.prCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.prTitle, { color: colors.text }]}>
              🏃‍♂️ 5K Run
            </Text>
            <Text style={[styles.prValue, { color: colors.primary }]}>
              24:30
            </Text>
            <Text style={[styles.prDate, { color: colors.textSecondary }]}>
              Set on March 10, 2024
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 16,
    marginTop: 5,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    padding: 20,
  },
  statCard: {
    width: '48%',
    padding: 15,
    borderRadius: 15,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  iconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  chartPlaceholder: {
    padding: 40,
    borderRadius: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  placeholderText: {
    fontSize: 16,
    marginTop: 10,
    marginBottom: 5,
  },
  placeholderSubtext: {
    fontSize: 14,
    textAlign: 'center',
  },
  prCard: {
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  prTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 5,
  },
  prValue: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  prDate: {
    fontSize: 12,
  },
});