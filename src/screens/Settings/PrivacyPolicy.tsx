import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import Header from '../../components/Header';
import { useTheme } from '../../context/ThemeContext';

// Privacy policy sections for easy maintenance
const PRIVACY_SECTIONS = [
  {
    title: '1. Information We Collect',
    content: 'We may collect personal information such as your email, profile details, and fitness activity to provide and improve our services.',
  },
  {
    title: '2. Use of Information',
    content: 'Your data is used to personalize your experience, track your fitness progress, and send notifications about app updates.',
  },
  {
    title: '3. Data Sharing',
    content: 'We do not sell your personal data. We may share information with third-party service providers only as necessary to provide app functionality.',
  },
  {
    title: '4. Data Security',
    content: 'We implement reasonable security measures to protect your information. However, no system is completely secure, and we cannot guarantee absolute protection.',
  },
  {
    title: '5. Your Rights',
    content: 'You may access, update, or delete your personal data through your account settings. You may also request deletion of your account at any time.',
  },
  {
    title: '6. Changes to Policy',
    content: 'We may update this Privacy Policy from time to time. Continued use of the app signifies your acceptance of these changes.',
  },
  {
    title: '7. Contact Us',
    content: 'If you have questions about this Privacy Policy, please contact us via the "Contact Us" option in the app.',
  },
];

export default function PrivacyPolicy() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Header title="Privacy Policy" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >

        {/* Welcome text */}
        <Text style={[styles.welcomeText, { color: colors.textSecondary }]}>
          Your privacy matters to us. Please review our policy below.
        </Text>

        {/* Privacy sections */}
        {PRIVACY_SECTIONS.map((section, index) => (
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
          By continuing to use the app, you acknowledge that you have read and understood this policy.
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