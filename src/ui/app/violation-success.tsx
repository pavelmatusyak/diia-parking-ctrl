import { useEffect, useState } from 'react';
import { View, StyleSheet, ScrollView, Image, ActivityIndicator, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import { getEvidence, type EvidenceResponse } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ViolationSuccessScreen() {
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

    const handleDone = () => {
        router.replace('/(tabs)');
    };

    if (loading) {
        return (
            <ThemedView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#34C759" />
                    <ThemedText style={styles.loadingText}>Завантаження...</ThemedText>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            {/* Success Header */}
            <View style={[styles.successHeader, { paddingTop: insets.top + 20 }]}>
                <View style={styles.successIconContainer}>
                    <Ionicons name="checkmark-circle" size={80} color="#34C759" />
                </View>
                <ThemedText style={styles.successTitle}>Порушення успішно зафіксовано!</ThemedText>
                <ThemedText style={styles.successSubtitle}>
                    Ваша заявка відправлена до поліції
                </ThemedText>
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {evidence && (
                    <>
                        {/* License Plate */}
                        <View style={styles.section}>
                            <ThemedText style={styles.sectionTitle}>Номерний знак</ThemedText>
                            <View style={styles.plateContainer}>
                                <ThemedText style={styles.plateText}>{evidence.license_plate}</ThemedText>
                            </View>
                        </View>

                        {/* Location */}
                        <View style={styles.section}>
                            <ThemedText style={styles.sectionTitle}>Місце порушення</ThemedText>
                            <View style={styles.infoCard}>
                                <Ionicons name="location" size={20} color="#007AFF" />
                                <ThemedText style={styles.infoText}>
                                    {evidence.location.address || `${evidence.location.latitude.toFixed(6)}, ${evidence.location.longitude.toFixed(6)}`}
                                </ThemedText>
                            </View>
                        </View>

                        {/* Photos */}
                        {evidence.photos.length > 0 && (
                            <View style={styles.section}>
                                <ThemedText style={styles.sectionTitle}>Фотографії ({evidence.photos.length})</ThemedText>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                                    {evidence.photos.map((photo) => (
                                        <Image
                                            key={photo.id}
                                            source={{ uri: photo.url }}
                                            style={styles.photoThumbnail}
                                            resizeMode="cover"
                                        />
                                    ))}
                                </ScrollView>
                            </View>
                        )}

                        {/* Violations */}
                        {evidence.violations.length > 0 && (
                            <View style={styles.section}>
                                <ThemedText style={styles.sectionTitle}>Типи порушень</ThemedText>
                                {evidence.violations.map((violation, index) => (
                                    <View key={index} style={styles.violationItem}>
                                        <Ionicons name="alert-circle" size={20} color="#FF3B30" />
                                        <ThemedText style={styles.violationText}>
                                            {violation.violation_reason}
                                        </ThemedText>
                                    </View>
                                ))}
                            </View>
                        )}
                    </>
                )}
            </ScrollView>

            {/* Done Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity style={styles.doneButton} onPress={handleDone}>
                    <ThemedText style={styles.doneButtonText}>Готово</ThemedText>
                </TouchableOpacity>
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
    },
    loadingText: {
        marginTop: 16,
        fontSize: 16,
    },
    successHeader: {
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingBottom: 30,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    successIconContainer: {
        marginBottom: 16,
    },
    successTitle: {
        fontSize: 24,
        fontWeight: '700',
        textAlign: 'center',
        marginBottom: 8,
    },
    successSubtitle: {
        fontSize: 16,
        opacity: 0.6,
        textAlign: 'center',
    },
    scrollView: { flex: 1 },
    content: {
        padding: 20,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    plateContainer: {
        backgroundColor: '#FFD700',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000',
    },
    plateText: {
        fontSize: 32,
        fontWeight: '700',
        color: '#000',
        letterSpacing: 4,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        gap: 12,
    },
    infoText: {
        flex: 1,
        fontSize: 16,
    },
    photosScroll: {
        marginTop: 8,
    },
    photoThumbnail: {
        width: 120,
        height: 120,
        borderRadius: 12,
        marginRight: 12,
        backgroundColor: '#F5F5F5',
    },
    violationItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF3F3',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
        gap: 12,
    },
    violationText: {
        flex: 1,
        fontSize: 16,
        fontWeight: '500',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    doneButton: {
        backgroundColor: '#34C759',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    doneButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});
