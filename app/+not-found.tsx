import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: 'Not found' }} />
      <View style={styles.container}>
        <Text style={styles.title}>This screen does not exist.</Text>
        <Link href="/menu" style={styles.link}>
          <Text style={styles.linkText}>Go to menu</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20, backgroundColor: '#0D0D11' },
  title: { fontSize: 20, color: '#F0EAD6', fontFamily: 'serif' },
  link: { marginTop: 16, padding: 12 },
  linkText: { color: '#D4AF37' },
});
