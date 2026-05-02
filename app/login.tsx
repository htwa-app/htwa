import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../constants/theme';

// Stub — Login screen (Screen #2) to be built next
export default function LoginScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Login screen — coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
});
