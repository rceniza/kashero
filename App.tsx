import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <View style={styles.mark} accessibilityLabel="Kashero mark">
        <Text style={styles.markText}>K</Text>
      </View>
      <Text style={styles.brand}>Kashero</Text>
      <Text style={styles.tagline}>Your counter, ready when you are.</Text>
      <StatusBar style="dark" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F3EE',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  mark: {
    width: 54,
    height: 54,
    borderRadius: 17,
    backgroundColor: '#E66A3D',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  markText: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '800',
  },
  brand: {
    color: '#20201E',
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.8,
  },
  tagline: {
    color: '#77756F',
    fontSize: 15,
    marginTop: 8,
  },
});
