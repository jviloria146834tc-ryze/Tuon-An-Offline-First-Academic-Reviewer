import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getReviewerById,
  SQLiteReviewer,
} from '../../database/reviewers';

import {
  getMaterialsByReviewer,
  SQLiteMaterial,
} from '../../database/materials';

export default function ReviewerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const reviewerId = Array.isArray(id) ? id[0] : id;

  const [reviewer, setReviewer] =
    useState<SQLiteReviewer | null>(null);

  const [materials, setMaterials] =
    useState<SQLiteMaterial[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useFocusEffect(useCallback(() => {
    let active = true;
    const loadReviewer = async () => {
      setLoading(true);
      setLoadError('');
      try {
        if (!reviewerId) {
          setReviewer(null);
          setMaterials([]);
          return;
        }
        const reviewerData = await getReviewerById(reviewerId);
        if (!active) return;
        setReviewer(reviewerData);
        setMaterials(reviewerData ? await getMaterialsByReviewer(reviewerId) : []);
      } catch (error) {
        if (!active) return;
        setLoadError(error instanceof Error ? error.message : 'Could not load reviewer data.');
        setReviewer(null);
        setMaterials([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadReviewer();
    return () => { active = false; };
  }, [reviewerId]));

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <Ionicons
            name="hourglass-outline"
            size={40}
            color="#58CC02"
          />

          <Text style={styles.loadingTitle}>
            Loading reviewer...
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!reviewer) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <View style={styles.notFoundIcon}>
            <Ionicons
              name="alert-circle-outline"
              size={40}
              color="#FF9600"
            />
          </View>

          <Text style={styles.notFoundTitle}>
            {loadError ? 'Could not load reviewer' : 'Reviewer not found'}
          </Text>

          <Text style={styles.notFoundText}>
            {loadError || 'This reviewer may no longer be available.'}
          </Text>

          <Pressable
            style={styles.backToReviewersButton}
            onPress={() =>
              router.replace('/(tabs)/reviewers')
            }
          >
            <Text style={styles.backToReviewersText}>
              GO BACK
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  const materialCount = materials.length;

  const hasMaterials = materialCount > 0;

  const masteryMessage =
    reviewer.mastery === 0
      ? 'Start learning! 🌱'
      : reviewer.mastery < 50
        ? 'Good start! 🌱'
        : reviewer.mastery < 80
          ? 'Keep going! 🌱'
          : 'Great work! ⭐';

  function openMaterial(
    material: SQLiteMaterial
  ) {
    if (material.type === 'Flashcards') {
      router.push(
        `/reviewer/${reviewerId}/flashcards`
      );
      return;
    }

    if (material.type === 'Quiz') {
      router.push(
        `/reviewer/${reviewerId}/quiz`
      );
      return;
    }

    router.push(
      `/reviewer/${reviewerId}/material`
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >

        {/* HEADER */}
        <View style={styles.header}>
          <Pressable
            style={styles.backButton}
            onPress={() =>
              router.replace('/(tabs)/reviewers')
            }
          >
            <Ionicons
              name="chevron-back"
              size={24}
              color="#292929"
            />
          </Pressable>

          <View style={styles.headerText}>
            <Text style={styles.course}>
              {reviewer.name}
            </Text>

            <Text
              style={styles.subject}
              numberOfLines={1}
            >
              {reviewer.subject}
            </Text>
          </View>

          <Pressable
            style={styles.editButton}
            onPress={() =>
              router.push(
                `/reviewer/${reviewerId}/edit`
              )
            }
          >
            <Ionicons
              name="create-outline"
              size={22}
              color="#666666"
            />
          </Pressable>
        </View>

        {/* CONTINUE LEARNING */}
        {reviewer.due_cards > 0 ? (
          <Pressable
            style={({ pressed }) => [
              styles.heroCard,
              pressed && styles.pressed,
            ]}
            onPress={() =>
              router.push(
                `/reviewer/${reviewerId}/flashcards`
              )
            }
          >
            <View style={styles.heroIcon}>
              <Ionicons
                name="school"
                size={25}
                color="#FFFFFF"
              />
            </View>

            <View style={styles.heroText}>
              <Text style={styles.heroTitle}>
                Continue learning
              </Text>

              <Text style={styles.heroSubtitle}>
                You have {reviewer.due_cards}{' '}
                {reviewer.due_cards === 1
                  ? 'card'
                  : 'cards'}{' '}
                ready for review.
              </Text>
            </View>

            <Ionicons
              name="arrow-forward-circle"
              size={34}
              color="#FFFFFF"
            />
          </Pressable>
        ) : (
          <View style={styles.emptyHeroCard}>
            <View style={styles.emptyHeroIcon}>
              <Ionicons
                name="leaf-outline"
                size={25}
                color="#58CC02"
              />
            </View>

            <View style={styles.heroText}>
              <Text style={styles.emptyHeroTitle}>
                Ready to start?
              </Text>

              <Text style={styles.emptyHeroSubtitle}>
                Add study material to begin learning.
              </Text>
            </View>
          </View>
        )}

        {/* MASTERY */}
        <View style={styles.progressCard}>
          <View>
            <Text style={styles.progressLabel}>
              OVERALL MASTERY
            </Text>

            <Text style={styles.progressNumber}>
              {reviewer.mastery}%
            </Text>
          </View>

          <View style={styles.progressRight}>
            <Text style={styles.progressMessage}>
              {masteryMessage}
            </Text>

            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.min(
                      Math.max(reviewer.mastery, 0),
                      100
                    )}%`,
                  },
                ]}
              />
            </View>
          </View>
        </View>

        {/* STUDY TOOLS */}
        <Text style={styles.sectionLabel}>
          STUDY TOOLS
        </Text>

        <View style={styles.toolGrid}>
          <ToolCard
            icon="document-text-outline"
            title="Add Material"
            description="Notes and study files"
            background="#EAF9DF"
            iconColor="#58CC02"
            onPress={() =>
              router.push(
                `/reviewer/${reviewerId}/material`
              )
            }
          />

          <ToolCard
            icon="help-circle-outline"
            title="Generate Quiz"
            description="Test your knowledge"
            background="#E6F4FF"
            iconColor="#1CB0F6"
            onPress={() =>
              router.push(
                `/reviewer/${reviewerId}/quiz-generator`
              )
            }
          />

          <ToolCard
            icon="albums-outline"
            title="Flashcards"
            description="Study with SRS"
            background="#F2EAFE"
            iconColor="#9069CD"
            onPress={() =>
              router.push(
                `/reviewer/${reviewerId}/flashcard-generator`
              )
            }
          />

          <ToolCard
            icon="camera-outline"
            title="Quick Capture"
            description="Scan your notes"
            background="#FFF3DF"
            iconColor="#FF9600"
            onPress={() =>
              router.push(
                `/reviewer/${reviewerId}/quick-capture`
              )
            }
          />

          <ToolCard
            icon="notifications-outline"
            title="Review Schedule"
            description="Set study reminders"
            background="#FFF3DF"
            iconColor="#FF9600"
            onPress={() =>
              router.push(
                `/reviewer/${reviewerId}/review-schedule`
              )
            }
          />
        </View>

        {/* MATERIALS HEADER */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionLabel}>
            YOUR MATERIALS
          </Text>

          <Text style={styles.materialCount}>
            {materialCount}{' '}
            {materialCount === 1
              ? 'item'
              : 'items'}
          </Text>
        </View>

        {/* MATERIALS */}
        {hasMaterials ? (
          materials.map(material => (
            <MaterialCard
              key={material.material_id}
              icon={getMaterialIcon(material.type)}
              title={material.title}
              type={material.type}
              info={material.info ?? ''}
              mastery={material.mastery}
              onPress={() =>
                openMaterial(material)
              }
            />
          ))
        ) : (
          <View style={styles.emptyMaterials}>
            <View style={styles.emptyMaterialsIcon}>
              <Ionicons
                name="documents-outline"
                size={31}
                color="#58CC02"
              />
            </View>

            <Text style={styles.emptyMaterialsTitle}>
              No materials yet
            </Text>

            <Text style={styles.emptyMaterialsText}>
              Add your first study material to start
              building this reviewer.
            </Text>

            <Pressable
              style={({ pressed }) => [
                styles.addFirstMaterialButton,
                pressed && styles.pressed,
              ]}
              onPress={() =>
                router.push(
                  `/reviewer/${reviewerId}/material`
                )
              }
            >
              <Ionicons
                name="add"
                size={20}
                color="#FFFFFF"
              />

              <Text style={styles.addFirstMaterialText}>
                ADD MATERIAL
              </Text>
            </Pressable>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function getMaterialIcon(
  type: string
): keyof typeof Ionicons.glyphMap {
  if (type === 'Flashcards') {
    return 'albums-outline';
  }

  if (type === 'Quiz') {
    return 'help-circle-outline';
  }

  return 'document-outline';
}

type ToolCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  background: string;
  iconColor: string;
  onPress?: () => void;
};

function ToolCard({
  icon,
  title,
  description,
  background,
  iconColor,
  onPress,
}: ToolCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.toolCard,
        pressed && styles.pressed,
      ]}
    >
      <View
        style={[
          styles.toolIcon,
          { backgroundColor: background },
        ]}
      >
        <Ionicons
          name={icon}
          size={25}
          color={iconColor}
        />
      </View>

      <Text style={styles.toolTitle}>
        {title}
      </Text>

      <Text style={styles.toolDescription}>
        {description}
      </Text>
    </Pressable>
  );
}

type MaterialCardProps = {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  type: string;
  info: string;
  mastery?: number;
  onPress?: () => void;
};

function MaterialCard({
  icon,
  title,
  type,
  info,
  mastery,
  onPress,
}: MaterialCardProps) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.materialCard,
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.materialIcon}>
        <Ionicons
          name={icon}
          size={21}
          color="#58CC02"
        />
      </View>

      <View style={styles.materialInfo}>
        <Text
          style={styles.materialTitle}
          numberOfLines={1}
        >
          {title}
        </Text>

        <Text style={styles.materialSubtitle}>
          {type}
          {info ? ` • ${info}` : ''}
        </Text>
      </View>

      <View style={styles.materialRight}>
        {mastery !== undefined && (
          <View style={styles.masteryContainer}>
            <Text style={styles.masteryNumber}>
              {mastery}%
            </Text>

            <Text style={styles.masteryLabel}>
              mastery
            </Text>
          </View>
        )}

        <Ionicons
          name="chevron-forward"
          size={18}
          color="#BBBBBB"
        />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7F9F7',
  },

  content: {
    width: '100%',
    maxWidth: 600,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 50,
  },

  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingTitle: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '800',
    color: '#555555',
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 22,
  },

  backButton: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerText: {
    flex: 1,
    marginLeft: 13,
  },

  course: {
    fontSize: 21,
    fontWeight: '900',
    color: '#292929',
  },

  subject: {
    marginTop: 2,
    fontSize: 12,
    color: '#888888',
  },

  editButton: {
    width: 43,
    height: 43,
    alignItems: 'center',
    justifyContent: 'center',
  },

  heroCard: {
    minHeight: 105,
    backgroundColor: '#58CC02',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 5,
    borderBottomColor: '#46A302',
  },

  heroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.20)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  heroText: {
    flex: 1,
  },

  heroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#FFFFFF',
  },

  heroSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#EDFFDF',
  },

  emptyHeroCard: {
    minHeight: 105,
    backgroundColor: '#FFFFFF',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E5E5',
  },

  emptyHeroIcon: {
    width: 50,
    height: 50,
    borderRadius: 16,
    backgroundColor: '#EAF9DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },

  emptyHeroTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#292929',
  },

  emptyHeroSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: '#888888',
  },

  progressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 19,
    padding: 16,
    marginTop: 14,
    marginBottom: 27,
  },

  progressLabel: {
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: '900',
    color: '#999999',
  },

  progressNumber: {
    fontSize: 28,
    fontWeight: '900',
    color: '#58CC02',
    marginTop: 2,
  },

  progressRight: {
    flex: 1,
    marginLeft: 20,
  },

  progressMessage: {
    fontSize: 12,
    fontWeight: '800',
    color: '#555555',
  },

  progressTrack: {
    height: 9,
    backgroundColor: '#E5E5E5',
    borderRadius: 10,
    marginTop: 8,
    overflow: 'hidden',
  },

  progressFill: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 10,
  },

  sectionLabel: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    color: '#777777',
    marginBottom: 12,
  },

  toolGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 27,
  },

  toolCard: {
    width: '48.5%',
    minHeight: 135,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 19,
    padding: 14,
    marginBottom: 10,
  },

  pressed: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },

  toolIcon: {
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 11,
  },

  toolTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#292929',
  },

  toolDescription: {
    marginTop: 4,
    fontSize: 11,
    lineHeight: 15,
    color: '#929292',
  },

  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  materialCount: {
    fontSize: 11,
    color: '#999999',
    fontWeight: '700',
    marginBottom: 12,
  },

  materialCard: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 17,
    padding: 12,
    marginBottom: 9,
  },

  materialIcon: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#EAF9DF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },

  materialInfo: {
    flex: 1,
  },

  materialTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#292929',
  },

  materialSubtitle: {
    fontSize: 11,
    color: '#999999',
    marginTop: 4,
  },

  materialRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginLeft: 8,
  },

  masteryContainer: {
    alignItems: 'flex-end',
  },

  masteryNumber: {
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '900',
    color: '#58CC02',
  },

  masteryLabel: {
    fontSize: 9,
    color: '#999999',
    marginTop: 2,
  },

  emptyMaterials: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#E5E5E5',
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingVertical: 30,
    alignItems: 'center',
  },

  emptyMaterialsIcon: {
    width: 58,
    height: 58,
    borderRadius: 18,
    backgroundColor: '#EAF9DF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyMaterialsTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#292929',
    marginTop: 14,
  },

  emptyMaterialsText: {
    maxWidth: 300,
    textAlign: 'center',
    fontSize: 12,
    lineHeight: 18,
    color: '#888888',
    marginTop: 6,
  },

  addFirstMaterialButton: {
    height: 48,
    borderRadius: 15,
    backgroundColor: '#58CC02',
    borderBottomWidth: 4,
    borderBottomColor: '#46A302',
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 18,
  },

  addFirstMaterialText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },

  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  notFoundIcon: {
    width: 70,
    height: 70,
    borderRadius: 22,
    backgroundColor: '#FFF3DF',
    alignItems: 'center',
    justifyContent: 'center',
  },

  notFoundTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#292929',
    marginTop: 16,
  },

  notFoundText: {
    fontSize: 13,
    color: '#888888',
    textAlign: 'center',
    marginTop: 6,
  },

  backToReviewersButton: {
    height: 48,
    backgroundColor: '#58CC02',
    borderRadius: 15,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
  },

  backToReviewersText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '900',
  },
});
