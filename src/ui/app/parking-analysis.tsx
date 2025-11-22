import { useEffect, useState } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import { analyzeParking, type AnalysisResponse } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Violation type mappings
const VIOLATION_TYPES: Record<string, { title: string; code: string }> = {
    railway_crossing: { title: 'Залізничний переїзд', code: 'railway_crossing' },
    tram_track: { title: 'Трамвайна колія', code: 'tram_track' },
    bridge_or_tunnel: { title: 'Міст або тунель', code: 'bridge_or_tunnel' },
    pedestrian_crossing_10m: { title: 'Пішохідний перехід (10м)', code: 'pedestrian_crossing_10m' },
    intersection_10m: { title: 'Перехрестя (10м)', code: 'intersection_10m' },
    narrowing_less_than_3m: { title: 'Звуження менше 3м', code: 'narrowing_less_than_3m' },
    bus_stop_30m: { title: 'Зупинка транспорту (30м)', code: 'bus_stop_30m' },
    driveway_exit_10m: { title: 'Виїзд з двору (10м)', code: 'driveway_exit_10m' },
    sidewalk: { title: 'Тротуар', code: 'sidewalk' },
    pedestrian_zone: { title: 'Пішохідна зона', code: 'pedestrian_zone' },
    cycleway: { title: 'Велодоріжка', code: 'cycleway' },
    blocking_traffic_signal: { title: 'Блокування світлофора', code: 'blocking_traffic_signal' },
    blocking_roadway: { title: 'Блокування проїжджої частини', code: 'blocking_roadway' },
};

export default function ParkingAnalysisScreen() {
    const insets = useSafeAreaInsets();
    const { reportId } = useViolationContext();
    const [loading, setLoading] = useState(true);
    const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
    const [selectedViolations, setSelectedViolations] = useState<Set<string>>(new Set());

    useEffect(() => {
        performAnalysis();
    }, []);

    const performAnalysis = async () => {
        if (!reportId) {
            Alert.alert('Помилка', 'Відсутній ідентифікатор порушення');
            router.back();
            return;
        }

        setLoading(true);
        try {
            // Make 3 parallel requests as recommended
            const results = await Promise.race([
                analyzeParking(reportId),
                analyzeParking(reportId),
                analyzeParking(reportId)
            ]);

            setAnalysis(results);

            // Pre-select violations with probability > 0.5
            const preselected = new Set<string>();
            Object.entries(results.probabilityBreakdown).forEach(([key, prob]) => {
                if (prob > 0.5) {
                    preselected.add(key);
                }
            });
            setSelectedViolations(preselected);

            // Show conclusion as alert
            if (results.finalHumanReadableConclusion) {
                Alert.alert('Аналіз паркування', results.finalHumanReadableConclusion);
            }
        } catch (error: any) {
            console.error('Analysis failed:', error);
            Alert.alert('Помилка', 'Не вдалося проаналізувати паркування');
        } finally {
            setLoading(false);
        }
    };

    const toggleViolation = (key: string) => {
        const newSet = new Set(selectedViolations);
        if (newSet.has(key)) {
            newSet.delete(key);
        } else {
            newSet.add(key);
        }
        setSelectedViolations(newSet);
    };

    const handleContinue = () => {
        if (selectedViolations.size === 0) {
            Alert.alert('Увага', 'Оберіть хоча б одне порушення');
            return;
        }
        // Navigate to violation details with selected violations
        router.push('/violation-details');
    };

    if (loading) {
        return (
            <ThemedView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <ThemedText style={styles.loadingText}>Аналіз паркування...</ThemedText>
                    <ThemedText style={styles.loadingSubtext}>Це може зайняти кілька секунд</ThemedText>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    Оберіть порушення
                </ThemedText>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <ThemedText style={styles.subtitle}>
                    Оберіть типи порушень, які ви зафіксували
                </ThemedText>

                {Object.entries(VIOLATION_TYPES).map(([key, { title }]) => {
                    const probability = analysis?.probabilityBreakdown[key] || 0;
                    const isSelected = selectedViolations.has(key);
                    const isRecommended = probability > 0.5;

                    return (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.violationCard,
                                isSelected && styles.violationCardSelected
                            ]}
                            onPress={() => toggleViolation(key)}
                        >
                            <View style={styles.violationContent}>
                                <View style={styles.violationTextContainer}>
                                    <ThemedText style={[
                                        styles.violationTitle,
                                        isSelected && styles.violationTitleSelected
                                    ]}>
                                        {title}
                                    </ThemedText>
                                    {isRecommended && (
                                        <View style={styles.recommendedBadge}>
                                            <ThemedText style={styles.recommendedText}>
                                                Рекомендовано
                                            </ThemedText>
                                        </View>
                                    )}
                                </View>
                                {isSelected && (
                                    <Ionicons name="checkmark-circle" size={24} color="#007AFF" />
                                )}
                            </View>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>

            {/* Continue Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[
                        styles.continueButton,
                        selectedViolations.size === 0 && styles.continueButtonDisabled
                    ]}
                    onPress={handleContinue}
                    disabled={selectedViolations.size === 0}
                >
                    <ThemedText style={styles.continueButtonText}>
                        Продовжити ({selectedViolations.size})
                    </ThemedText>
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
        padding: 20,
    },
    loadingText: {
        marginTop: 16,
        fontSize: 18,
        fontWeight: '600',
    },
    loadingSubtext: {
        marginTop: 8,
        fontSize: 14,
        opacity: 0.6,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    backButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: { fontSize: 18 },
    scrollView: { flex: 1 },
    content: {
        padding: 20,
    },
    subtitle: {
        fontSize: 16,
        marginBottom: 20,
        opacity: 0.7,
    },
    violationCard: {
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 2,
        borderColor: 'transparent',
    },
    violationCardSelected: {
        backgroundColor: '#E3F2FD',
        borderColor: '#007AFF',
    },
    violationContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    violationTextContainer: {
        flex: 1,
    },
    violationTitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    violationTitleSelected: {
        fontWeight: '600',
        color: '#007AFF',
    },
    recommendedBadge: {
        backgroundColor: '#FFF3CD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginTop: 6,
        alignSelf: 'flex-start',
    },
    recommendedText: {
        fontSize: 12,
        color: '#856404',
        fontWeight: '600',
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    continueButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    continueButtonDisabled: {
        opacity: 0.5,
    },
    continueButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});
