import { useEffect, useState } from 'react';
import {
    View,
    StyleSheet,
    ScrollView,
    Image,
    ActivityIndicator,
    TouchableOpacity,
    Linking,
    Platform
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import {
    getEvidence,
    getViolationPdf,
    type EvidenceResponse
} from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ViolationSuccessScreen() {
    const insets = useSafeAreaInsets();
    const { reportId } = useViolationContext();

    const [loading, setLoading] = useState(true);
    const [evidence, setEvidence] = useState<EvidenceResponse | null>(null);
    const [pdfLoading, setPdfLoading] = useState(false);

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

    const openPdf = async () => {
        if (!reportId) return alert('Невірний ID порушення');
        try {
            setPdfLoading(true);
            const data = await getViolationPdf(reportId);
            if (!data?.pdf_url) return alert('PDF ще не готовий або відсутній');
            const url = data.pdf_url;

            if (Platform.OS === 'web') {
                window.open(url, '_blank');
                return;
            }
            const supported = await Linking.canOpenURL(url);
            if (supported) await Linking.openURL(url);
            else alert('Не вдалося відкрити PDF');
        } catch (error: any) {
            console.log('PDF load error:', error);
            alert('Помилка при завантаженні PDF: ' + (error?.data?.detail || error.message));
        } finally {
            setPdfLoading(false);
        }
    };

    const handleDone = () => router.replace('/(tabs)');

    if (loading) {
        return (
            <ThemedView style={[styles.container, { backgroundColor: '#E2ECF4' }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#000" />
                    <ThemedText style={styles.loadingText}>Завантаження...</ThemedText>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={[styles.container, { backgroundColor: '#E2ECF4' }]}>
            {/* HEADER */}
            <View style={[styles.successHeader, { paddingTop: insets.top + 20 }]}>
                <View style={styles.headerRow}>
                    <Ionicons name="arrow-back" size={24} color="#000" onPress={() => router.back()} />
                    <ThemedText style={styles.successTitle}>Порушення успішно зафіксовано!</ThemedText>
                </View>
            </View>

            {/* CONTENT */}
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                {evidence && (
                    <>
                        {/* License Plate */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="car" size={20} color="#E2ECF4" />
                                <ThemedText style={styles.cardTitle}>Номерний знак</ThemedText>
                            </View>
                            <View style={styles.plateContainer}>
                                <ThemedText style={styles.plateText}>{evidence.license_plate}</ThemedText>
                            </View>
                        </View>

                        {/* Location */}
                        <View style={styles.card}>
                            <View style={styles.cardHeader}>
                                <Ionicons name="location" size={20} color="#E2ECF4" />
                                <ThemedText style={styles.cardTitle}>Місце порушення</ThemedText>
                            </View>
                            <View style={styles.infoCard}>
                                <ThemedText style={styles.infoText}>
                                    {evidence.location.address ||
                                        `${evidence.location.latitude.toFixed(6)}, ${evidence.location.longitude.toFixed(6)}`}
                                </ThemedText>
                            </View>
                        </View>

                        {/* Photos */}
                        {evidence.photos.length > 0 && (
                            <View style={styles.card}>
                                <View style={styles.cardHeader}>
                                    <Ionicons name="images" size={20} color="#E2ECF4" />
                                    <ThemedText style={styles.cardTitle}>
                                        Фотографії ({evidence.photos.length})
                                    </ThemedText>
                                </View>
                                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.photosScroll}>
                                    {evidence.photos.map((photo) => {
                                        const photoUrl = photo.url.startsWith('http')
                                            ? photo.url
                                            : `${process.env.EXPO_PUBLIC_BACKEND_URL?.replace('/api/v1', '')}${photo.url}`;
                                        return (
                                            <Image
                                                key={photo.id}
                                                source={{ uri: photoUrl }}
                                                style={styles.photoThumbnail}
                                                resizeMode="cover"
                                            />
                                        );
                                    })}
                                </ScrollView>
                            </View>
                        )}

                        {/* PDF BUTTON */}
                        <TouchableOpacity
                            style={styles.pdfButton}
                            onPress={openPdf}
                            disabled={pdfLoading}
                        >
                            {pdfLoading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <ThemedText style={styles.pdfButtonText}>
                                    Переглянути PDF протокол
                                </ThemedText>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>

            {/* FOOTER */}
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

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 16, fontSize: 16, color: '#000' },

    successHeader: {
        paddingHorizontal: 20,
        paddingBottom: 16,
        backgroundColor: 'transparent'
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12
    },
    successTitle: { fontSize: 20, fontWeight: '700', color: '#000', flex: 1 },

    scrollView: { flex: 1 },
    content: { padding: 20, paddingBottom: 40 },

    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20
    },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
    cardTitle: { fontSize: 16, fontWeight: '600', color: '#000' },

    plateContainer: {
        backgroundColor: '#FFD700',
        borderRadius: 8,
        padding: 16,
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#000'
    },
    plateText: { fontSize: 32, fontWeight: '700', color: '#000', letterSpacing: 4 },

    infoCard: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 12
    },
    infoText: { fontSize: 16, color: '#000' },

    photosScroll: { marginTop: 8 },
    photoThumbnail: { width: 120, height: 120, borderRadius: 12, marginRight: 12, backgroundColor: '#F5F5F5' },

    pdfButton: {
        backgroundColor: '#000',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12
    },
    pdfButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },

    footer: { padding: 20 },
    doneButton: { backgroundColor: '#000', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    doneButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' }
});
