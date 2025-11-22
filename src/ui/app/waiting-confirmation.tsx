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
                    <ActivityIndicator size="large" color="#007AFF" />
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
        <LinearGradient colors={['#E0F7FA', '#D0F0E7']} style={styles.container}>
            <View style={[styles.tile, { paddingTop: insets.top + 20 }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <ThemedText style={styles.headerTitle}>Очікування підтвердження</ThemedText>
                    <View style={{ width: 44 }} />
                </View>

                <View style={styles.content}>
                    {!canSubmit ? (
                        <>
                            <View style={styles.timerContainer}>
                                <Ionicons name="time-outline" size={70} color="#007AFF" />
                                <ThemedText style={styles.timerTitle}>Таймер активний</ThemedText>
                                <View style={styles.timerDisplay}>
                                    <ThemedText style={styles.timerText}>
                                        {formatTime(secondsRemaining)}
                                    </ThemedText>
                                </View>
                                <ThemedText style={styles.timerDescription}>
                                    Для підтвердження порушення зачекайте 5 хвилин.
                                </ThemedText>
                            </View>

                            <View style={styles.infoBox}>
                                <Ionicons name="information-circle" size={24} color="#007AFF" />
                                <ThemedText style={styles.infoText}>
                                    Після завершення таймера зробіть ще одне фото автомобіля.
                                </ThemedText>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.completeContainer}>
                                <Ionicons name="checkmark-circle" size={70} color="#34C759" />
                                <ThemedText style={styles.completeTitle}>Таймер завершено!</ThemedText>
                                <ThemedText style={styles.completeDescription}>
                                    Тепер зробіть фото автомобіля для підтвердження порушення.
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
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tile: {
        width: '90%',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 20,
        padding: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
    content: { justifyContent: 'center' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingText: { marginTop: 16, fontSize: 16, opacity: 0.6 },
    timerContainer: { alignItems: 'center', marginBottom: 30 },
    timerTitle: { fontSize: 22, fontWeight: '600', marginVertical: 16, color: '#000' },
    timerDisplay: { backgroundColor: '#007AFF', paddingHorizontal: 30, paddingVertical: 16, borderRadius: 16, marginBottom: 12 },
    timerText: { fontSize: 42, fontWeight: '700', color: '#fff' },
    timerDescription: { fontSize: 15, textAlign: 'center', opacity: 0.7, lineHeight: 22, paddingHorizontal: 10 },
    infoBox: { flexDirection: 'row', backgroundColor: '#E3F2FD', padding: 16, borderRadius: 14, gap: 12 },
    infoText: { flex: 1, fontSize: 14, color: '#007AFF', lineHeight: 20 },
    completeContainer: { alignItems: 'center', marginBottom: 30 },
    completeTitle: { fontSize: 22, fontWeight: '600', marginVertical: 12, color: '#000' },
    completeDescription: { fontSize: 15, textAlign: 'center', opacity: 0.7, lineHeight: 22, paddingHorizontal: 10 },
    photoButton: { backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 16, borderRadius: 14, marginBottom: 12, gap: 8 },
    photoButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
    submitButton: { backgroundColor: '#F5F5F5', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    submitButtonText: { color: '#007AFF', fontSize: 16, fontWeight: '600' },
});
