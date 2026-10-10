import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { getFlashcards, getFlashcardsByReviewer, getSrsProgress, calculateNextSrs, SQLiteFlashcard, saveSrsProgress, SrsRating } from '../../../database/flashcards';
import { saveStudyActivity } from '../../../database/activity';
import { useAppTheme } from '../../../utils/ThemeContext';

export default function FlashcardStudyScreen() {
  const { dark } = useAppTheme();
  const { id, materialId: materialParam } = useLocalSearchParams<{ id: string; materialId?: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;
  const materialId = Array.isArray(materialParam) ? materialParam[0] : materialParam;
  const [cards, setCards] = useState<SQLiteFlashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [finished, setFinished] = useState(false);
  useEffect(() => {
    let active = true;
    const fetchCards = async () => {
      if (materialId) {
        return getFlashcards(materialId);
      }
      return getFlashcardsByReviewer(reviewerId ?? '');
    };
    fetchCards().then(items => { if (active) setCards(items); }).catch(error => Alert.alert('Could not load flashcards', String(error))).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
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
      if (index < cards.length - 1) { setIndex(index + 1); setRevealed(false); }
      else { await saveStudyActivity({ reviewer_id: reviewerId, activity_type: 'flashcard_review', ended_at: new Date().toISOString() }); setFinished(true); }
    } catch (error) { Alert.alert('Could not save review progress', String(error)); }
  };

  if (loading) return <SafeAreaView style={[styles.container, dark && { backgroundColor: '#0B1220' }]}><ActivityIndicator color="#2563EB" /><Text style={[styles.help, dark && { color: '#AAB7CC' }]}>Loading your saved cards...</Text></SafeAreaView>;
  if (!cards.length) return <SafeAreaView style={[styles.container, dark && { backgroundColor: '#0B1220' }]}><View style={styles.top}><Pressable onPress={() => router.back()}><Ionicons name="chevron-back" size={25} color={dark ? '#F2F6FF' : '#15264B'} /></Pressable><Text style={[styles.title, dark && { color: '#F2F6FF' }]}>Flashcards</Text><View /></View><View style={styles.center}><Ionicons name="albums-outline" size={52} color="#2563EB"/><Text style={[styles.heading, dark && { color: '#F2F6FF' }]}>No cards yet</Text><Text style={[styles.help, dark && { color: '#AAB7CC' }]}>Add flashcards for this reviewer, then come back to study them.</Text><Pressable style={styles.primary} onPress={() => router.push(`/reviewer/${reviewerId}/flashcard-generator`)}><Text style={styles.primaryText}>ADD FLASHCARDS</Text></Pressable></View></SafeAreaView>;
  if (finished) return <SafeAreaView style={[styles.container, dark && { backgroundColor: '#0B1220' }]}><View style={styles.center}><Ionicons name="checkmark-circle" size={60} color="#2563EB"/><Text style={[styles.heading, dark && { color: '#F2F6FF' }]}>Review complete!</Text><Text style={[styles.help, dark && { color: '#AAB7CC' }]}>You reviewed {cards.length} saved cards. Your ratings have been saved on this device.</Text><Pressable style={styles.primary} onPress={() => router.replace(`/reviewer/${reviewerId}`)}><Text style={styles.primaryText}>BACK TO REVIEWER</Text></Pressable></View></SafeAreaView>;

  const current = cards[index];
  return <SafeAreaView style={[styles.container, dark && { backgroundColor: '#0B1220' }]}>
    <View style={styles.top}><Pressable onPress={() => router.back()} accessibilityRole="button"><Ionicons name="close" size={24} color={dark ? '#F2F6FF' : '#15264B'} /></Pressable><Text style={[styles.count, dark && { color: '#AAB7CC' }]}>CARD {index + 1} OF {cards.length}</Text><View style={{ width: 24 }} /></View>
    <View style={styles.progress}><View style={[styles.progressFill, { width: `${(index + 1) / cards.length * 100}%` }]} /></View>
    <View style={[styles.card, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}><Text style={styles.label}>{revealed ? 'ANSWER' : 'QUESTION'}</Text><Text style={[styles.cardText, dark && { color: '#F2F6FF' }]}>{revealed ? current.answer : current.question}</Text>{!revealed && <Pressable style={styles.primary} onPress={() => setRevealed(true)}><Text style={styles.primaryText}>SHOW ANSWER</Text></Pressable>}</View>
    {revealed && <View style={styles.ratings}>{(['Again','Hard','Good','Easy'] as const).map(rating => <Pressable key={rating} style={[styles.rating, dark && { backgroundColor: '#172235' }]} onPress={() => rate(rating)}><Text style={[styles.ratingText, dark && { color: '#F2F6FF' }]}>{rating}</Text></Pressable>)}</View>}
    <Text style={[styles.footer, dark && { color: '#AAB7CC' }]}>Your rating sets the next review interval and is saved locally.</Text>
  </SafeAreaView>;
}

const styles = StyleSheet.create({container:{flex:1,backgroundColor:'#F4F7FF',padding:20},top:{height:52,flexDirection:'row',alignItems:'center',justifyContent:'space-between'},title:{fontSize:20,fontWeight:'900',color:'#15264B'},count:{fontSize:12,fontWeight:'900',color:'#888'},progress:{height:8,backgroundColor:'#DCE5F2',borderRadius:8,overflow:'hidden',marginTop:8},progressFill:{height:'100%',backgroundColor:'#2563EB'},card:{flex:1,backgroundColor:'#FFF',borderWidth:1,borderColor:'#DCE5F2',borderRadius:24,marginTop:24,padding:24,justifyContent:'center',alignItems:'center'},label:{fontSize:11,fontWeight:'900',letterSpacing:1.4,color:'#2563EB'},cardText:{fontSize:22,fontWeight:'700',color:'#15264B',textAlign:'center',lineHeight:32,marginVertical:26},primary:{backgroundColor:'#2563EB',paddingHorizontal:22,paddingVertical:15,borderRadius:14,alignItems:'center'},primaryText:{color:'#FFF',fontWeight:'900',letterSpacing:.5},ratings:{flexDirection:'row',gap:8,marginTop:16},rating:{flex:1,backgroundColor:'#FFF',borderColor:'#2563EB',borderWidth:1,borderRadius:12,paddingVertical:14,alignItems:'center'},ratingText:{color:'#15264B',fontWeight:'800'},footer:{fontSize:11,color:'#888',textAlign:'center',marginTop:16},center:{flex:1,alignItems:'center',justifyContent:'center',gap:15,padding:18},heading:{fontSize:24,fontWeight:'900',color:'#15264B'},help:{fontSize:14,color:'#777',textAlign:'center',lineHeight:21,marginTop:10}});
