import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import { getTimerStatus, uploadViolationPhoto } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WaitingConfirmationScreen() {
    const insets = useSafeAreaInsets();
    const { reportId } = useViolationContext();
    const [timerStatus, setTimerStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [takingPhoto, setTakingPhoto] = useState(false);

    useEffect(() => {
        if (!reportId) {
            console.error('No reportId in waiting-confirmation');
            setLoading(false);
            setTimeout(() => router.back(), 2000);
            return;
        }

        console.log('Starting timer polling for reportId:', reportId);

        // Poll timer status every second
        const interval = setInterval(async () => {
            try {
                const status = await getTimerStatus(reportId);
                setTimerStatus(status);
                setLoading(false);

                // If timer is complete, stop polling
                if (status.can_submit) {
                    clearInterval(interval);
                }
            } catch (error) {
                console.error('Failed to get timer status:', error);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [reportId]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTakePhoto = () => {
        // Navigate to camera to take verification photo
        router.push('/plate-camera');
    };

    const handleSubmit = () => {
        // Navigate back to violation details to retry submission
        router.push('/violation-success');
    };

    if (loading) {
        return (
            <ThemedView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <ThemedText style={styles.loadingText}>
                        Завантаження статусу таймера...
                    </ThemedText>
                </View>
            </ThemedView>
        );
    }

    const canSubmit = timerStatus?.can_submit || false;
    const secondsRemaining = timerStatus?.seconds_remaining || 0;

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    Очікування підтвердження
                </ThemedText>
                <View style={{ width: 44 }} />
            </View>

            <View style={styles.content}>
                {!canSubmit ? (
                    <>
                        {/* Timer Display */}
                        <View style={styles.timerContainer}>
                            <Ionicons name="time-outline" size={80} color="#007AFF" />
                            <ThemedText style={styles.timerTitle}>
                                Таймер активний
                            </ThemedText>
                            <View style={styles.timerDisplay}>
                                <ThemedText style={styles.timerText}>
                                    {formatTime(secondsRemaining)}
                                </ThemedText>
                            </View>
                            <ThemedText style={styles.timerDescription}>
                                Для підтвердження порушення необхідно зачекати 5 хвилин.
                                Це гарантує, що автомобіль все ще припаркований.
                            </ThemedText>
                        </View>

                        {/* Info Box */}
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle" size={24} color="#007AFF" />
                            <ThemedText style={styles.infoText}>
                                Після завершення таймера вам потрібно буде зробити ще одне фото
                                автомобіля для підтвердження.
                            </ThemedText>
                        </View>
                    </>
                ) : (
                    <>
                        {/* Timer Complete */}
                        <View style={styles.completeContainer}>
                            <Ionicons name="checkmark-circle" size={80} color="#34C759" />
                            <ThemedText style={styles.completeTitle}>
                                Таймер завершено!
                            </ThemedText>
                            <ThemedText style={styles.completeDescription}>
                                Тепер зробіть ще одне фото автомобіля для підтвердження порушення
                            </ThemedText>
                        </View>

                        {/* Take Photo Button */}
                        <TouchableOpacity
                            style={styles.photoButton}
                            onPress={handleTakePhoto}
                        >
                            <Ionicons name="camera" size={24} color="#fff" />
                            <ThemedText style={styles.photoButtonText}>
                                Зробити фото підтвердження
                            </ThemedText>
                        </TouchableOpacity>

                        {/* Or Submit Button */}
                        <TouchableOpacity
                            style={styles.submitButton}
                            onPress={handleSubmit}
                        >
                            <ThemedText style={styles.submitButtonText}>
                                Продовжити без фото
                            </ThemedText>
                        </TouchableOpacity>
                    </>
                )}
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
        opacity: 0.6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18 },
    content: {
        flex: 1,
        padding: 20,
        justifyContent: 'center',
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    timerTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: 20,
        marginBottom: 20,
    },
    timerDisplay: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 40,
        paddingVertical: 20,
        borderRadius: 20,
        marginBottom: 20,
    },
    timerText: {
        fontSize: 48,
        fontWeight: '700',
        color: '#fff',
    },
    timerDescription: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#E3F2FD',
        padding: 16,
        borderRadius: 12,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 14,
        color: '#007AFF',
        lineHeight: 20,
    },
    completeContainer: {
        alignItems: 'center',
        marginBottom: 40,
    },
    completeTitle: {
        fontSize: 24,
        fontWeight: '700',
        marginTop: 20,
        marginBottom: 12,
    },
    completeDescription: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    photoButton: {
        backgroundColor: '#007AFF',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderRadius: 12,
        marginBottom: 12,
        gap: 8,
    },
    photoButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
    submitButton: {
        backgroundColor: '#F5F5F5',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonText: {
        color: '#007AFF',
        fontSize: 17,
        fontWeight: '600',
    },
});