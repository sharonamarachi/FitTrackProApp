import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Header from '../../components/Header';
import { useTheme } from '../../context/ThemeContext';

export default function PrivacyPolicy() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Privacy Policy" />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[styles.text, { color: colors.text }]}>
          We respect your privacy and are committed to protecting your personal data. This policy explains how we collect, use, and store your information.

          {'\n\n'}1. **Information We Collect**: We may collect personal information such as your email, profile details, and fitness activity to provide and improve our services.

          {'\n\n'}2. **Use of Information**: Your data is used to personalize your experience, track your fitness progress, and send notifications about app updates.

          {'\n\n'}3. **Data Sharing**: We do not sell your personal data. We may share information with third-party service providers only as necessary to provide app functionality.

          {'\n\n'}4. **Data Security**: We implement reasonable security measures to protect your information. However, no system is completely secure, and we cannot guarantee absolute protection.

          {'\n\n'}5. **Your Rights**: You may access, update, or delete your personal data through your account settings. You may also request deletion of your account at any time.

          {'\n\n'}6. **Changes to Policy**: We may update this Privacy Policy from time to time. Continued use of the app signifies your acceptance of these changes.

          {'\n\n'}7. **Contact Us**: If you have questions about this Privacy Policy, please contact us via the "Contact Us" option in the app.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  text: { fontSize: 16, lineHeight: 24 },
});
