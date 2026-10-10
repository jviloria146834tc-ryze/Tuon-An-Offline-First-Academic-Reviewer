import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { getDatabase } from '../../database/database';
import { getReviewers, SQLiteReviewer } from '../../database/reviewers';
import { getStudyStreak, StudyStreak } from '../../database/activity';
import { getActiveStudentId } from '../../firebase/auth';
import { useAppTheme } from '../../utils/ThemeContext';

type Summary = { cards: number; quizzes: number; sessions: number; correct: number; total: number; week: number[] };

export default function AnalyticsScreen() {
  const { dark } = useAppTheme();
  const [reviewers, setReviewers] = useState<SQLiteReviewer[]>([]);
  const [summary, setSummary] = useState<Summary>({ cards: 0, quizzes: 0, sessions: 0, correct: 0, total: 0, week: Array(7).fill(0) });
  const [streak, setStreak] = useState<StudyStreak>({ currentStreak: 0, bestStreak: 0, lastStudiedDate: null, studiedToday: false });

  useFocusEffect(useCallback(() => {
    let active = true;
    (async () => {
      const db = await getDatabase();
      const nextReviewers = await getReviewers();
      const studentId = await getActiveStudentId();
      const [cards, attempts, sessions, streakInfo] = await Promise.all([
        db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM srs_progress s JOIN flashcards f ON f.flashcard_id=s.flashcard_id JOIN materials m ON m.material_id=f.material_id JOIN reviewers r ON r.reviewer_id=m.reviewer_id WHERE r.student_id=?', studentId),
        db.getFirstAsync<{ count: number; correct: number; total: number }>('SELECT COUNT(*) AS count, COALESCE(SUM(a.score),0) AS correct, COALESCE(SUM(a.total_questions),0) AS total FROM quiz_attempts a JOIN quizzes q ON q.quiz_id=a.quiz_id JOIN materials m ON m.material_id=q.material_id JOIN reviewers r ON r.reviewer_id=m.reviewer_id WHERE r.student_id=?', studentId),
        db.getAllAsync<{ started_at: string }>('SELECT started_at FROM study_sessions WHERE student_id=?', studentId),
        getStudyStreak(studentId),
      ]);
      const week = Array(7).fill(0) as number[];
      const today = new Date();
      sessions.forEach(session => {
        const date = new Date(session.started_at);
        const dayDiff = Math.floor((new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime() - new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) / 86400000);
        if (dayDiff >= 0 && dayDiff < 7) week[6 - dayDiff] += 1;
      });
      if (!active) return;
      setReviewers(nextReviewers);
      setStreak(streakInfo);
      setSummary({ cards: cards?.count ?? 0, quizzes: attempts?.count ?? 0, correct: attempts?.correct ?? 0, total: attempts?.total ?? 0, sessions: sessions.length, week });
    })().catch(() => {});
    return () => { active = false; };
  }, []));

  const mastery = reviewers.length ? Math.round(reviewers.reduce((sum, reviewer) => sum + reviewer.mastery, 0) / reviewers.length) : 0;
  const accuracy = summary.total ? Math.round(summary.correct / summary.total * 100) : 0;
  const maxDay = Math.max(1, ...summary.week);

  return <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safe, dark && { backgroundColor: '#0B1220' }]}>
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={[styles.eyebrow, dark && { color: '#7CB0FF' }]}>YOUR PROGRESS</Text><Text style={[styles.title, dark && { color: '#F2F6FF' }]}>Analytics</Text>
      <Text style={[styles.subtitle, dark && { color: '#AAB7CC' }]}>Progress from study activity saved on this device.</Text>
      <View style={[styles.card, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}><Text style={styles.label}>AVERAGE REVIEWER MASTERY</Text><Text style={styles.big}>{mastery}%</Text><View style={styles.track}><View style={[styles.fill, { width: `${mastery}%` }]} /></View></View>
      <View style={[styles.card, styles.streakCard, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>
        <View style={styles.streakLeft}>
          <View style={styles.streakIconWrapper}><Ionicons name="flame" size={26} color="#EA580C" /></View>
          <View>
            <Text style={styles.label}>DAILY STUDY STREAK</Text>
            <Text style={[styles.big, { color: '#EA580C' }]}>{streak.currentStreak} {streak.currentStreak === 1 ? 'day' : 'days'}</Text>
          </View>
        </View>
        <View style={styles.streakRight}>
          <Text style={[styles.bestStreakLabel, dark && { color: '#F2F6FF' }]}>Best: {streak.bestStreak}d</Text>
          <Text style={styles.streakSub}>{streak.studiedToday ? 'Studied today! 🔥' : 'Study today to continue'}</Text>
        </View>
      </View>
      <View style={styles.grid}>
        <Stat icon="checkmark-circle-outline" value={`${accuracy}%`} label="Quiz accuracy" />
        <Stat icon="albums-outline" value={`${summary.cards}`} label="Cards practiced" />
        <Stat icon="help-circle-outline" value={`${summary.quizzes}`} label="Quiz attempts" />
        <Stat icon="time-outline" value={`${summary.sessions}`} label="Study sessions" />
      </View>
      <Text style={[styles.section, dark && { color: "#F2F6FF" }]}>Study sessions - last 7 days</Text>
      <View style={[styles.card, styles.chart, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}>{summary.week.map((count, index) => <View key={index} style={styles.barColumn}><View style={styles.barTrack}><View style={[styles.bar, { height: `${Math.max(5, count / maxDay * 100)}%` }]} /></View><Text style={styles.day}>{['M','T','W','T','F','S','S'][index]}</Text></View>)}</View>
      <Text style={[styles.section, dark && { color: '#F2F6FF' }]}>Reviewer mastery</Text>
      {reviewers.length ? reviewers.map(item => <View key={item.reviewer_id} style={[styles.row, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}><View style={styles.rowCopy}><Text style={[styles.rowTitle, dark && { color: '#F2F6FF' }]}>{item.name}</Text><Text style={[styles.rowSub, dark && { color: '#AAB7CC' }]}>{item.subject}</Text></View><Text style={styles.value}>{Math.round(item.mastery)}%</Text></View>) : <View style={[styles.card, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}><Text style={styles.empty}>Create a reviewer and study to see progress here.</Text></View>}
      <Text style={styles.note}>Quiz accuracy, mastery, and daily streaks are calculated automatically as you complete quizzes and flashcard reviews on this device.</Text>
    </ScrollView>
  </SafeAreaView>;
}

function Stat({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }) {
  const { dark } = useAppTheme();
  return <View style={[styles.stat, dark && { backgroundColor: '#172235', borderColor: '#2B3A52' }]}><Ionicons name={icon} size={23} color="#2563EB" /><Text style={[styles.statValue, dark && { color: '#F2F6FF' }]}>{value}</Text><Text style={styles.statLabel}>{label}</Text></View>;
}

const styles = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#F4F7FF'},
  container:{padding:20,paddingBottom:40,maxWidth:600,width:'100%',alignSelf:'center'},
  eyebrow:{color:'#2563EB',fontSize:11,fontWeight:'900',letterSpacing:1.5},
  title:{fontSize:28,fontWeight:'900',color:'#15264B'},
  subtitle:{fontSize:13,color:'#888',marginTop:5,marginBottom:18},
  card:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#DCE5F2',borderRadius:18,padding:16,marginBottom:12},
  streakCard:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},
  streakLeft:{flexDirection:'row',alignItems:'center',gap:12},
  streakIconWrapper:{width:44,height:44,borderRadius:14,backgroundColor:'#FFF3EB',alignItems:'center',justifyContent:'center'},
  streakRight:{alignItems:'flex-end'},
  bestStreakLabel:{fontSize:13,fontWeight:'800',color:'#15264B'},
  streakSub:{fontSize:11,color:'#888',marginTop:2},
  label:{fontSize:10,fontWeight:'900',color:'#888',letterSpacing:1},
  big:{fontSize:34,fontWeight:'900',color:'#2563EB',marginVertical:4},
  track:{height:9,backgroundColor:'#E3EAF4',borderRadius:9,overflow:'hidden'},
  fill:{height:'100%',backgroundColor:'#2563EB'},
  grid:{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'},
  stat:{width:'48%',backgroundColor:'#FFF',borderWidth:1,borderColor:'#DCE5F2',borderRadius:16,padding:14,marginBottom:10},
  statValue:{fontSize:22,fontWeight:'900',color:'#15264B',marginTop:8},
  statLabel:{fontSize:11,color:'#888',marginTop:2},
  section:{fontSize:17,fontWeight:'900',color:'#15264B',marginTop:10,marginBottom:10},
  chart:{height:170,flexDirection:'row',justifyContent:'space-around',alignItems:'flex-end'},
  barColumn:{height:'100%',flex:1,alignItems:'center'},
  barTrack:{flex:1,width:18,backgroundColor:'#EEF0EC',borderRadius:8,overflow:'hidden',justifyContent:'flex-end'},
  bar:{width:'100%',backgroundColor:'#2563EB',borderRadius:8},
  day:{fontSize:10,fontWeight:'800',color:'#888',marginTop:6},
  row:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#DCE5F2',borderRadius:15,padding:14,marginBottom:8,flexDirection:'row',alignItems:'center'},
  rowCopy:{flex:1},
  rowTitle:{fontSize:14,fontWeight:'800',color:'#15264B'},
  rowSub:{fontSize:11,color:'#888',marginTop:3},
  value:{fontSize:15,fontWeight:'900',color:'#2563EB'},
  empty:{fontSize:13,color:'#888'},
  note:{marginTop:8,fontSize:11,lineHeight:17,color:'#888'}
});

