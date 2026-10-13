import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  getFlashcards,
  getFlashcardsByReviewer,
  getSrsProgress,
  calculateNextSrs,
  SQLiteFlashcard,
  saveSrsProgress,
  SrsRating,
} from '../../../database/flashcards';
import { saveStudyActivity } from '../../../database/activity';
import { useAppTheme } from '../../../utils/ThemeContext';

export default function FlashcardStudyScreen() {
  const { dark } = useAppTheme();
  const { id, materialId: materialParam } = useLocalSearchParams<{ id: string; materialId?: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;
  const materialId = Array.isArray(materialParam) ? materialParam[0] : materialParam;

  const [cards, setCards] = useState<SQLiteFlashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);

  // 3D Flip animation state
  const [flipAnim] = useState(() => new Animated.Value(0));

  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['0deg', '180deg'],
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 180],
    outputRange: ['180deg', '360deg'],
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [1, 0],
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [89, 90],
    outputRange: [0, 1],
  });

  const handleFlip = () => {
    const nextState = !isFlipped;
    setIsFlipped(nextState);
    Animated.spring(flipAnim, {
      toValue: nextState ? 180 : 0,
      friction: 8,
      tension: 10,
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    let active = true;
    const fetchCards = async () => {
      if (materialId) {
        return getFlashcards(materialId);
      }
      return getFlashcardsByReviewer(reviewerId ?? '');
    };
    fetchCards()
      .then(items => {
        if (active) setCards(items);
      })
      .catch(error => Alert.alert('Could not load flashcards', String(error)))
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [materialId, reviewerId]);

  const rate = async (rating: SrsRating) => {
    const card = cards[index];
    try {
      const currentProgress = await getSrsProgress(card.flashcard_id);
      const nextSrs = calculateNextSrs(currentProgress, rating);
      await saveSrsProgress(card.flashcard_id, {
        ease_factor: nextSrs.ease_factor,
        interval_days: nextSrs.interval_days,
        repetitions: nextSrs.repetitions,
        next_review_date: nextSrs.next_review_date,
      });

      if (index < cards.length - 1) {
        setIndex(prev => prev + 1);
        setIsFlipped(false);
        flipAnim.setValue(0);
      } else {
        await saveStudyActivity({
          reviewer_id: reviewerId,
          activity_type: 'flashcard_review',
          ended_at: new Date().toISOString(),
        });
        setFinished(true);
      }
    } catch (error) {
      Alert.alert('Could not save review progress', String(error));
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, dark && { backgroundColor: '#0B1220' }]}>
        <ActivityIndicator color="#2563EB" />
        <Text style={[styles.help, dark && { color: '#AAB7CC' }]}>Loading your saved cards...</Text>
      </SafeAreaView>
    );
  }

  if (!cards.length) {
    return (
      <SafeAreaView style={[styles.container, dark && { backgroundColor: '#0B1220' }]}>
        <View style={styles.top}>
          <Pressable onPress={() => router.back()} accessibilityRole="button">
            <Ionicons name="chevron-back" size={25} color={dark ? '#F2F6FF' : '#15264B'} />
          </Pressable>
          <Text style={[styles.title, dark && { color: '#F2F6FF' }]}>Flashcards</Text>
          <View style={{ width: 25 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="albums-outline" size={52} color="#2563EB" />
          <Text style={[styles.heading, dark && { color: '#F2F6FF' }]}>No cards yet</Text>
          <Text style={[styles.help, dark && { color: '#AAB7CC' }]}>
            Add flashcards for this reviewer, then come back to study them.
          </Text>
          <Pressable
            style={styles.primary}
            onPress={() => router.push(`/reviewer/${reviewerId}/flashcard-generator`)}
          >
            <Text style={styles.primaryText}>ADD FLASHCARDS</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  if (finished) {
    return (
      <SafeAreaView style={[styles.container, dark && { backgroundColor: '#0B1220' }]}>
        <View style={styles.center}>
          <Ionicons name="checkmark-circle" size={60} color="#2563EB" />
          <Text style={[styles.heading, dark && { color: '#F2F6FF' }]}>Review complete!</Text>
          <Text style={[styles.help, dark && { color: '#AAB7CC' }]}>
            You reviewed {cards.length} saved cards. Your ratings have been saved on this device.
          </Text>
          <Pressable
            style={styles.primary}
            onPress={() => {
              if (reviewerId) {
                router.replace(`/reviewer/${reviewerId}`);
              } else {
                router.back();
              }
            }}
          >
            <Text style={styles.primaryText}>BACK TO REVIEWER</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const current = cards[index];

  return (
    <SafeAreaView style={[styles.container, dark && { backgroundColor: '#0B1220' }]}>
      {/* Top Header */}
      <View style={styles.top}>
        <Pressable onPress={() => router.back()} accessibilityRole="button">
          <Ionicons name="close" size={24} color={dark ? '#F2F6FF' : '#15264B'} />
        </Pressable>
        <Text style={[styles.count, dark && { color: '#AAB7CC' }]}>
          CARD {index + 1} OF {cards.length}
        </Text>
        <Pressable onPress={handleFlip} hitSlop={10} accessibilityRole="button">
          <Ionicons name="swap-horizontal" size={22} color="#2563EB" />
        </Pressable>
      </View>

      {/* Progress Bar */}
      <View style={[styles.progress, dark && { backgroundColor: '#1E293B' }]}>
        <View style={[styles.progressFill, { width: `${((index + 1) / cards.length) * 100}%` }]} />
      </View>

      {/* 3D Flip Card Container */}
      <View style={styles.cardWrapper}>
        <Pressable
          style={({ pressed }) => [styles.cardTouchable, pressed && { opacity: 0.96 }]}
          onPress={handleFlip}
          accessibilityRole="button"
          accessibilityLabel="Flip card"
        >
          {/* FRONT (QUESTION) */}
          <Animated.View
            pointerEvents={isFlipped ? 'none' : 'auto'}
            style={[
              styles.cardFace,
              dark && styles.cardFaceDark,
              {
                opacity: frontOpacity,
                transform: [{ perspective: 1000 }, { rotateY: frontInterpolate }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.badge, styles.questionBadge]}>
                <Ionicons name="help-circle" size={14} color="#2563EB" style={{ marginRight: 4 }} />
                <Text style={styles.questionBadgeText}>QUESTION</Text>
              </View>
              <Text style={[styles.deckHint, dark && { color: '#64748B' }]}>Tap to flip</Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.cardBody}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <Text style={[styles.cardText, dark && { color: '#F2F6FF' }]}>
                {current.question}
              </Text>
            </ScrollView>

            <View style={styles.cardFooter}>
              <Ionicons name="sync-outline" size={15} color="#94A3B8" />
              <Text style={[styles.flipHintText, dark && { color: '#94A3B8' }]}>
                Tap anywhere on card to flip
              </Text>
            </View>
          </Animated.View>

          {/* BACK (ANSWER) */}
          <Animated.View
            pointerEvents={isFlipped ? 'auto' : 'none'}
            style={[
              styles.cardFace,
              dark && styles.cardFaceDark,
              {
                opacity: backOpacity,
                transform: [{ perspective: 1000 }, { rotateY: backInterpolate }],
              },
            ]}
          >
            <View style={styles.cardHeader}>
              <View style={[styles.badge, styles.answerBadge]}>
                <Ionicons name="checkmark-circle" size={14} color="#10B981" style={{ marginRight: 4 }} />
                <Text style={styles.answerBadgeText}>ANSWER</Text>
              </View>
              <Text style={[styles.deckHint, dark && { color: '#64748B' }]}>Tap to flip back</Text>
            </View>

            <ScrollView
              contentContainerStyle={styles.cardBody}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              <Text style={[styles.cardText, styles.cardAnswerText, dark && { color: '#F2F6FF' }]}>
                {current.answer}
              </Text>
            </ScrollView>

            <View style={styles.cardFooter}>
              <Ionicons name="sync-outline" size={15} color="#94A3B8" />
              <Text style={[styles.flipHintText, dark && { color: '#94A3B8' }]}>
                Tap anywhere to flip back to question
              </Text>
            </View>
          </Animated.View>
        </Pressable>
      </View>

      {/* Bottom Controls */}
      {isFlipped ? (
        <View style={styles.ratingsWrapper}>
          <Text style={[styles.ratingsPrompt, dark && { color: '#AAB7CC' }]}>
            HOW WELL DID YOU REMEMBER THIS?
          </Text>
          <View style={styles.ratings}>
            {[
              { label: 'Easy', desc: '5d', color: '#10B981', bg: '#ECFDF5', darkBg: '#102A20' },
              { label: 'Medium', desc: '3d', color: '#2563EB', bg: '#EFF6FF', darkBg: '#112340' },
              { label: 'Hard', desc: '1d', color: '#F59E0B', bg: '#FFFBEB', darkBg: '#2A2012' },
              { label: 'Again', desc: '< 1m', color: '#EF4444', bg: '#FEF2F2', darkBg: '#2A1618' },
            ].map(r => (
              <Pressable
                key={r.label}
                style={[
                  styles.rating,
                  {
                    borderColor: r.color,
                    backgroundColor: dark ? r.darkBg : r.bg,
                  },
                ]}
                onPress={() => rate(r.label as SrsRating)}
                accessibilityRole="button"
                accessibilityLabel={`Rate as ${r.label}`}
              >
                <Text style={[styles.ratingText, { color: r.color }]}>{r.label}</Text>
                <Text style={[styles.ratingInterval, { color: r.color }]}>{r.desc}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.actionWrapper}>
          <Pressable style={styles.primary} onPress={handleFlip} accessibilityRole="button">
            <Ionicons name="sync" size={17} color="#FFF" style={{ marginRight: 8 }} />
            <Text style={styles.primaryText}>REVEAL ANSWER</Text>
          </Pressable>
        </View>
      )}

      <Text style={[styles.footer, dark && { color: '#64748B' }]}>
        Spaced repetition intervals are calculated and saved offline.
      </Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F4F7FF',
    padding: 20,
  },
  top: {
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#15264B',
  },
  count: {
    fontSize: 12,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  progress: {
    height: 7,
    backgroundColor: '#DCE5F2',
    borderRadius: 8,
    overflow: 'hidden',
    marginTop: 4,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  cardWrapper: {
    flex: 1,
    marginTop: 18,
    marginBottom: 14,
  },
  cardTouchable: {
    flex: 1,
    position: 'relative',
  },
  cardFace: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#DCE5F2',
    borderRadius: 24,
    padding: 24,
    justifyContent: 'space-between',
    backfaceVisibility: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 14,
    elevation: 4,
  },
  cardFaceDark: {
    backgroundColor: '#172235',
    borderColor: '#2B3A52',
    shadowOpacity: 0.3,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  questionBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  questionBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#2563EB',
  },
  answerBadge: {
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  answerBadgeText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#10B981',
  },
  deckHint: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  cardBody: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 16,
  },
  cardText: {
    fontSize: 22,
    fontWeight: '700',
    color: '#15264B',
    textAlign: 'center',
    lineHeight: 32,
  },
  cardAnswerText: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 30,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 8,
  },
  flipHintText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  actionWrapper: {
    marginTop: 4,
  },
  primary: {
    backgroundColor: '#2563EB',
    paddingHorizontal: 22,
    paddingVertical: 15,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  primaryText: {
    color: '#FFF',
    fontWeight: '900',
    letterSpacing: 0.5,
    fontSize: 14,
  },
  ratingsWrapper: {
    marginTop: 4,
  },
  ratingsPrompt: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 10,
  },
  ratings: {
    flexDirection: 'row',
    gap: 8,
  },
  rating: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontWeight: '900',
    fontSize: 14,
  },
  ratingInterval: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    opacity: 0.85,
  },
  footer: {
    fontSize: 11,
    color: '#888',
    textAlign: 'center',
    marginTop: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
    padding: 18,
  },
  heading: {
    fontSize: 24,
    fontWeight: '900',
    color: '#15264B',
  },
  help: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 21,
    marginTop: 10,
  },
});
