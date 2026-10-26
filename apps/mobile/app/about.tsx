import { StyleSheet, Text, View } from "react-native";
export default function About() { return <View style={styles.page}><Text style={styles.title}>Built for factory teams</Text><Text style={styles.body}>Linora is developing secure, evidence-grounded manufacturing intelligence across mobile, desktop, and web. This is an interface prototype, not a connected production application.</Text></View>; }
const styles=StyleSheet.create({page:{flex:1,padding:24,gap:16},title:{fontSize:26,fontWeight:"700",color:"#10243b"},body:{fontSize:16,lineHeight:25,color:"#546579"}});
