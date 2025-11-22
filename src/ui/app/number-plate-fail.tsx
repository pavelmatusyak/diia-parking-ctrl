import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function NumberPlateFailScreen() {
  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <ThemedText type="title" style={styles.title}>
          Не вдалося розпізнати номер
        </ThemedText>
        <ThemedText style={styles.description}>
          Номерний знак у кадрі був нечіткий або перекритий. Спробуйте сфокусуватися і зробити фото ще раз.
        </ThemedText>
      </View>

      <View style={styles.actions}>
        <TouchableOpacity style={[styles.button, styles.secondary]} onPress={() => router.replace('/plate-camera')}>
          <ThemedText style={styles.secondaryText}>Спробувати ще раз</ThemedText>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.button, styles.primary]} onPress={() => router.replace('/plate-retake')}>
          <ThemedText style={styles.primaryText}>Зробити нове фото</ThemedText>
        </TouchableOpacity>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    paddingTop: 80,
    backgroundColor: '#fff',
    justifyContent: 'space-between',
  },
  card: {
    gap: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    color: '#4F4F4F',
  },
  actions: {
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  secondary: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  secondaryText: {
    fontWeight: '600',
    color: '#1F1F1F',
  },
  primary: {
    backgroundColor: '#000',
  },
  primaryText: {
    color: '#fff',
    fontWeight: '600',
  },
});

