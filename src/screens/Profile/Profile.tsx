import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar } from 'react-native';
import { useEffect, useState } from 'react';
import { supabase } from '../../api/supabaseClient';
import { User } from '@supabase/supabase-js';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';

export default function Profile({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const { theme, colors } = useTheme();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={theme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
        {/* Header Section */}
        <View style={[styles.header, { backgroundColor: colors.primary }]}>
          <View style={[styles.avatar, { 
            backgroundColor: theme === 'dark' ? colors.primaryLight : '#6c63ff',
          }]}>
            <Ionicons name="person" size={50} color="white" />
          </View>
          <Text style={styles.username}>
            {user?.email?.split('@')[0] || 'Username'}
          </Text>
          <Text style={styles.memberSince}>
            Member since {user ? new Date(user.created_at).toLocaleDateString() : '...'}
          </Text>
        </View>

        {/* Stats */}
        <View style={[styles.statsRow, { backgroundColor: colors.card }]}>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>0</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Workouts</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>0</Text>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Streak</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actions}>
          <ActionButton
            label="Settings"
            icon="settings-outline"
            onPress={() => navigation.navigate('SettingsStack')}
            colors={colors}
          />
          <ActionButton
            label="Logout"
            icon="log-out-outline"
            danger
            onPress={async () => {
              await supabase.auth.signOut();
              navigation.replace('Login');
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
      { 
        backgroundColor: colors.card,
        borderColor: colors.border,
      },
      danger && { borderColor: colors.error }
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
      <Text style={[
        styles.actionText,
        { color: colors.text },
        danger && { color: colors.error }
      ]}>
        {label}
      </Text>
    </View>
    <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    alignItems: 'center',
    paddingBottom: 40,
    paddingTop: 80,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
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
  },
  statLabel: {
    fontSize: 13,
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
    borderWidth: 1,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '500',
  },
});