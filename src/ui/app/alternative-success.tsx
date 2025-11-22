import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function AlternativeSuccessScreen() {
  const { resetAll } = useViolationContext();

  const handleDone = () => {
    resetAll();
    router.replace('/(tabs)');
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.card}>
        <View style={styles.badge}>
          <ThemedText style={styles.badgeIcon}>📸</ThemedText>
        </View>
        <ThemedText type="title" style={styles.title}>
          Нове фото отримано
        </ThemedText>
        <ThemedText style={styles.description}>
          Дякуємо! Ми прийняли повторне фото номерного знаку і вже передали його в обробку.
        </ThemedText>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleDone}>
        <ThemedText style={styles.buttonText}>Готово</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
    gap: 20,
  },
  card: {
    alignItems: 'center',
    gap: 16,
  },
  badge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#F2F0FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeIcon: {
    fontSize: 48,
  },
  title: {
    textAlign: 'center',
    fontSize: 22,
    fontWeight: 'bold',
  },
  description: {
    textAlign: 'center',
    color: '#4F4F4F',
    lineHeight: 20,
  },
  button: {
    marginTop: 40,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: '#000',
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

