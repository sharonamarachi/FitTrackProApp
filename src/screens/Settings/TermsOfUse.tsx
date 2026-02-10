import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Header from '../../components/Header';
import { useTheme } from '../../context/ThemeContext';

export default function TermsOfUse() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Terms of Use" />
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text style={[styles.text, { color: colors.text }]}>
          Welcome to our fitness app. By using this app, you agree to the following terms and conditions:

          {'\n\n'}1. **Use of the App**: You may use this app for personal, non-commercial purposes only. Any misuse or unauthorized access may result in termination of your account.

          {'\n\n'}2. **Account Responsibility**: You are responsible for maintaining the confidentiality of your account credentials and any activities under your account.

          {'\n\n'}3. **Content Accuracy**: The app provides fitness tracking and guidance. However, all information is for educational purposes only and is not a substitute for professional medical advice. Always consult a physician before starting any new exercise program.

          {'\n\n'}4. **Intellectual Property**: All app content, including text, graphics, and code, is owned by the app developers and may not be copied or redistributed without permission.

          {'\n\n'}5. **Limitation of Liability**: We are not liable for any injuries, damages, or losses resulting from the use of this app.

          {'\n\n'}6. **Changes to Terms**: We may update these Terms of Use at any time. Continued use of the app constitutes acceptance of any changes.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  text: { fontSize: 16, lineHeight: 24 },
});
