import { useEffect, useState } from 'react';
import { AppState, StyleSheet, TouchableOpacity, View, useColorScheme } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { router } from 'expo-router';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const COUNTDOWN_SECONDS = 5 * 60; // 5 minutes

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export default function WaitingConfirmationScreen() {
    const [remaining, setRemaining] = useState<number>(0);
    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();

    const loadTimer = async () => {
        const stored = await SecureStore.getItemAsync("endTimestamp");
        if (stored) {
            const end = Number(stored);
            const diff = Math.max(0, Math.floor((end - Date.now()) / 1000));
            setRemaining(diff);
        } else {
            const end = Date.now() + COUNTDOWN_SECONDS * 1000;
            await SecureStore.setItemAsync("endTimestamp", String(end));
            setRemaining(COUNTDOWN_SECONDS);
            scheduleTimerNotification(COUNTDOWN_SECONDS);
        }
    };

    const scheduleTimerNotification = async (seconds: number) => {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status === 'granted') {
            await Notifications.scheduleNotificationAsync({
                content: {
                    title: "Час вийшов!",
                    body: "Можна зробити повторне фото для підтвердження порушення.",
                },
                trigger: {
                    seconds,
                    repeats: false,
                } as Notifications.NotificationTriggerInput,
            });
        }
    };

    useEffect(() => {
        loadTimer();
        const sub = AppState.addEventListener("change", (nextAppState) => {
            if (nextAppState === 'active') loadTimer();
        });
        return () => sub.remove();
    }, []);

    useEffect(() => {
        if (remaining <= 0) return;
        const interval = setInterval(() => {
            setRemaining((prev) => Math.max(prev - 1, 0));
        }, 1000);
        return () => clearInterval(interval);
    }, [remaining]);

    const safeRemaining = remaining ?? 0;
    const minutes = Math.floor(safeRemaining / 60);
    const seconds = safeRemaining % 60;
    const timerText = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;

    const handleNext = () => {
        if (safeRemaining > 0) return;
        router.replace("/confirm-photo");
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top }]}>
            <View style={styles.content}>
                <View style={[styles.iconBox, { backgroundColor: theme.tint }]}>
                    <Ionicons name="hourglass-outline" size={32} color="#fff" />
                </View>

                <ThemedText type="title" style={styles.mainTitle}>
                    Очікування підтвердження
                </ThemedText>

                <ThemedText style={styles.ruleText}>
                    Згідно з ПДР, для фіксації стоянки транспортний засіб має перебувати на місці не менше 5 хвилин.
                </ThemedText>

                <View style={styles.timerContainer}>
                    <ThemedText style={[styles.timerValue, { color: theme.text }]}>{timerText}</ThemedText>
                    <ThemedText style={styles.timerLabel}>залишилось часу</ThemedText>
                </View>

                <View style={[styles.infoBlock, { backgroundColor: '#FFF9C4' }]}>
                    <Ionicons name="warning-outline" size={20} color="#F57F17" style={styles.infoIcon} />
                    <ThemedText style={[styles.infoText, { color: '#F57F17' }]}>
                        Не відходьте далеко від авто. Вам потрібно буде зробити повторне фото через 5 хвилин.
                    </ThemedText>
                </View>

                <View style={[styles.infoBlock, { backgroundColor: '#E3F2FD' }]}>
                    <Ionicons name="notifications-outline" size={20} color="#1976D2" style={styles.infoIcon} />
                    <ThemedText style={[styles.infoText, { color: '#1976D2' }]}>
                        Ви можете згорнути додаток. Ми надішлемо сповіщення, коли таймер завершиться.
                    </ThemedText>
                </View>
            </View>

            <View style={[styles.footer, { paddingBottom: insets.bottom + 20 }]}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.tint }, safeRemaining > 0 && styles.buttonDisabled]}
                    onPress={handleNext}
                    disabled={safeRemaining > 0}
                >
                    <ThemedText style={styles.buttonText}>
                        {safeRemaining > 0 ? 'Зачекайте завершення таймера' : 'Зробити повторне фото'}
                    </ThemedText>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    content: { flex: 1, padding: 24, alignItems: 'center' },
    iconBox: {
        width: 64,
        height: 64,
        borderRadius: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    },
    mainTitle: { fontSize: 24, textAlign: 'center', marginBottom: 12 },
    ruleText: { fontSize: 16, textAlign: 'center', opacity: 0.7, lineHeight: 22, marginBottom: 32 },

    timerContainer: { alignItems: 'center', marginBottom: 32 },
    timerValue: { fontSize: 56, fontWeight: '700', fontVariant: ['tabular-nums'] },
    timerLabel: { fontSize: 14, opacity: 0.5, textTransform: 'uppercase', letterSpacing: 1 },

    infoBlock: {
        flexDirection: 'row',
        width: '100%',
        padding: 16,
        borderRadius: 16,
        marginBottom: 16,
        alignItems: 'flex-start',
        gap: 12
    },
    infoIcon: { marginTop: 2 },
    infoText: { flex: 1, fontSize: 14, lineHeight: 20, fontWeight: '500' },

    footer: { paddingHorizontal: 20 },
    button: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    },
    buttonDisabled: { opacity: 0.5, shadowOpacity: 0 },
    buttonText: { color: '#fff', fontWeight: '600', fontSize: 16 },
});