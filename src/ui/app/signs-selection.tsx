import { router } from 'expo-router';
import { useState } from 'react';
import { StyleSheet, TouchableOpacity, View, Text } from 'react-native';
import { useViolationContext } from '@/context/violation-context';

const SIGNS = [
    { id: 'no_parking', label: 'Зупинка заборонена', icon: '🅿️' },
    { id: 'tow_zone', label: 'Працює евакуатор', icon: '🚛' },
    { id: 'disabled', label: 'Місце для людей з інвалідністю', icon: '♿' },
    { id: 'crosswalk', label: 'Пішохідний перехід', icon: '🚶' },
];

export default function SignsSelectionScreen() {
    const { selectedSigns, setSelectedSigns } = useViolationContext();
    const [localSelection, setLocalSelection] = useState<string[]>(selectedSigns);

    const toggleSign = (id: string) => {
        setLocalSelection(prev =>
            prev.includes(id)
                ? prev.filter(x => x !== id)
                : [...prev, id]
        );
    };

    const handleContinue = () => {
        if (localSelection.length === 0) return;
        setSelectedSigns(localSelection);

        // Логіка маршруту
        if (localSelection.length === 1 && localSelection[0] === 'no_parking') {
            router.push('/signs-camera');
        } else {
            router.push('/signs-camera2');
        }
    };

    return (
        <View style={styles.container}>

            {/* BACK BUTTON */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>

            {/* HEADER */}
            <Text style={styles.header}>Виберіть знаки або розмітку</Text>
            <Text style={styles.subtext}>Можна обрати кілька варіантів</Text>

            {/* SIGNS LIST */}
            <View style={styles.list}>
                {SIGNS.map(sign => {
                    const active = localSelection.includes(sign.id);

                    return (
                        <TouchableOpacity
                            key={sign.id}
                            style={[styles.card, active && styles.cardActive]}
                            onPress={() => toggleSign(sign.id)}
                        >
                            <Text style={styles.icon}>{sign.icon}</Text>
                            <Text style={[styles.label, active && styles.labelActive]}>
                                {sign.label}
                            </Text>
                            {active && <Text style={styles.check}>✓</Text>}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* CONTINUE BUTTON */}
            <TouchableOpacity
                style={[
                    styles.button,
                    localSelection.length === 0 && styles.buttonDisabled,
                ]}
                disabled={localSelection.length === 0}
                onPress={handleContinue}
            >
                <Text style={styles.buttonText}>Продовжити</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        paddingTop: 70,
        paddingHorizontal: 20,
    },
    backButton: {
        position: 'absolute',
        top: 20,
        left: 20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 3,
    },
    backIcon: {
        fontSize: 26,
        fontWeight: '300',
    },
    header: {
        fontSize: 22,
        fontWeight: '600',
    },
    subtext: {
        color: '#5A5A5A',
        marginTop: 4,
        marginBottom: 20,
    },
    list: {
        gap: 12,
        marginTop: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: '#DADFE5',
    },
    cardActive: {
        borderColor: '#000',
        backgroundColor: '#F0F0F0',
    },
    icon: {
        fontSize: 28,
        marginRight: 16,
    },
    label: {
        flex: 1,
        fontSize: 16,
        color: '#1F1F1F',
        fontWeight: '500',
    },
    labelActive: {
        color: '#000',
        fontWeight: '600',
    },
    check: {
        fontSize: 20,
        fontWeight: '700',
        color: '#000',
    },
    button: {
        position: 'absolute',
        bottom: 25,
        left: 20,
        right: 20,
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
    },
    buttonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 16,
    },
    buttonDisabled: {
        opacity: 0.25,
    },
});
