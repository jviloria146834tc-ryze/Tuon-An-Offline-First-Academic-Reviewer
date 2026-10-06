import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { saveQuickCapture } from '../../../database/activity';
import { useAppTheme } from '../../../utils/ThemeContext';

export default function QuickCaptureScreen() {
  const { dark } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const reviewerId = Array.isArray(id) ? id[0] : id;
  const [title,setTitle]=useState('Quick Notes');
  const [content,setContent]=useState('');
  const [saving,setSaving]=useState(false);
  const save=async()=>{
    if(!reviewerId||!content.trim()||saving)return;
    setSaving(true);
    try{await saveQuickCapture(reviewerId,title,content);router.back();}
    catch(error){Alert.alert('Could not save notes',error instanceof Error?error.message:'Please try again.');}
    finally{setSaving(false);}
  };
  return <SafeAreaView style={[styles.safe, dark && { backgroundColor: '#0B1220' }]}>
    <View style={[styles.header, dark && { backgroundColor: '#111B2B', borderBottomColor: '#2B3A52' }]}><Pressable onPress={()=>router.back()} accessibilityRole="button"><Ionicons name="chevron-back" size={25} color={dark ? '#F2F6FF' : '#15264B'}/></Pressable><Text style={[styles.title, dark && { color: '#F2F6FF' }]}>Quick Capture</Text><View style={{width:25}}/></View>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.icon}><Ionicons name="document-text-outline" size={34} color="#2563EB"/></View>
      <Text style={[styles.heading, dark && { color: '#F2F6FF' }]}>Capture notes quickly</Text>
      <Text style={[styles.subtitle, dark && { color: '#AAB7CC' }]}>Type or paste notes. Camera scanning and text recognition are not available in this version.</Text>
      <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>NOTE TITLE</Text><TextInput style={[styles.input, dark && { backgroundColor: '#172235', borderColor: '#2B3A52', color: '#F2F6FF' }]} value={title} onChangeText={setTitle} placeholder="Quick Notes" placeholderTextColor={dark ? '#8998AE' : '#999'}/>
      <Text style={[styles.label, dark && { color: '#AAB7CC' }]}>YOUR NOTES</Text><TextInput style={[styles.input,styles.notes, dark && { backgroundColor: '#172235', borderColor: '#2B3A52', color: '#F2F6FF' }]} value={content} onChangeText={setContent} multiline textAlignVertical="top" placeholder="Type or paste your notes here..." placeholderTextColor={dark ? '#8998AE' : '#999'}/>
      <Pressable style={[styles.save,(!content.trim()||saving)&&styles.disabled]} disabled={!content.trim()||saving} onPress={save}><Ionicons name="save-outline" size={20} color="#FFF"/><Text style={styles.saveText}>{saving?'SAVING...':'SAVE NOTES'}</Text></Pressable>
    </ScrollView>
  </SafeAreaView>;
}
const styles=StyleSheet.create({safe:{flex:1,backgroundColor:'#F4F7FF'},header:{height:60,backgroundColor:'#FFF',paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',borderBottomWidth:1,borderBottomColor:'#DCE5F2'},title:{fontSize:18,fontWeight:'900',color:'#15264B'},content:{padding:20,paddingBottom:35},icon:{alignSelf:'center',width:64,height:64,borderRadius:21,backgroundColor:'#EAF2FF',alignItems:'center',justifyContent:'center',marginTop:10},heading:{fontSize:23,fontWeight:'900',color:'#15264B',textAlign:'center',marginTop:16},subtitle:{fontSize:13,lineHeight:19,color:'#777',textAlign:'center',marginTop:8,marginBottom:22},label:{fontSize:11,fontWeight:'900',letterSpacing:.8,color:'#666',marginBottom:8,marginTop:12},input:{backgroundColor:'#FFF',borderWidth:1,borderColor:'#DCE5F2',borderRadius:13,padding:14,fontSize:14,color:'#15264B'},notes:{minHeight:220,textAlignVertical:'top'},save:{backgroundColor:'#2563EB',borderRadius:14,padding:16,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8,marginTop:20},disabled:{opacity:.5},saveText:{fontSize:14,fontWeight:'900',color:'#FFF'}});
