import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Header from '../../components/Header';
import { useTheme } from '../../context/ThemeContext';

// Terms data for easy maintenance and mapping
const TERMS_SECTIONS = [
  {
    title: '1. Use of the App',
    content: 'You may use this app for personal, non-commercial purposes only. Any misuse or unauthorized access may result in termination of your account.',
  },
  {
    title: '2. Account Responsibility',
    content: 'You are responsible for maintaining the confidentiality of your account credentials and any activities under your account.',
  },
  {
    title: '3. Content Accuracy',
    content: 'The app provides fitness tracking and guidance. However, all information is for educational purposes only and is not a substitute for professional medical advice. Always consult a physician before starting any new exercise program.',
  },
  {
    title: '4. Intellectual Property',
    content: 'All app content, including text, graphics, and code, is owned by the app developers and may not be copied or redistributed without permission.',
  },
  {
    title: '5. Limitation of Liability',
    content: 'We are not liable for any injuries, damages, or losses resulting from the use of this app.',
  },
  {
    title: '6. Changes to Terms',
    content: 'We may update these Terms of Use at any time. Continued use of the app constitutes acceptance of any changes.',
  },
];

export default function TermsOfUse() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Terms of Use" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Welcome text */}
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Please read these terms carefully before using our app.
        </Text>

        {/* Terms sections */}
        {TERMS_SECTIONS.map((section, index) => (
          <View
            key={index}
            style={[
              styles.sectionCard,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
              },
            ]}
          >
            <Text style={[styles.sectionTitle, { color: colors.primary }]}>
              {section.title}
            </Text>
            <Text style={[styles.sectionContent, { color: colors.text }]}>
              {section.content}
            </Text>
          </View>
        ))}

        {/* Footer note */}
        <Text style={[styles.footerNote, { color: colors.textTertiary }]}>
          By continuing to use the app, you acknowledge that you have read and understood these terms.
        </Text>

        {/* Extra bottom spacing */}
        <View style={{ height: 20 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  emoji: {
    fontSize: 48,
  },
  welcomeText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    fontStyle: 'italic',
    marginTop: 30,
  },
  sectionCard: {
    borderRadius: 16,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
  },
  sectionContent: {
    fontSize: 16,
    lineHeight: 24,
  },
  footerNote: {
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 10,
  },
});