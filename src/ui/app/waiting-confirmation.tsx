import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import { getTimerStatus } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

export default function WaitingConfirmationScreen() {
    const insets = useSafeAreaInsets();
    const { reportId } = useViolationContext();
    const [timerStatus, setTimerStatus] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!reportId) {
            setLoading(false);
            setTimeout(() => router.back(), 2000);
            return;
        }

        const interval = setInterval(async () => {
            try {
                const status = await getTimerStatus(reportId);
                setTimerStatus(status);
                setLoading(false);
                if (status.can_submit) clearInterval(interval);
            } catch (error) {
                console.error(error);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [reportId]);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleTakePhoto = () => router.push('/plate-camera');
    const handleSubmit = () => router.push('/violation-success');

    if (loading) {
        return (
            <LinearGradient colors={['#E0F7FA', '#D0F0E7']} style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#000000" />
                    <ThemedText style={styles.loadingText}>
                        Завантаження статусу таймера...
                    </ThemedText>
                </View>
            </LinearGradient>
        );
    }

    const canSubmit = timerStatus?.can_submit || false;
    const secondsRemaining = timerStatus?.seconds_remaining || 0;

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    Очікування підтвердження
                </ThemedText>
                <View style={{ width: 48 }} />
            </View>

            <View style={styles.content}>
                {!canSubmit ? (
                    <>
                        {/* Timer Display */}
                        <View style={styles.timerContainer}>
                            <Ionicons name="time-outline" size={80} color="#C0C0C0" />
                            <ThemedText style={styles.timerTitle}>
                                Таймер активний
                            </ThemedText>
                            <View style={styles.timerDisplay}>
                                <ThemedText style={styles.timerText}>
                                    {formatTime(secondsRemaining)}
                                </ThemedText>
                            </View>

                        {/* Info Box */}
                        <View style={styles.infoBox}>
                            <Ionicons name="information-circle" size={24} color="#6B7280" />
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
                            <Ionicons name="checkmark-circle" size={80} color="#10B981" />
                            <ThemedText style={styles.completeTitle}>
                                Таймер завершено!
                            </ThemedText>
                            <ThemedText style={styles.completeDescription}>
                                Тепер зробіть ще одне фото автомобіля для підтвердження порушення
                            </ThemedText>
                        </View>

                            <TouchableOpacity style={styles.photoButton} onPress={handleTakePhoto}>
                                <Ionicons name="camera" size={24} color="#fff" />
                                <ThemedText style={styles.photoButtonText}>
                                    Зробити фото
                                </ThemedText>
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.submitButton} onPress={handleSubmit}>
                                <ThemedText style={styles.submitButtonText}>
                                    Продовжити без фото
                                </ThemedText>
                            </TouchableOpacity>
                        </>
                    )}
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    loadingText: {
        marginTop: 20,
        fontSize: 16,
        fontWeight: '500',
        color: '#6B7280',
        letterSpacing: -0.1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E7EB',
    },
    backButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 24,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#111827',
        letterSpacing: -0.2,
    },
    content: {
        flex: 1,
        padding: 24,
        justifyContent: 'center',
    },
    timerContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    timerTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 24,
        color: '#111827',
        letterSpacing: -0.5,
    },
    timerDisplay: {
        backgroundColor: '#000000',
        paddingHorizontal: 48,
        paddingVertical: 24,
        borderRadius: 24,
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    timerText: {
        fontSize: 56,
        fontWeight: '800',
        color: '#FFFFFF',
        letterSpacing: -1,
    },
    timerDescription: {
        fontSize: 16,
        textAlign: 'center',
        color: '#6B7280',
        lineHeight: 24,
        paddingHorizontal: 32,
        fontWeight: '500',
        letterSpacing: -0.1,
    },
    infoBox: {
        flexDirection: 'row',
        backgroundColor: '#F3F4F6',
        padding: 20,
        borderRadius: 16,
        gap: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    infoText: {
        flex: 1,
        fontSize: 15,
        color: '#4B5563',
        lineHeight: 22,
        fontWeight: '500',
        letterSpacing: -0.1,
    },
    completeContainer: {
        alignItems: 'center',
        marginBottom: 48,
    },
    completeTitle: {
        fontSize: 28,
        fontWeight: '700',
        marginTop: 24,
        marginBottom: 16,
        color: '#111827',
        letterSpacing: -0.5,
    },
    completeDescription: {
        fontSize: 16,
        textAlign: 'center',
        color: '#6B7280',
        lineHeight: 24,
        paddingHorizontal: 32,
        fontWeight: '500',
        letterSpacing: -0.1,
    },
    photoButton: {
        backgroundColor: '#000000',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 20,
        borderRadius: 30,
        marginBottom: 16,
        gap: 12,
        minHeight: 64,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    photoButtonText: {
        color: '#FFFFFF',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
    submitButton: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 20,
        borderRadius: 30,
        alignItems: 'center',
        minHeight: 64,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    submitButtonText: {
        color: '#111827',
        fontSize: 18,
        fontWeight: '700',
        letterSpacing: -0.2,
    },
});
