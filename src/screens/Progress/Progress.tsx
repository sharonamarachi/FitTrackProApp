// src/screens/Progress/Progress.tsx
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function Progress() {
  // Mock progress data
  const progressData = {
    workoutsCompleted: 12,
    currentStreak: 5,
    personalRecords: 3,
    totalWeightLifted: 12500,
  };

  const progressStats = [
    { label: 'Workouts Completed', value: progressData.workoutsCompleted, icon: 'barbell', color: '#007AFF' },
    { label: 'Current Streak', value: `${progressData.currentStreak} days`, icon: 'flame', color: '#FF9500' },
    { label: 'Personal Records', value: progressData.personalRecords, icon: 'trophy', color: '#FFD60A' },
    { label: 'Total Weight Lifted', value: `${progressData.totalWeightLifted} kg`, icon: 'fitness', color: '#34C759' },
  ];

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Progress & Stats</Text>
        <Text style={styles.subtitle}>Track your fitness journey</Text>
      </View>

      {/* Progress Overview */}
      <View style={styles.statsGrid}>
        {progressStats.map((stat, index) => (
          <View key={index} style={styles.statCard}>
            <View style={[styles.iconContainer, { backgroundColor: `${stat.color}20` }]}>
            <Ionicons 
            name={stat.icon as keyof typeof Ionicons.glyphMap} 
            size={24} 
            color={stat.color} 
            />
            </View>
            <Text style={styles.statValue}>{stat.value}</Text>
            <Text style={styles.statLabel}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {/* Charts Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Progress Charts</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="stats-chart" size={48} color="#ccc" />
          <Text style={styles.placeholderText}>Progress charts coming soon</Text>
          <Text style={styles.placeholderSubtext}>Track your workouts to see detailed analytics</Text>
        </View>
      </View>

      {/* Personal Records */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Personal Records</Text>
        <View style={styles.prCard}>
          <Text style={styles.prTitle}>🏋️ Bench Press</Text>
          <Text style={styles.prValue}>85 kg</Text>
          <Text style={styles.prDate}>Set on March 15, 2024</Text>
        </View>
        <View style={styles.prCard}>
          <Text style={styles.prTitle}>🏃‍♂️ 5K Run</Text>
          <Text style={styles.prValue}>24:30</Text>
          <Text style={styles.prDate}>Set on March 10, 2024</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
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
    backgroundColor: '#fff',
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
    color: '#333',
    marginBottom: 5,
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  chartPlaceholder: {
    backgroundColor: '#fff',
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
    color: '#666',
    marginTop: 10,
    marginBottom: 5,
  },
  placeholderSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  prCard: {
    backgroundColor: '#fff',
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
    color: '#007AFF',
    marginBottom: 5,
  },
  prDate: {
    fontSize: 12,
    color: '#666',
  },
});