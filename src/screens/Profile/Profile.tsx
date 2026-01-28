import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';

export default function Profile({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      {/* Header Section */}
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={50} color="white" />
        </View>
        <Text style={styles.username}>{user?.email?.split('@')[0] || 'Username'}</Text>
        <Text style={styles.memberSince}>
          Member since {user ? new Date(user.created_at).toLocaleDateString() : '...'}
        </Text>
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Workouts</Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>0</Text>
          <Text style={styles.statLabel}>Streak</Text>
        </View>
      </View>

      {/* Action buttons */}
      <View style={styles.actions}>
        <ActionButton
          label="Edit Profile"
          icon="create-outline"
          onPress={() => navigation.navigate('EditProfile')}
        />
        <ActionButton
          label="Analytics"
          icon="bar-chart-outline"
          onPress={() => navigation.navigate('Progress')}
        />
        <ActionButton
          label="Settings"
          icon="settings-outline"
          onPress={() => navigation.navigate('SettingsStack')}
        />
        <ActionButton
          label="Logout"
          icon="log-out-outline"
          danger
          onPress={async () => {
            await supabase.auth.signOut();
            navigation.replace('Login');
          }}
        />
      </View>
    </ScrollView>
  );
}

const ActionButton = ({ label, icon, onPress, danger }: any) => (
  <TouchableOpacity
    style={[styles.actionButton, danger && { borderColor: '#e74c3c', borderWidth: 1 }]}
    onPress={onPress}
  >
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <Ionicons
        name={icon}
        size={20}
        color={danger ? '#e74c3c' : '#4438c3'}
        style={{ marginRight: 10 }}
      />
      <Text style={[styles.actionText, danger && { color: '#e74c3c' }]}>{label}</Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color="#999" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#4438c3',
    paddingBottom: 40,
    paddingTop: 80,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#6c63ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5,
  },
  username: {
    fontSize: 22,
    fontWeight: '700',
    color: 'white',
  },
  memberSince: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    marginTop: -20,
    marginBottom: 30,
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4438c3',
  },
  statLabel: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
  actions: {
    marginTop: 10,
    paddingHorizontal: 20,
  },
  actionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    marginVertical: 6,
    borderRadius: 12,
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#eee',
  },
  actionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
});
