import { useEffect, useState } from 'react';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { router } from 'expo-router';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { Camera } from 'expo-camera';
import { authenticateAnonymous } from '@/services/api';

export default function HomeScreen() {
    const colorScheme = useColorScheme();
    const [backendStatus, setBackendStatus] = useState<string>('Перевірка...');
    const [locationPermission, setLocationPermission] = useState<string>('Перевірка...');
    const [cameraPermission, setCameraPermission] = useState<string>('Перевірка...');

    const handleCreateTicket = () => {
        router.push('/map-selection');
    };

    useEffect(() => {
        const initializeApp = async () => {
            // Перевірка бекенду
            const backendUrl = process.env.EXPO_PUBLIC_BACKEND_URL;
            if (!backendUrl) {
                setBackendStatus('Бекенд не налаштовано ❌');
            } else {
                try {
                    await authenticateAnonymous();
                    setBackendStatus('Бекенд доступний ✅');
                } catch (err) {
                    setBackendStatus('Помилка підключення до бекенду ❌');
                    console.error('Помилка підключення до бекенду:', err);
                }
            }

            // Перевірка геолокації
            const { status: locStatus } = await Location.requestForegroundPermissionsAsync();
            setLocationPermission(locStatus === 'granted' ? 'Геолокація дозволена ✅' : 'Геолокація заборонена ❌');

            // Перевірка камери
            const { status: camStatus } = await Camera.requestCameraPermissionsAsync();
            setCameraPermission(camStatus === 'granted' ? 'Камера дозволена ✅' : 'Камера заборонена ❌');
        };

        initializeApp();
    }, []);

    return (
        <ThemedView style={styles.container}>
            <View style={styles.content}>
                <MaterialIcons
                    name="local-parking"
                    size={140}
                    color="#C0C0C0"
                    style={styles.icon}
                />

                <ThemedText type="title" style={styles.title}>
                    Parking Control
                </ThemedText>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleCreateTicket}
                    activeOpacity={0.85}
                >
                    <ThemedText style={styles.buttonText}>Створити квиток</ThemedText>
                </TouchableOpacity>

                <ThemedText style={styles.statusText}>
                    {backendStatus}
                </ThemedText>
                <ThemedText style={styles.statusText}>
                    {locationPermission}
                </ThemedText>
                <ThemedText style={styles.statusText}>
                    {cameraPermission}
                </ThemedText>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    icon: {
        marginBottom: 32,
        opacity: 0.9,
    },
    title: {
        marginBottom: 48,
        textAlign: 'center',
        fontSize: 36,
        fontWeight: '800',
        letterSpacing: -1,
        color: '#111827',
    },
    button: {
        width: '85%',
        maxWidth: 400,
        paddingVertical: 20,
        borderRadius: 30,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 64,
        backgroundColor: '#000000',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    buttonText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#FFFFFF',
        letterSpacing: -0.3,
    },
    statusText: {
        marginTop: 12,
        textAlign: 'center',
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
        letterSpacing: -0.1,
    },
});
