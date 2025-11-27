import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { useViolationContext } from '@/context/violation-context';
import { getTimerStatus } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function WaitingConfirmationScreen() {
    const insets = useSafeAreaInsets();
    const { reportId } = useViolationContext();
    const [timerStatus, setTimerStatus] = useState<any>(null);

    useEffect(() => {
        if (!reportId) {
            setTimeout(() => router.back(), 2000);
            return;
        }

        const interval = setInterval(async () => {
            try {
                const status = await getTimerStatus(reportId);
                setTimerStatus(status);
                if (status.can_submit) clearInterval(interval);
            } catch (error) {
                console.error(error);
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [reportId]);

    const secondsRemaining = timerStatus?.seconds_remaining ?? 0;
    const canSubmit = timerStatus?.can_submit ?? false;

    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = (s % 60).toString().padStart(2, '0');
        return `${m}:${sec}`;
    };

    return (
        <View style={styles.container}>
            {/* Back */}
            <View style={[styles.header, { paddingTop: insets.top + 6 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="black" />
                </TouchableOpacity>
            </View>

            {/* Icon + TIMER */}
            <View style={styles.iconWrapper}>
                <View style={styles.iconBox}>
                    <Ionicons name="time" size={44} color="white" />
                </View>

                <ThemedText style={styles.timerText}>
                    {formatTime(secondsRemaining)}
                </ThemedText>
            </View>

            {/* Title */}
            <ThemedText style={styles.title} type="title">
                Зачекайте {Math.ceil(secondsRemaining / 300)} хв для{'\n'}підтвердження стоянки
            </ThemedText>

            {/* Explanation */}
            <ThemedText style={styles.description}>
                За правилами ПДР, транспортний засіб має перебувати на місці не менше 5 хвилин,
                щоб це вважалося стоянкою, а не зупинкою.
            </ThemedText>

            {/* Yellow warning block */}
            <View style={[styles.infoBlock, styles.warning]}>
                <Ionicons name="warning" size={22} color="#111" />
                <ThemedText style={styles.infoText}>
                    Не відходьте від авто, ми попросимо вас зробити ще одне фото,
                    коли час таймеру спливе
                </ThemedText>
            </View>

            {/* Blue info block */}
            <View style={[styles.infoBlock, styles.info]}>
                <Ionicons name="information-circle" size={22} color="#111" />
                <ThemedText style={styles.infoText}>
                    Ви можете закрити застосунок на цей час, ми надішлемо вам сповіщення,
                    коли все буде готово
                </ThemedText>
            </View>

            {/* BUTTON */}
            {canSubmit ? (
                <TouchableOpacity
                    style={styles.buttonActive}
                    onPress={() => router.push('/plate-retake')}
                >
                    <ThemedText style={styles.buttonActiveText}>Далі</ThemedText>
                </TouchableOpacity>
            ) : (
                <View style={styles.buttonDisabled}>
                    <ThemedText style={styles.buttonText}>Далі</ThemedText>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#EAF4FF',
        paddingHorizontal: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingBottom: 8,
    },
    backButton: {
        padding: 4,
    },
    iconWrapper: {
        marginTop: 20,
        alignItems: 'center',
    },
    iconBox: {
        width: 68,
        height: 68,
        borderRadius: 16,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    timerText: {
        marginTop: 16,
        fontSize: 48,
        fontWeight: '800',
        color: '#000',
        letterSpacing: -1,
        textAlign: 'center',
    },
    title: {
        textAlign: 'center',
        fontSize: 24,
        marginTop: 24,
        fontWeight: '700',
        letterSpacing: -0.3,
    },
    description: {
        textAlign: 'center',
        marginTop: 12,
        fontSize: 15,
        lineHeight: 22,
        color: '#111',
    },
    infoBlock: {
        flexDirection: 'row',
        padding: 16,
        borderRadius: 16,
        marginTop: 24,
        gap: 12,
    },
    warning: {
        backgroundColor: '#FFF9C4',
    },
    info: {
        backgroundColor: '#D6E8FF',
    },
    infoText: {
        flex: 1,
        fontSize: 15,
        lineHeight: 20,
        color: '#111',
    },

    /* Disabled button */
    buttonDisabled: {
        backgroundColor: '#D1D5DB',
        borderRadius: 32,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 24,
    },
    buttonText: {
        color: '#7B7B7B',
        fontSize: 17,
        fontWeight: '600',
    },

    /* Active button */
    buttonActive: {
        backgroundColor: '#000',
        borderRadius: 32,
        paddingVertical: 18,
        alignItems: 'center',
        marginTop: 40,
        marginBottom: 24,
    },
    buttonActiveText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});
