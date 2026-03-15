import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  Animated,
  TextInput,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Header from '../../components/Header';
import { useTheme } from '../../context/ThemeContext';

// ─── FAQ Data — sourced from the FitTrack Pro FYP proposal & report ───────────

const FAQ_CATEGORIES = [
  {
    id: 'getting_started',
    label: 'Getting Started',
    icon: 'rocket-outline' as const,
    color: '#4876EC',
    items: [
      {
        q: 'What is FitTrack Pro?',
        a: 'FitTrack Pro is a mobile fitness tracking app designed for weightlifting and HIIT workouts. It lets you log and build custom workouts, follow them hands-free using audio cues, track your progress over time, and even convert YouTube workout videos into structured plans automatically.',
      },
      {
        q: 'Who is FitTrack Pro designed for?',
        a: 'FitTrack Pro is suitable for all fitness levels — from complete beginners to advanced athletes. Whether you train at home or in the gym, the app adapts to your preferred style with both sets-and-reps and interval timer modes.',
      },
      {
        q: 'How do I create my first workout?',
        a: 'Tap the ⚡ Quick Start tab at the bottom of the screen. Choose "Quick Log" to build a workout from scratch, pick your template (Sets & Reps or Interval Timer), add your exercises, then save. Your workout will appear in your Workout Library.',
      },
      {
        q: 'What workout types does the app support?',
        a: 'The app supports two main formats: Sets & Reps (traditional strength training where you log sets, reps, and weight) and Interval Timer (time-based workouts like HIIT and circuit training with work/rest periods).',
      },
    ],
  },
  {
    id: 'timer',
    label: 'Timer & Audio',
    icon: 'stopwatch-outline' as const,
    color: '#10B981',
    items: [
      {
        q: 'How does the hands-free workout experience work?',
        a: 'When you start an interval workout, the app guides you through each exercise using audio cues — spoken exercise names, countdown beeps at the end of each interval, and automatic transitions between work and rest periods. You never need to look at your screen mid-workout.',
      },
      {
        q: 'How do I set up the interval timer?',
        a: 'Go to Quick Start → Quick Timer. Use the circular dial to set your Work time, Rest time, Rounds, and number of Exercises. A total workout duration is calculated automatically. Tap "Start Training" when ready.',
      },
      {
        q: 'Can I change the coach voice or turn off beeps?',
        a: 'Yes. During a workout, tap the ⚙️ settings icon in the top-right corner. You can toggle Countdown Beeps on/off, enable or disable the Coach Voice, switch between male and female voice, and adjust the volume. You can also change these defaults in Settings → Display & Audio.',
      },
      {
        q: 'Why does my screen stay on during workouts?',
        a: 'This is intentional. FitTrack Pro keeps your screen awake while the timer is running so you can glance at it without unlocking your device. The keep-awake feature is automatically disabled when you pause or complete the workout to save battery.',
      },
      {
        q: 'How do I skip or go back to a previous exercise during a session?',
        a: 'Use the skip-forward (⏭) and skip-back (⏮) buttons at the bottom of the timer screen to move between exercises instantly. You can also pause at any time using the large centre button.',
      },
    ],
  },
  {
    id: 'youtube',
    label: 'YouTube Integration',
    icon: 'logo-youtube' as const,
    color: '#EF4444',
    items: [
      {
        q: 'How does the YouTube import feature work?',
        a: 'Paste a YouTube workout video URL into the YouTube Import screen. The app fetches the video\'s captions/transcript via our backend server, then uses AI (Llama 3 via Groq) to extract structured exercise information — names, durations, sets, reps, and rest periods — which becomes an editable workout plan.',
      },
      {
        q: 'What types of YouTube videos work best?',
        a: 'Videos that include spoken exercise instructions work best — for example, a trainer counting reps or announcing exercise names like "30 seconds of squats". Videos that rely on background music with no voice instructions (e.g. some Pamela Reif videos) will not produce reliable results. Try pasting the video\'s chapter list or description instead.',
      },
      {
        q: 'The video I tried didn\'t work. What can I do?',
        a: 'A few things to try: (1) Make sure the video has captions enabled — open it in YouTube and check if CC is available. (2) Try the Transcript Import screen and paste the video\'s auto-generated captions manually. (3) Use a video with clear spoken coaching instructions. Music-only videos are not supported.',
      },
      {
        q: 'Is my privacy protected when I import a YouTube video?',
        a: 'Yes. Only the audio transcript is processed — the actual video file is never downloaded. The app only retains the minimum data needed (the transcript text) to build your workout plan. Only public workout videos should be used. See our Privacy Policy for full details.',
      },
      {
        q: 'Can I edit the workout after it\'s been imported from YouTube?',
        a: 'Absolutely. After the AI extracts the exercises, you are taken to the workout editor where you can rename exercises, adjust sets/reps or durations, add or remove exercises, and change tags before saving.',
      },
    ],
  },
  {
    id: 'progress',
    label: 'Progress & Tracking',
    icon: 'stats-chart-outline' as const,
    color: '#F97316',
    items: [
      {
        q: 'How is my progress tracked?',
        a: 'Every time you finish a workout by tapping "Save & Finish", a workout log is saved with the duration, exercises completed, and weights used. The Progress tab then visualises this data as streaks, weekly activity charts, personal records, and body weight trends.',
      },
      {
        q: 'What is a Personal Record (PR)?',
        a: 'A PR is automatically detected when you log a weighted exercise (e.g. bench press) with a higher weight than any previous session. The Progress screen shows a sparkline chart for each exercise alongside your all-time best weight and reps.',
      },
      {
        q: 'How do I track my body weight over time?',
        a: 'Go to Profile → Edit Profile and enter your current weight in the Weight field, then save. Each save creates a new data point in your weight history, which is displayed as a line chart on the Progress screen. There is no limit to how many entries you can log.',
      },
      {
        q: 'How is my streak calculated?',
        a: 'Your streak counts the number of consecutive days on which you completed and saved at least one workout. If you miss a day, your streak resets to zero. The longest streak you have ever achieved is also tracked separately.',
      },
      {
        q: 'Will the app remind me if I haven\'t increased a weight in a while?',
        a: 'This feature is planned for a future update. The app will alert you if you have been using the same weight for an exercise for more than four weeks and suggest a progressive overload increase when appropriate.',
      },
    ],
  },
  {
    id: 'account',
    label: 'Account & Privacy',
    icon: 'shield-checkmark-outline' as const,
    color: '#7C3AED',
    items: [
      {
        q: 'How is my personal data stored and protected?',
        a: 'All data is stored securely in a Supabase (PostgreSQL) database with row-level security enabled — meaning only you can access your own data. Sensitive information such as passwords is encrypted. The app complies with GDPR requirements and never sells your data to third parties.',
      },
      {
        q: 'Can I delete my account and data?',
        a: 'Yes. Go to Settings and tap "Delete Account" at the bottom of the screen. This will permanently remove your account and all associated data. This action cannot be undone.',
      },
      {
        q: 'What happens to deleted workouts?',
        a: 'Deleting a workout moves it to Recently Deleted (accessible from your Profile screen) where it is kept for 30 days before being permanently removed. You can restore it anytime during that window.',
      },
      {
        q: 'Is user testing conducted on my data?',
        a: 'Any user testing conducted as part of the FitTrack Pro academic project requires your informed consent beforehand. Participation is entirely voluntary, you may withdraw at any time, and all feedback is anonymised. Ethics approval from the University of Limerick Science & Engineering Ethics Committee was obtained prior to any user testing.',
      },
      {
        q: 'I forgot my password. How do I reset it?',
        a: 'On the Login screen, tap "Forgot Password" (if available) or contact support via Settings → Contact Us. A password reset link will be sent to your registered email address via Supabase Authentication.',
      },
    ],
  },
  {
    id: 'troubleshooting',
    label: 'Troubleshooting',
    icon: 'build-outline' as const,
    color: '#EC4899',
    items: [
      {
        q: 'The audio coach isn\'t speaking during my workout. Why?',
        a: 'Check that your device is not on silent/vibrate mode. Then go to Settings → Display & Audio and confirm Coach Voice is toggled on. On iOS, also check that the app has permission to play audio in Background App Refresh settings.',
      },
      {
        q: 'My workout data didn\'t save after I finished. What happened?',
        a: 'Workout data is only saved when you tap "Save & Finish" on the completion screen. Tapping "Don\'t Save" or navigating back without completing the flow will discard the session. Make sure you have an active internet connection when saving, as data syncs to the cloud.',
      },
      {
        q: 'The YouTube import says the transcript couldn\'t be found.',
        a: 'This usually means the video does not have captions enabled. Not all YouTube videos have auto-generated captions. Try a different video, or use the Transcript Import option and paste text from the video\'s description or chapter markers instead.',
      },
      {
        q: 'The app feels slow or unresponsive. How can I fix this?',
        a: 'Try closing and reopening the app. If the issue persists, check your internet connection (some features like YouTube import and AI parsing require WiFi). If you continue to experience problems, please report the issue via Settings → Contact Us with as much detail as possible.',
      },
    ],
  },
];

// ─── Accordion Item ───────────────────────────────────────────────────────────

function FAQItem({
  question,
  answer,
  colors,
  isLast,
}: {
  question: string;
  answer: string;
  colors: any;
  isLast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const heightAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  const toggle = () => {
    const toValue = open ? 0 : 1;
    Animated.parallel([
      Animated.spring(heightAnim, {
        toValue,
        friction: 8,
        tension: 60,
        useNativeDriver: false,
      }),
      Animated.timing(rotateAnim, {
        toValue,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
    setOpen(!open);
  };

  const maxHeight = heightAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 300],
  });

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg'],
  });

  return (
    <View
      style={[
        styles.faqItem,
        !isLast && { borderBottomWidth: 1, borderBottomColor: colors.divider },
      ]}
    >
      <TouchableOpacity
        style={styles.faqQuestion}
        onPress={toggle}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.faqQuestionText,
            { color: open ? colors.primary : colors.text },
          ]}
        >
          {question}
        </Text>
        <Animated.View style={{ transform: [{ rotate }] }}>
          <Ionicons
            name="chevron-down"
            size={18}
            color={open ? colors.primary : colors.textTertiary}
          />
        </Animated.View>
      </TouchableOpacity>

      <Animated.View style={{ maxHeight, overflow: 'hidden' }}>
        <View style={styles.faqAnswer}>
          <Text style={[styles.faqAnswerText, { color: colors.textSecondary }]}>
            {answer}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

// ─── Category Section ─────────────────────────────────────────────────────────

function FAQCategory({
  category,
  colors,
  isDark,
  searchQuery,
}: {
  category: (typeof FAQ_CATEGORIES)[0];
  colors: any;
  isDark: boolean;
  searchQuery: string;
}) {
  const filteredItems = searchQuery.trim()
    ? category.items.filter(
        (item) =>
          item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.a.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : category.items;

  if (filteredItems.length === 0) return null;

  return (
    <View style={styles.categorySection}>
      {/* Category header */}
      <View style={styles.categoryHeader}>
        <View
          style={[
            styles.categoryIconWrap,
            { backgroundColor: category.color + '20' },
          ]}
        >
          <Ionicons name={category.icon} size={18} color={category.color} />
        </View>
        <Text style={[styles.categoryLabel, { color: colors.text }]}>
          {category.label}
        </Text>
        <View
          style={[
            styles.categoryCount,
            { backgroundColor: category.color + '18' },
          ]}
        >
          <Text style={[styles.categoryCountText, { color: category.color }]}>
            {filteredItems.length}
          </Text>
        </View>
      </View>

      {/* FAQ items card */}
      <View
        style={[
          styles.faqCard,
          {
            backgroundColor: colors.card,
            borderColor: isDark ? colors.border : 'transparent',
          },
        ]}
      >
        {filteredItems.map((item, i) => (
          <FAQItem
            key={i}
            question={item.q}
            answer={item.a}
            colors={colors}
            isLast={i === filteredItems.length - 1}
          />
        ))}
      </View>
    </View>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function FAQ() {
  const { theme, colors } = useTheme();
  const isDark = theme === 'dark';
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const totalResults = searchQuery.trim()
    ? FAQ_CATEGORIES.reduce(
        (acc, cat) =>
          acc +
          cat.items.filter(
            (item) =>
              item.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
              item.a.toLowerCase().includes(searchQuery.toLowerCase()),
          ).length,
        0,
      )
    : null;

  const displayedCategories =
    activeCategory
      ? FAQ_CATEGORIES.filter((c) => c.id === activeCategory)
      : FAQ_CATEGORIES;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <Header title="Help & FAQ" subtitle="Frequently asked questions" />

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Search bar ─────────────────────────────────────────────────── */}
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.card,
              borderColor: searchQuery ? colors.primary : colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={18} color={colors.textTertiary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search questions…"
            placeholderTextColor={colors.textTertiary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color={colors.textTertiary} />
            </TouchableOpacity>
          )}
        </View>

        {/* ── Search result count ─────────────────────────────────────────── */}
        {searchQuery.trim().length > 0 && (
          <Text style={[styles.searchResultLabel, { color: colors.textSecondary }]}>
            {totalResults === 0
              ? 'No results found'
              : `${totalResults} result${totalResults !== 1 ? 's' : ''} for "${searchQuery}"`}
          </Text>
        )}

        {/* ── Category filter pills (hidden during search) ────────────────── */}
        {!searchQuery && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.pillRow}
            style={{ marginBottom: 8 }}
          >
            <TouchableOpacity
              style={[
                styles.pill,
                {
                  backgroundColor:
                    activeCategory === null ? colors.primary : colors.card,
                  borderColor:
                    activeCategory === null ? colors.primary : colors.border,
                },
              ]}
              onPress={() => setActiveCategory(null)}
              activeOpacity={0.75}
            >
              <Text
                style={[
                  styles.pillText,
                  { color: activeCategory === null ? '#fff' : colors.textSecondary },
                ]}
              >
                All
              </Text>
            </TouchableOpacity>

            {FAQ_CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.id;
              return (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.pill,
                    {
                      backgroundColor: isActive
                        ? cat.color + '20'
                        : colors.card,
                      borderColor: isActive ? cat.color : colors.border,
                    },
                  ]}
                  onPress={() =>
                    setActiveCategory(isActive ? null : cat.id)
                  }
                  activeOpacity={0.75}
                >
                  <Ionicons
                    name={cat.icon}
                    size={13}
                    color={isActive ? cat.color : colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.pillText,
                      { color: isActive ? cat.color : colors.textSecondary },
                    ]}
                  >
                    {cat.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* ── FAQ categories ──────────────────────────────────────────────── */}
        {displayedCategories.map((cat) => (
          <FAQCategory
            key={cat.id}
            category={cat}
            colors={colors}
            isDark={isDark}
            searchQuery={searchQuery}
          />
        ))}

        {/* ── No results empty state ──────────────────────────────────────── */}
        {searchQuery.trim() && totalResults === 0 && (
          <View style={styles.emptyState}>
            <Text style={{ fontSize: 44 }}>🔍</Text>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              Nothing found
            </Text>
            <Text style={[styles.emptyBody, { color: colors.textSecondary }]}>
              Try a different search term, or browse the categories above.
            </Text>
          </View>
        )}

        {/* ── Still need help? ────────────────────────────────────────────── */}
        {!searchQuery && (
          <View
            style={[
              styles.helpBanner,
              {
                backgroundColor: colors.primary + '12',
                borderColor: colors.primary + '30',
              },
            ]}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.helpTitle, { color: colors.text }]}>
                Still need help?
              </Text>
              <Text style={[styles.helpBody, { color: colors.textSecondary }]}>
                Couldn't find your answer? Reach out via Contact Us and we'll get back to you within 1–2 business days.
              </Text>
            </View>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { padding: 20, paddingTop: 16 },

  // Search
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 10,
  },
  searchInput: { flex: 1, fontSize: 15 },
  searchResultLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 14,
    marginLeft: 4,
  },

  // Category filter pills
  pillRow: { gap: 8, paddingRight: 8, paddingBottom: 4 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  pillText: { fontSize: 12, fontWeight: '600' },

  // Category section
  categorySection: { marginBottom: 20 },
  categoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
    paddingHorizontal: 2,
  },
  categoryIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryLabel: { flex: 1, fontSize: 15, fontWeight: '700' },
  categoryCount: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
  },
  categoryCountText: { fontSize: 12, fontWeight: '700' },

  // FAQ Card
  faqCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },

  // FAQ Item
  faqItem: { paddingHorizontal: 16 },
  faqQuestion: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingVertical: 16,
  },
  faqQuestionText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 20,
  },
  faqAnswer: { paddingBottom: 16 },
  faqAnswerText: {
    fontSize: 13,
    lineHeight: 20,
  },

  // Empty state
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700' },
  emptyBody: { fontSize: 14, textAlign: 'center', lineHeight: 20 },

  // Still need help banner
  helpBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
  },
  helpTitle: { fontSize: 14, fontWeight: '700', marginBottom: 4 },
  helpBody: { fontSize: 13, lineHeight: 19 },
});