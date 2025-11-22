import { useEffect, useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { authenticateAnonymous } from '@/services/api';

export default function HomeScreen() {
    const colorScheme = useColorScheme();
    const [backendStatus, setBackendStatus] = useState<string>('Перевірка...');

    const handleCreateTicket = () => {
        router.push('/map-selection');
    };

    useEffect(() => {
        const initializeApp = async () => {
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
            if (!backendUrl) {
                setBackendStatus('Бекенд не налаштовано ❌');
                return;
            }
            try {
                await authenticateAnonymous();
                setBackendStatus('Бекенд доступний ✅');
            } catch (err) {
                setBackendStatus('Помилка підключення до бекенду ❌');
                console.error('Помилка підключення до бекенду:', err);
            }
        };
        initializeApp();
    }, []);

    return (
        <LinearGradient
            colors={['#e0f7fa', '#d0f0e7']}
            style={styles.container}
        >
            <View style={styles.tile}>
                <View style={styles.iconWrapper}>
                    <MaterialIcons name="local-parking" size={50} color="#fff" />
                </View>

                <ThemedText type="title" style={styles.title}>
                    Parking Control
                </ThemedText>

                <TouchableOpacity style={styles.button} onPress={handleCreateTicket} activeOpacity={0.85}>
                    <ThemedText style={styles.buttonText}>Створити квиток</ThemedText>
                </TouchableOpacity>

                <ThemedText style={styles.status}>{backendStatus}</ThemedText>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tile: {
        width: '85%',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 20,
        padding: 24,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    iconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    title: {
        fontSize: 24,
        fontWeight: '600',
        color: '#000',
        textAlign: 'center',
        marginBottom: 24,
    },
    button: {
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: '#0BA360',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonText: { color: '#fff', fontSize: 18, fontWeight: '600' },
    status: { color: '#000', fontSize: 16, textAlign: 'center' },
});
