import { router } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    StyleSheet,
    TouchableOpacity,
    View,
    Text,
} from 'react-native';
import { requestAllPermissions } from '@/services/permissions';

export default function CreateTicketScreen() {
    const [loading, setLoading] = useState(false);

    const handleGrantAccess = async () => {
        setLoading(true);
        try {
            const { camera, location } = await requestAllPermissions();

            if (!camera || !location) {
                Alert.alert(
                    'Дозволи не надано',
                    'Додаток потребує доступу до камери та геолокації.',
                );
                setLoading(false);
                return;
            }

            router.push('/map-selection');
        } catch {
            Alert.alert('Помилка', 'Не вдалося отримати дозволи');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>

            {/* BACK BUTTON */}
            <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                <Text style={styles.backIcon}>‹</Text>
            </TouchableOpacity>

            <Text style={styles.header}>Вибір авто</Text>

            {/* MAIN CARD */}
            <View style={styles.card}>
                <Text style={styles.cardTitle}>Надайте доступ до геопозиції та камери</Text>

                <View style={styles.greyBox}>
                    <Text style={styles.greyText}>
                        Для того, щоб зафіксувати паркувальне порушення, надайте нам доступ до камери та геолокації.
                        Ми зможемо передати матеріали в поліцію.
                    </Text>
                </View>
            </View>

            {/* BUTTON */}
            <TouchableOpacity
                style={styles.button}
                onPress={handleGrantAccess}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="#FFFFFF" />
                ) : (
                    <Text style={styles.buttonText}>Далі</Text>
                )}
            </TouchableOpacity>

        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
        paddingTop: 60,
        paddingHorizontal: 20,
    },

    /* HEADER */
    backButton: {
        position: 'absolute',
        left: 20,
        top: 20,
        backgroundColor: '#FFFFFF',
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOpacity: 0.1,
        shadowRadius: 6,
        elevation: 3,
    },
    backIcon: {
        fontSize: 28,
        fontWeight: '300',
    },
    header: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'center',
    },

    /* CONTENT */
    card: {
        marginTop: 20,
    },
    cardTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 20,
        textAlign: 'left',
    },
    greyBox: {
        width: '100%',
        minHeight: 220,
        padding: 20,
        borderRadius: 8,
        backgroundColor: '#E8ECF0',
        borderWidth: 1,
        borderColor: '#D3D7DB',
    },
    greyText: {
        fontSize: 15,
        lineHeight: 22,
        color: '#333',
    },

    /* BUTTON */
    button: {
        position: 'absolute',
        bottom: 30,
        left: 20,
        right: 20,
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    buttonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
});
