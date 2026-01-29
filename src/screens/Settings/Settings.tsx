import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../api/supabaseClient';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import Header from '../../components/Header';

export default function Settings({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
      ]
    );
  };

  return (
    <View style={styles.container}>
      <Header title="Settings" />
      
      <ScrollView contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}>
        {/* Account Section */}
        <Text style={styles.sectionTitle}>Account</Text>
        <SettingItem 
          label="Email" 
          value={user?.email} 
          icon="mail-outline" 
        />
        <SettingItem 
          label="Edit Profile" 
          icon="person-circle-outline" 
          onPress={() => navigation.navigate("EditProfile")} 
        />

        {/* App Section */}
        <Text style={styles.sectionTitle}>App</Text>
        <SettingItem label="Display & Audio" icon="tv-outline" />
        <SettingItem label="Notifications" icon="notifications-outline" />

        {/* Legal Section */}
        <Text style={styles.sectionTitle}>Legal</Text>
        <SettingItem label="Terms of Use" icon="document-text-outline" />
        <SettingItem label="Privacy Policy" icon="shield-checkmark-outline" />

        {/* Support Section */}
        <Text style={styles.sectionTitle}>Support</Text>
        <SettingItem label="Contact Us" icon="help-circle-outline" />

        {/* Delete Account */}
        <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteUser}>
          <Text style={styles.deleteText}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const SettingItem = ({ label, value, icon, onPress }: any) => (
  <TouchableOpacity style={styles.item} onPress={onPress} disabled={!onPress}>
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      {icon && <Ionicons name={icon} size={20} color="#4438c3" style={{ marginRight: 10 }} />}
      <Text style={styles.itemLabel}>{label}</Text>
    </View>
    {value ? (
      <Text style={styles.itemValue}>{value}</Text>
    ) : (
      <Ionicons name="chevron-forward" size={20} color="#666" />
    )}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
    marginTop: 25,
    marginBottom: 8,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  itemLabel: {
    fontSize: 16,
    color: "#333",
  },
  itemValue: {
    fontSize: 14,
    color: "#666",
  },
  deleteButton: {
    marginTop: 50,
    alignItems: "center",
    paddingVertical: 16,
  },
  deleteText: {
    color: "red",
    fontSize: 16,
    fontWeight: "bold",
  },
});