import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  StatusBar,
  TextInput,
  Animated,
  Dimensions,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { WorkoutsStackParamList } from "../../navigation/WorkoutStack";
import {
  fetchWorkoutById,
  deleteWorkout,
  updateWorkout,
} from "../../services/WorkoutService";
import { Exercise } from "../../domain/workout";
import { useTheme } from "../../context/ThemeContext";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from 'expo-haptics';
import Svg, { Circle, Defs, LinearGradient, Stop } from 'react-native-svg';

type ExerciseCompletion = {
  [exerciseId: string]: boolean;
};

type Props = NativeStackScreenProps<WorkoutsStackParamList, "WorkoutDetails">;

const { width } = Dimensions.get("window");

// Circular Progress Component
interface CircularProgressProps {
  percentage: number;
  size: number;
  strokeWidth: number;
  color: string;
  completedCount: number;
  totalCount: number;
}

const CircularProgress: React.FC<CircularProgressProps> = ({
  percentage,
  size,
  strokeWidth,
  color,
  completedCount,
  totalCount,
}) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      <Svg width={size} height={size}>
        <Defs>
          <LinearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <Stop offset="0%" stopColor={color} stopOpacity="1" />
            <Stop offset="100%" stopColor={color} stopOpacity="0.6" />
          </LinearGradient>
        </Defs>
        
        {/* Background Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        
        {/* Progress Circle */}
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="url(#progressGradient)"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          rotation="-90"
          origin={`${size / 2}, ${size / 2}`}
        />
      </Svg>
      
      {/* Center Content */}
      <View style={styles.circularProgressCenter}>
        <Text style={styles.progressNumber}>{completedCount}</Text>
        <Text style={styles.progressDivider}>/</Text>
        <Text style={styles.progressTotal}>{totalCount}</Text>
      </View>
    </View>
  );
};

export default function WorkoutDetails({ route, navigation }: Props) {
  const { workoutId } = route.params;
  const [workoutTitle, setWorkoutTitle] = useState("");
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [completions, setCompletions] = useState<ExerciseCompletion>({});
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [tempTitle, setTempTitle] = useState("");
  const [workoutType, setWorkoutType] = useState<"strength" | "cardio">("strength");
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(0));
  const [scaleAnim] = useState(new Animated.Value(0.95));

  const { theme, colors } = useTheme();
  const isDark = theme === "dark";

  useEffect(() => {
    loadWorkout();
    
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 600,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      })
    ]).start();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadWorkout();
    });

    return unsubscribe;
  }, [navigation]);

  async function loadWorkout() {
    setLoading(true);
    const { data } = await fetchWorkoutById(workoutId);
    if (data) {
      setWorkoutTitle(data.title);
      setExercises(data.exercises);
      setWorkoutType(
        data.category === "cardio" ||
          data.exercises.some((e: Exercise) => e.duration)
          ? "cardio"
          : "strength"
      );
      const initialCompletions: ExerciseCompletion = {};
      data.exercises.forEach((ex: Exercise) => {
        initialCompletions[ex.id] = false;
      });
      setCompletions(initialCompletions);
    }
    setLoading(false);
  }

  const toggleCompletion = (exerciseId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setCompletions((prev) => ({
      ...prev,
      [exerciseId]: !prev[exerciseId],
    }));
  };

  const formatDuration = (seconds?: number): string => {
    if (!seconds) return "";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDelete = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      "Delete Workout",
      "Are you sure you want to delete this workout? This action cannot be undone.",
      [
        { 
          text: "Cancel", 
          style: "cancel",
          onPress: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            const { error } = await deleteWorkout(workoutId);
            if (error) {
              Alert.alert("Error", "Failed to delete workout");
            } else {
              navigation.goBack();
            }
          },
        },
      ]
    );
  };

  const handleEdit = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    navigation.navigate("EditWorkout", { workoutId });
  };

  const handleSaveTitle = async () => {
    if (tempTitle.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      const { error } = await updateWorkout(workoutId, {
        title: tempTitle,
      });
      if (error) {
        Alert.alert("Error", "Failed to update workout title");
      } else {
        setWorkoutTitle(tempTitle);
        setIsEditingTitle(false);
        await loadWorkout();
      }
    }
  };

  if (loading) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: colors.background }]}>
        <View style={styles.loadingAnimation}>
          <Animated.View 
            style={[
              styles.loadingDot, 
              { backgroundColor: colors.primary },
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1, 0.3]
                })
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.loadingDot, 
              { backgroundColor: colors.primary },
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [1, 0.3, 1]
                })
              }
            ]} 
          />
          <Animated.View 
            style={[
              styles.loadingDot, 
              { backgroundColor: colors.primary },
              {
                opacity: fadeAnim.interpolate({
                  inputRange: [0, 0.5, 1],
                  outputRange: [0.3, 1, 0.3]
                })
              }
            ]} 
          />
        </View>
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          Loading workout...
        </Text>
      </View>
    );
  }

  const completedCount = Object.values(completions).filter(Boolean).length;
  const completionPercentage = exercises.length > 0 ? (completedCount / exercises.length) * 100 : 0;
  const workoutTypeIcon = workoutType === "cardio" ? "flash" : "barbell";
  const workoutTypeColor = workoutType === "cardio" ? "#4876ec" : "#428df7";
  const isFullyCompleted = completionPercentage === 100;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor={colors.background}
      />

      {/* Minimal Header */}
      <View style={[styles.header, { borderBottomColor: isDark ? colors.border : 'transparent' }]}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="chevron-back" size={24} color={colors.text} />
            <Text style={[styles.backText, { color: colors.text }]}>Back</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: isDark ? colors.surface : colors.card }]} 
            onPress={handleEdit}
            activeOpacity={0.7}
          >
            <Ionicons name="create-outline" size={20} color={colors.text} />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.iconButton, { backgroundColor: isDark ? colors.surface : '#FEE2E2' }]} 
            onPress={handleDelete}
            activeOpacity={0.7}
          >
            <Ionicons name="trash-outline" size={20} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        contentInsetAdjustmentBehavior="automatic"
      >
        {/* Workout Info Card */}
        <Animated.View style={[
          styles.infoCard,
          {
            backgroundColor: colors.card,
            opacity: fadeAnim,
            transform: [
              { scale: scaleAnim },
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [30, 0]
                })
              }
            ]
          }
        ]}>
          {/* Workout Title */}
          <View style={styles.titleSection}>
            <View style={styles.titleRow}>
              <View style={[styles.workoutTypeIcon, { backgroundColor: workoutTypeColor + '20' }]}>
                <Ionicons name={workoutTypeIcon} size={24} color={workoutTypeColor} />
              </View>
              {isEditingTitle ? (
                <View style={styles.editTitleWrapper}>
                  <TextInput
                    style={[
                      styles.titleInput, 
                      { 
                        color: colors.text,
                        borderBottomColor: workoutTypeColor,
                      }
                    ]}
                    placeholder="Workout title"
                    placeholderTextColor={colors.textSecondary}
                    value={tempTitle}
                    onChangeText={setTempTitle}
                    autoFocus
                  />
                  <View style={styles.titleEditButtons}>
                    <TouchableOpacity 
                      style={[styles.saveTitleButton, { backgroundColor: workoutTypeColor }]} 
                      onPress={handleSaveTitle}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="checkmark" size={20} color="#FFFFFF" />
                    </TouchableOpacity>
                    <TouchableOpacity 
                      style={[styles.cancelTitleButton, { backgroundColor: colors.surface }]} 
                      onPress={() => setIsEditingTitle(false)}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="close" size={20} color={colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.titleTouchable}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setIsEditingTitle(true);
                    setTempTitle(workoutTitle);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.workoutTitle, { color: colors.text }]}>{workoutTitle}</Text>
                  <Ionicons name="pencil" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Progress Stats with Circular Progress */}
          <View style={styles.progressSection}>
            <View style={styles.progressContainer}>
              <CircularProgress
                percentage={completionPercentage}
                size={140}
                strokeWidth={14}
                color={isFullyCompleted ? '#10B981' : workoutTypeColor}
                completedCount={completedCount}
                totalCount={exercises.length}
              />
              
              {isFullyCompleted && (
                <Animated.View 
                  style={[
                    styles.completionBadgeOverlay,
                    {
                      opacity: fadeAnim,
                      transform: [{ scale: scaleAnim }]
                    }
                  ]}
                >
                  <View style={styles.completionCheckmark}>
                    <Ionicons name="checkmark-circle" size={24} color="#10B981" />
                  </View>
                </Animated.View>
              )}
            </View>
            
            <View style={[styles.statsGrid, { backgroundColor: isDark ? colors.surface : '#F9FAFB' }]}>
              <View style={styles.statBlock}>
                <View style={[styles.statIconContainer, { backgroundColor: workoutTypeColor + '15' }]}>
                  <Ionicons name="list" size={18} color={workoutTypeColor} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{exercises.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Exercises</Text>
              </View>
              
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              
              <View style={styles.statBlock}>
                <View style={[styles.statIconContainer, { backgroundColor: workoutTypeColor + '15' }]}>
                  <Ionicons 
                    name={workoutType === "strength" ? "repeat" : "time"} 
                    size={18} 
                    color={workoutTypeColor} 
                  />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {workoutType === "strength" 
                    ? exercises.reduce((sum, ex) => sum + (ex.sets || 0), 0)
                    : Math.floor(exercises.reduce((sum, ex) => sum + (ex.duration || 0), 0) / 60)
                  }
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>
                  {workoutType === "strength" ? "Total Sets" : "Minutes"}
                </Text>
              </View>
              
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              
              <View style={styles.statBlock}>
                <View style={[styles.statIconContainer, { backgroundColor: workoutTypeColor + '15' }]}>
                  <Ionicons name="trending-up" size={18} color={workoutTypeColor} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {Math.round(completionPercentage)}%
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Complete</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Exercises Section */}
        <View style={styles.exercisesSection}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Exercise List
              </Text>
              <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
                Tap to mark as complete
              </Text>
            </View>
            <View style={[
              styles.completionBadge, 
              { 
                backgroundColor: isFullyCompleted ? '#10B98120' : workoutTypeColor + '20',
                borderColor: isFullyCompleted ? '#10B981' : workoutTypeColor,
              }
            ]}>
              <Ionicons 
                name={isFullyCompleted ? "checkmark-done" : "checkmark"} 
                size={14} 
                color={isFullyCompleted ? '#10B981' : workoutTypeColor} 
              />
              <Text style={[
                styles.completionText, 
                { color: isFullyCompleted ? '#10B981' : workoutTypeColor }
              ]}>
                {Math.round(completionPercentage)}%
              </Text>
            </View>
          </View>

          {exercises.length === 0 ? (
            <Animated.View style={[
              styles.emptyExercises,
              {
                opacity: fadeAnim,
                transform: [{ scale: scaleAnim }]
              }
            ]}>
              <View style={[styles.emptyIcon, { backgroundColor: isDark ? colors.surface : '#F3F4F6' }]}>
                <Ionicons name="fitness-outline" size={40} color={colors.textSecondary} />
              </View>
              <Text style={[styles.emptyText, { color: colors.text }]}>
                No exercises yet
              </Text>
              <Text style={[styles.emptySubtext, { color: colors.textSecondary }]}>
                Add exercises to get started
              </Text>
              <TouchableOpacity
                style={[
                  styles.addExerciseButton, 
                  { 
                    borderColor: workoutTypeColor,
                    backgroundColor: workoutTypeColor + '10',
                  }
                ]}
                onPress={handleEdit}
                activeOpacity={0.7}
              >
                <Ionicons name="add-circle" size={22} color={workoutTypeColor} />
                <Text style={[styles.addExerciseText, { color: workoutTypeColor }]}>
                  Add Exercises
                </Text>
              </TouchableOpacity>
            </Animated.View>
          ) : (
            <View style={styles.exerciseList}>
              {exercises.map((exercise, index) => {
                const isCompleted = completions[exercise.id];
                const delay = index * 50;
                
                return (
                  <Animated.View
                    key={exercise.id}
                    style={[
                      styles.exerciseItem,
                      {
                        backgroundColor: isCompleted 
                          ? (isDark ? '#065F4620' : '#D1FAE5')
                          : colors.card,
                        borderColor: isCompleted ? '#10B981' : (isDark ? colors.border : 'transparent'),
                        borderWidth: isCompleted ? 2 : 1,
                        opacity: fadeAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 1]
                        }),
                        transform: [{
                          translateX: fadeAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-50, 0]
                          })
                        }]
                      }
                    ]}
                  >
                    <TouchableOpacity
                      style={styles.exerciseContent}
                      onPress={() => toggleCompletion(exercise.id)}
                      activeOpacity={0.7}
                    >
                      {/* Left: Completion & Number */}
                      <View style={styles.exerciseLeft}>
                        <View style={[
                          styles.completionCircle,
                          { 
                            borderColor: isCompleted ? '#10B981' : colors.border,
                            backgroundColor: isCompleted ? '#10B981' : 'transparent',
                          }
                        ]}>
                          {isCompleted && (
                            <Ionicons name="checkmark" size={18} color="#FFFFFF" />
                          )}
                        </View>
                        <Text style={[
                          styles.exerciseNumber, 
                          { 
                            color: isCompleted ? '#10B981' : colors.textSecondary 
                          }
                        ]}>
                          {String(index + 1).padStart(2, '0')}
                        </Text>
                      </View>

                      {/* Middle: Exercise Details */}
                      <View style={styles.exerciseMiddle}>
                        <Text style={[
                          styles.exerciseName,
                          {
                            color: isCompleted ? (isDark ? '#6EE7B7' : '#059669') : colors.text,
                            textDecorationLine: isCompleted ? "line-through" : "none",
                          }
                        ]}>
                          {exercise.name}
                        </Text>
                        
                        {workoutType === "strength" ? (
                          <View style={styles.strengthDetails}>
                            <View style={[
                              styles.detailChip, 
                              { 
                                backgroundColor: isDark ? workoutTypeColor + '20' : workoutTypeColor + '15',
                              }
                            ]}>
                              <Ionicons name="repeat" size={14} color={workoutTypeColor} />
                              <Text style={[styles.detailText, { color: workoutTypeColor }]}>
                                {exercise.sets} × {exercise.reps}
                              </Text>
                            </View>
                            {exercise.weight && (
                              <View style={[
                                styles.detailChip, 
                                { 
                                  backgroundColor: isDark ? workoutTypeColor + '20' : workoutTypeColor + '15',
                                }
                              ]}>
                                <Ionicons name="fitness" size={14} color={workoutTypeColor} />
                                <Text style={[styles.detailText, { color: workoutTypeColor }]}>
                                  {exercise.weight}kg
                                </Text>
                              </View>
                            )}
                          </View>
                        ) : (
                          <View style={styles.cardioDetails}>
                            <View style={[
                              styles.durationChip, 
                              { 
                                backgroundColor: isDark ? workoutTypeColor + '20' : workoutTypeColor + '15',
                              }
                            ]}>
                              <Ionicons name="time-outline" size={16} color={workoutTypeColor} />
                              <Text style={[styles.durationText, { color: workoutTypeColor }]}>
                                {formatDuration(exercise.duration)}
                              </Text>
                            </View>
                            {exercise.restTime && exercise.restTime > 0 && (
                              <View style={[
                                styles.durationChip, 
                                { 
                                  backgroundColor: isDark ? '#F9731620' : '#FED7AA',
                                }
                              ]}>
                                <Ionicons name="pause" size={14} color="#F97316" />
                                <Text style={[styles.durationText, { color: '#F97316' }]}>
                                  {exercise.restTime}s rest
                                </Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>

                      {/* Right: Action */}
                      <View style={styles.exerciseRight}>
                        <Ionicons 
                          name={isCompleted ? "checkmark-circle" : "chevron-forward"} 
                          size={22} 
                          color={isCompleted ? '#10B981' : colors.textSecondary} 
                        />
                      </View>
                    </TouchableOpacity>
                  </Animated.View>
                );
              })}
            </View>
          )}
        </View>

        {/* Action Buttons */}
        {exercises.length > 0 && (
          <View style={styles.actionButtons}>
            {workoutType === "cardio" && (
              <TouchableOpacity
                style={[
                  styles.startButton,
                  {
                    backgroundColor: workoutTypeColor,
                    shadowColor: workoutTypeColor,
                    opacity: 1,
                  },
                ]}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                  navigation.navigate("IntervalTimerPlayback", {
                    exercises: exercises.map(ex => ({
                      name: ex.name,
                      duration: ex.duration || 0,
                      restTime: ex.restTime || 0,
                    })),
                    workoutName: workoutTitle,
                  });
                }}
                activeOpacity={0.8}
              >
                <View style={styles.startButtonInner}>
                  <View style={styles.startButtonIcon}>
                    <Ionicons name="play-circle" size={32} color="#FFFFFF" />
                  </View>
                  <View style={styles.startButtonTexts}>
                    <Text style={styles.startButtonTitle}>Start Timer</Text>
                    <Text style={styles.startButtonSubtitle}>Begin interval training</Text>
                  </View>
                  <Ionicons name="arrow-forward" size={24} color="rgba(255,255,255,0.8)" />
                </View>
              </TouchableOpacity>
            )}

            
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingAnimation: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  loadingDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: "500",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingRight: 8,
  },
  backText: {
    fontSize: 17,
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  infoCard: {
    borderRadius: 28,
    padding: 28,
    marginTop: 16,
    marginBottom: 28,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  titleSection: {
    marginBottom: 32,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  workoutTypeIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  editTitleWrapper: {
    flex: 1,
  },
  titleInput: {
    fontSize: 26,
    fontWeight: "800",
    paddingVertical: 10,
    borderBottomWidth: 3,
  },
  titleEditButtons: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
    justifyContent: "flex-end",
  },
  saveTitleButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  cancelTitleButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  titleTouchable: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingRight: 4,
  },
  workoutTitle: {
    fontSize: 26,
    fontWeight: "800",
    flex: 1,
    lineHeight: 34,
  },
  progressSection: {
    alignItems: "center",
    gap: 28,
  },
  progressContainer: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  circularProgressCenter: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  progressNumber: {
    fontSize: 38,
    fontWeight: "900",
    color: '#1F2937',
    lineHeight: 42,
  },
  progressDivider: {
    fontSize: 24,
    fontWeight: "700",
    color: '#9CA3AF',
    marginHorizontal: 4,
  },
  progressTotal: {
    fontSize: 24,
    fontWeight: "700",
    color: '#9CA3AF',
  },
  completionBadgeOverlay: {
    position: 'absolute',
    bottom: -8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  completionCheckmark: {
    padding: 4,
  },
  statsGrid: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    padding: 6,
    width: "100%",
  },
  statBlock: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    gap: 8,
  },
  statIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 22,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
  },
  statDivider: {
    width: 1.5,
    height: 40,
  },
  exercisesSection: {
    marginBottom: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontWeight: "500",
  },
  completionBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
  },
  completionText: {
    fontSize: 15,
    fontWeight: "800",
  },
  emptyExercises: {
    alignItems: "center",
    paddingVertical: 60,
    borderRadius: 24,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    fontWeight: "500",
    marginBottom: 28,
  },
  addExerciseButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 18,
    borderWidth: 2,
  },
  addExerciseText: {
    fontSize: 17,
    fontWeight: "700",
  },
  exerciseList: {
    gap: 14,
  },
  exerciseItem: {
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  exerciseContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 18,
    gap: 16,
  },
  exerciseLeft: {
    alignItems: "center",
    gap: 10,
  },
  completionCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2.5,
    alignItems: "center",
    justifyContent: "center",
  },
  exerciseNumber: {
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  exerciseMiddle: {
    flex: 1,
    gap: 10,
  },
  exerciseName: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  strengthDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: 'wrap',
  },
  detailChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  detailText: {
    fontSize: 13,
    fontWeight: "700",
  },
  cardioDetails: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: 'wrap',
  },
  durationChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
  },
  durationText: {
    fontSize: 14,
    fontWeight: "800",
  },
  exerciseRight: {
    padding: 4,
  },
  actionButtons: {
    gap: 14,
  },
  startButton: {
    borderRadius: 22,
    padding: 22,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 20,
    elevation: 10,
  },
  startButtonInner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  startButtonIcon: {
    width: 64,
    height: 64,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  startButtonTexts: {
    flex: 1,
  },
  startButtonTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    marginBottom: 4,
  },
  startButtonSubtitle: {
    color: "rgba(255,255,255,0.95)",
    fontSize: 14,
    fontWeight: "600",
  },
  editWorkoutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 18,
    borderRadius: 18,
    borderWidth: 2,
  },
  editWorkoutText: {
    fontSize: 17,
    fontWeight: "700",
  },
});