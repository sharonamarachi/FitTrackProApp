import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../api/supabaseClient';
import { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import Header from '../../components/Header';
import { useTheme } from '../../context/ThemeContext';

export default function Settings({ navigation }: any) {
  const [user, setUser] = useState<User | null>(null);
  const { theme, toggleTheme, colors } = useTheme();

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Settings" />
      
      <ScrollView 
        contentContainerStyle={{ paddingBottom: 30, paddingHorizontal: 20 }}
        style={{ backgroundColor: colors.background }}
      >
        {/* Account Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Account</Text>
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

        {/* Appearance Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Appearance</Text>
        <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border, paddingRight: 80 }]}>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Ionicons 
              name={theme === 'dark' ? 'moon' : 'sunny'} 
              size={20} 
              color={colors.primary} 
              style={{ marginRight: 10 }} 
            />
            <View style={{ flex: 1 }}>
              <Text style={[styles.itemLabel, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.itemSubtext, { color: colors.textSecondary }]}>
          {theme === 'dark' ? 'Enabled' : 'Disabled'}
              </Text>
            </View>
          </View>
          <Switch
            value={theme === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: '#767577', true: colors.primary }}
            thumbColor={theme === 'dark' ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>

        {/* App Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>App</Text>
        <SettingItem 
          label="Display & Audio" 
          icon="tv-outline"
          colors={colors}
        />
        <SettingItem 
          label="Notifications" 
          icon="notifications-outline"
          colors={colors}
        />

        {/* Legal Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Legal</Text>
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

        {/* Support Section */}
        <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>Support</Text>
        <SettingItem 
          label="Contact Us" 
          icon="help-circle-outline"
          colors={colors}
          onPress={() => navigation.navigate("ContactUs")}
        />

        {/* Delete Account */}
        <TouchableOpacity 
          style={[styles.deleteButton, { borderColor: colors.error }]} 
          onPress={handleDeleteUser}
        >
          <Text style={[styles.deleteText, { color: colors.error }]}>Delete Account</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const SettingItem = ({ label, value, icon, onPress, colors }: any) => (
  <TouchableOpacity 
    style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]} 
    onPress={onPress} 
    disabled={!onPress}
  >
    <View style={{ flexDirection: "row", alignItems: "center", flex: 1 }}>
      {icon && (
        <Ionicons 
          name={icon} 
          size={20} 
          color={colors.primary} 
          style={{ marginRight: 10 }} 
        />
      )}
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemLabel, { color: colors.text }]}>{label}</Text>
        {value && (
          <Text style={[styles.itemValue, { color: colors.textSecondary }]}>{value}</Text>
        )}
      </View>
    </View>
    {onPress && <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />}
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 25,
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  item: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },
  itemLabel: {
    fontSize: 16,
  },
  itemValue: {
    fontSize: 14,
    marginTop: 2,
  },
  itemSubtext: {
    fontSize: 12,
    marginTop: 2,
  },
  deleteButton: {
    marginTop: 30,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  deleteText: {
    fontSize: 16,
    fontWeight: "bold",
  },
});