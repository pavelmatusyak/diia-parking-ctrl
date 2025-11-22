import { useEffect, useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { Colors } from '@/constants/theme';
import { ThemedView } from '@/constants/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function HomeScreen() {
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const [backendStatus, setBackendStatus] = useState<string>('Перевірка...');

    const handleCreateTicket = () => {
        router.push('/create-ticket' as any);
    };

    useEffect(() => {
        const checkBackend = async () => {
            try {
                const response = await fetch('http://backend-alb-757973064.eu-central-1.elb.amazonaws.com');
                if (response.ok) {
                    setBackendStatus('Бекенд доступний ✅');
                } else {
                    setBackendStatus(`Бекенд недоступний ❌ (${response.status})`);
                }
            } catch (err) {
                setBackendStatus('Помилка підключення до бекенду ❌');
                console.error('Помилка підключення до бекенду:', err);
            }
        };
        checkBackend();
    }, []);

    return (
        <ThemedView style={styles.container}>
            <View style={styles.content}>
                <MaterialIcons
                    name="local-parking"
                    size={140}
                    color={theme.tint}
                    style={styles.icon}
                />

                <ThemedText type="title" style={styles.title}>
                    Parking Control
                </ThemedText>

                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.tint }]}
                    onPress={handleCreateTicket}
                    activeOpacity={0.85}
                >
                    <ThemedText style={styles.buttonText}>Створити квиток</ThemedText>
                </TouchableOpacity>

                <ThemedText style={{ marginTop: 20, textAlign: 'center', color: theme.tint }}>
                    {backendStatus}
                </ThemedText>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 30,
    },
    icon: { marginBottom: 20 },
    title: { marginBottom: 40, textAlign: 'center', fontSize: 32, fontWeight: '700' },
    button: {
        width: '80%',
        paddingVertical: 22,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 75,
        elevation: 4,
    },
    buttonText: { fontSize: 20, fontWeight: '700', color: '#fff' },
});
