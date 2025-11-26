import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViolationContext } from '@/context/violation-context';
import { getEvidence, type EvidenceResponse } from '@/services/api';

export default function ReviewApplicationScreen() {
    const insets = useSafeAreaInsets();
    const { reportId } = useViolationContext();
    const [loading, setLoading] = useState(true);
    const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);

    useEffect(() => {
        loadEvidence();
    }, []);

    const loadEvidence = async () => {
        if (!reportId) {
            setLoading(false);
            return;
        }

        try {
            const data = await getEvidence(reportId);
            setEvidence(data);
        } catch (error) {
            console.error('Failed to load evidence:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = () => {
        router.replace('/parking-analysis');
    };

    const handleCancel = () => {
        router.back();
    };

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <ThemedText style={styles.loadingText}>Завантаження...</ThemedText>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity onPress={handleCancel} style={styles.backButton}>
                    <Ionicons name="chevron-back" size={24} color="#000" />
                </TouchableOpacity>
                <ThemedText style={styles.headerTitle}>Перевірте дані заяви</ThemedText>
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Car Plate */}
                {evidence?.license_plate && (
                    <View style={styles.card}>
                        <ThemedText style={styles.cardTitle}>Номерний знак</ThemedText>
                        <ThemedText style={styles.plateText}>{evidence.license_plate}</ThemedText>
                    </View>
                )}

                {/* Photos */}
                {!!evidence?.photos?.length && (
                    <View style={styles.card}>
                        <ThemedText style={styles.cardTitle}>
                            Фото ({evidence.photos.length})
                        </ThemedText>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                            {evidence.photos.map((p) => {
                                const url = p.url.startsWith('http')
                                    ? p.url
                                    : `${process.env.EXPO_PUBLIC_BACKEND_URL?.replace('/api/v1', '')}${p.url}`;

                                return (
                                    <Image
                                        key={p.id}
                                        source={{ uri: url }}
                                        style={styles.photo}
                                    />
                                );
                            })}
                        </ScrollView>
                    </View>
                )}

                {/* Location */}
                {evidence?.location && (
                    <View style={styles.card}>
                        <ThemedText style={styles.cardTitle}>Локація</ThemedText>
                        <ThemedText style={styles.cardText}>
                            {evidence.location.address ||
                                `${evidence.location.latitude.toFixed(6)}, ${evidence.location.longitude.toFixed(6)}`}
                        </ThemedText>
                    </View>
                )}

                {/* Violations */}
                {!!evidence?.violations?.length && (
                    <View style={styles.card}>
                        <ThemedText style={styles.cardTitle}>Правопорушення</ThemedText>
                        {evidence.violations.map((v, i) => (
                            <ThemedText key={i} style={styles.cardText}>
                                {v.violation_reason}
                            </ThemedText>
                        ))}
                    </View>
                )}
            </ScrollView>

            {/* Buttons */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity style={styles.primaryButton} onPress={handleSubmit}>
                    <ThemedText style={styles.primaryButtonText}>Підписати заяву</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryButton} onPress={handleCancel}>
                    <ThemedText style={styles.secondaryButtonText}>Скасувати</ThemedText>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#EEF5FB' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, fontSize: 16, color: '#000' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 10,
        backgroundColor: '#EEF5FB',
    },
    backButton: { marginRight: 12 },
    headerTitle: { fontSize: 20, fontWeight: '700', color: '#000' },
    content: { padding: 20 },
    card: {
        backgroundColor: '#fff',
        padding: 18,
        borderRadius: 14,
        marginBottom: 16,
    },
    cardTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#000' },
    plateText: { fontSize: 28, fontWeight: '700', letterSpacing: 2, color: '#000' },
    cardText: { fontSize: 15, color: '#000', marginBottom: 4 },
    photosScroll: { marginTop: 8 },
    photo: {
        width: 110,
        height: 110,
        borderRadius: 10,
        marginRight: 10,
        backgroundColor: '#F2F2F2',
    },
    footer: { paddingHorizontal: 20 },
    primaryButton: {
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginBottom: 12,
    },
    primaryButtonText: { color: '#fff', fontSize: 17, fontWeight: '600' },
    secondaryButton: { alignItems: 'center', paddingVertical: 12 },
    secondaryButtonText: { fontSize: 16, color: '#000' },
});
