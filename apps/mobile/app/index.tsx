import { Link } from "expo-router";
import { SafeAreaView, ScrollView, StyleSheet, Text, View } from "react-native";

const modules = [
  { title: "Factory Intelligence", detail: "Ask questions grounded in approved factory records" },
  { title: "Documents", detail: "Find SOPs, reports, and evidence" },
  { title: "Operations", detail: "Review production summaries and exceptions" },
  { title: "Compliance", detail: "Track evidence and corrective actions" },
];

export default function Home() {
  return <SafeAreaView style={styles.page}><ScrollView contentContainerStyle={styles.content}>
    <Text style={styles.eyebrow}>LINORA · MANUFACTURING INTELLIGENCE</Text>
    <Text style={styles.title}>Your factory. Your data. Your intelligence.</Text>
    <Text style={styles.subtitle}>A mobile workspace for Bangladesh's manufacturing teams.</Text>
    <View style={styles.notice}><Text style={styles.noticeText}>Preview only · Sign-in and live factory data are not connected yet.</Text></View>
    {modules.map(module => <View key={module.title} style={styles.card}><Text style={styles.cardTitle}>{module.title}</Text><Text style={styles.cardDetail}>{module.detail}</Text></View>)}
    <Link href="/about" style={styles.link}>About this preview →</Link>
  </ScrollView></SafeAreaView>;
}
const styles = StyleSheet.create({ page:{flex:1,backgroundColor:"#f5f7fa"},content:{padding:24,gap:16},eyebrow:{color:"#326a71",fontSize:11,fontWeight:"700",letterSpacing:1.3,marginTop:20},title:{fontSize:30,fontWeight:"700",color:"#10243b",lineHeight:38},subtitle:{fontSize:16,color:"#546579",lineHeight:24},notice:{backgroundColor:"#e5eef1",padding:14,borderRadius:12},noticeText:{color:"#2c5661"},card:{backgroundColor:"#ffffff",padding:20,borderRadius:16,borderWidth:1,borderColor:"#e3e8ed",gap:7},cardTitle:{fontSize:18,fontWeight:"700",color:"#12263a"},cardDetail:{color:"#58697c",lineHeight:21},link:{color:"#176c76",fontWeight:"700",marginVertical:10}});
