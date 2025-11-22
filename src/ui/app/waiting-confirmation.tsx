import { useEffect, useState } from 'react';
import { AppState, StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { router } from 'expo-router';

import * as SecureStore from 'expo-secure-store';
import * as Notifications from 'expo-notifications';

const COUNTDOWN_SECONDS = 3 * 60 + 21;

// ✅ Оновлений NotificationHandler
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

    // Завантажуємо/створюємо таймер
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

    // ❗ ПРАВИЛЬНИЙ ТРИГЕР БЕЗ ScheduledNotificationTriggerType
    const scheduleTimerNotification = async (seconds: number) => {
        await Notifications.requestPermissionsAsync();

        await Notifications.scheduleNotificationAsync({
            content: {
                title: "Час вийшов!",
                body: "Можна зробити нове фото.",
            },
            trigger: {
                seconds,
                repeats: false,
            } as Notifications.NotificationTriggerInput,
        });
    };

    // Завантажуємо таймер при старті чи поверненні у додаток
    useEffect(() => {
        loadTimer();

        const sub = AppState.addEventListener("change", () => loadTimer());
        return () => sub.remove();
    }, []);

    // Тіканння таймера
    useEffect(() => {
        if (remaining <= 0) return;

        const interval = setInterval(() => {
            setRemaining((prev) => Math.max(prev - 1, 0));
        }, 1000);

        return () => clearInterval(interval);
    }, [remaining]);

    const safeRemaining = remaining ?? 0;

    const timerText = `${String(Math.floor(safeRemaining / 60)).padStart(2, "0")}:${String(
        safeRemaining % 60
    ).padStart(2, "0")}`;

    const handleNext = () => {
        if (safeRemaining > 0) return;
        router.replace("/confirm-photo");
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.card}>
                <View style={styles.iconBox}>
                    <ThemedText style={styles.iconText}>⌛</ThemedText>
                </View>

                <ThemedText style={styles.mainTitle}>
                    Потрібно зачекати на підтвердження
                </ThemedText>

                <ThemedText style={styles.ruleText}>
                    За правилами ПДР транспортний засіб має перебувати на місці не менше 5 хвилин,
                    щоб це вважалося стоянкою, а не зупинкою.
                </ThemedText>

                <ThemedText style={styles.timerValue}>{timerText}</ThemedText>

                <View style={styles.infoBlockYellow}>
                    <ThemedText style={styles.infoText}>
                        ⚠️ Не відходьте від авто — вам потрібно буде зробити ще одне фото.
                    </ThemedText>
                </View>

                <View style={styles.infoBlockBlue}>
                    <ThemedText style={styles.infoText}>
                        ℹ️ Ви можете закрити застосунок — ми надішлемо сповіщення, коли час завершиться.
                    </ThemedText>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.button, safeRemaining !== 0 && styles.buttonDisabled]}
                onPress={handleNext}
                disabled={safeRemaining !== 0}
            >
                <ThemedText style={styles.buttonText}>Зробити нове фото</ThemedText>
            </TouchableOpacity>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F7FA",
        paddingTop: 40,
        paddingHorizontal: 20,
    },
    card: {
        backgroundColor: "#fff",
        borderRadius: 20,
        padding: 24,
        marginTop: 10,
        marginBottom: 20,
        alignItems: "center",
        gap: 16,
    },
    iconBox: {
        width: 52,
        height: 52,
        borderRadius: 12,
        backgroundColor: "#000",
        justifyContent: "center",
        alignItems: "center",
    },
    iconText: {
        fontSize: 32,
        color: "#fff",
        marginTop: -4,
    },
    mainTitle: {
        fontSize: 22,
        fontWeight: "600",
        textAlign: "center",
    },
    ruleText: {
        fontSize: 14,
        color: "#333",
        textAlign: "center",
        lineHeight: 18,
    },
    infoBlockYellow: {
        width: "100%",
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#FFF7C2",
    },
    infoBlockBlue: {
        width: "100%",
        padding: 14,
        borderRadius: 12,
        backgroundColor: "#CCE8FF",
    },
    infoText: {
        fontSize: 14,
        color: "#333",
        lineHeight: 18,
    },
    timerValue: {
        fontSize: 42,
        fontWeight: "700",
        marginTop: 8,
        marginBottom: 8,
    },
    button: {
        width: "100%",
        paddingVertical: 16,
        borderRadius: 16,
        alignItems: "center",
        backgroundColor: "#000",
        marginBottom: 20,
    },
    buttonDisabled: {
        backgroundColor: "#CFCFCF",
    },
    buttonText: {
        color: "#fff",
        fontWeight: "600",
    },
});