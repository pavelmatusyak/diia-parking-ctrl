import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';

export default function ViolationSuccessScreen() {
    return (
        <ThemedView style={styles.container}>
            <View style={styles.card}>
                <View style={styles.badge}>
                    <ThemedText style={styles.badgeIcon}>🔥</ThemedText>
                </View>
                <ThemedText type="title" style={styles.title}>
                    Ваша заявка про правопорушення зафіксована
                </ThemedText>
                <ThemedText style={styles.description}>
                    Ми збережемо звіт на наших серверах і передамо його до поліції. Ви зможете відстежувати
                    статус у розділі «Мої квитки».
                </ThemedText>
            </View>

            <TouchableOpacity style={styles.button} onPress={() => router.replace('/(tabs)')}>
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
        backgroundColor: '#FFFFFF',
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
        backgroundColor: '#FFF0E6',
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
        backgroundColor: '#000000',
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});

