import { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, TextInput } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import { analyzeParking, submitViolation } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Violation type mappings
const VIOLATION_TYPES: Record<string, { title: string; description: string }> = {
    railway_crossing: { title: 'Залізничний переїзд', description: 'Паркування на залізничному переїзді' },
    tram_track: { title: 'Трамвайна колія', description: 'Паркування на трамвайних коліях' },
    bridge_or_tunnel: { title: 'Міст або тунель', description: 'Паркування на мосту чи в тунелі' },
    pedestrian_crossing_10m: { title: 'Пішохідний перехід (10м)', description: 'Паркування ближче 10м до переходу' },
    intersection_10m: { title: 'Перехрестя (10м)', description: 'Паркування ближче 10м до перехрестя' },
    narrowing_less_than_3m: { title: 'Звуження < 3м', description: 'Залишає менше 3м для проїзду' },
    bus_stop_30m: { title: 'Зупинка (30м)', description: 'Паркування ближче 30м до зупинки' },
    driveway_exit_10m: { title: 'Виїзд з двору (10м)', description: 'Паркування ближче 10м до виїзду' },
    sidewalk: { title: 'Тротуар', description: 'Паркування на тротуарі' },
    pedestrian_zone: { title: 'Пішохідна зона', description: 'Паркування в пішохідній зоні' },
    cycleway: { title: 'Велодоріжка', description: 'Паркування на велодоріжці' },
    blocking_traffic_signal: { title: 'Блокування світлофора', description: 'Перешкода видимості світлофора' },
    blocking_roadway: { title: 'Блокування проїзду', description: 'Перешкода руху транспорту' },
};

export default function ViolationDetailsScreen() {
    const insets = useSafeAreaInsets();
    const { reportId } = useViolationContext();
    const [analyzing, setAnalyzing] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [analysis, setAnalysis] = useState<any>(null);
    const [selectedViolations, setSelectedViolations] = useState<Set<string>>(new Set());
    const [notes, setNotes] = useState('');

    useEffect(() => {
        performAnalysis();
    }, []);

    const performAnalysis = async () => {
        if (!reportId) {
            setAnalyzing(false);
            Alert.alert('Помилка', 'Відсутній ідентифікатор порушення', [
                { text: 'OK', onPress: () => router.back() }
            ]);
            return;
        }

        setAnalyzing(true);
        try {
            // Make 3 parallel requests and use the first successful one
            const results = await Promise.race([
                analyzeParking(reportId),
                analyzeParking(reportId),
                analyzeParking(reportId)
            ]);

            setAnalysis(results);

            // Pre-select violations with probability > 0.5
            const preselected = new Set<string>();
            Object.entries(results.probabilityBreakdown).forEach(([key, prob]) => {
                if ((prob as number) > 0.5) {
                    preselected.add(key);
                }
            });
            setSelectedViolations(preselected);

            // Show AI conclusion as alert
            if (results.finalHumanReadableConclusion) {
                Alert.alert('Аналіз паркування', results.finalHumanReadableConclusion);
            }
        } catch (error: any) {
            console.error('Analysis failed:', error);
            Alert.alert('Помилка', 'Не вдалося проаналізувати паркування. Спробуйте ще раз.');
            router.back();
        } finally {
            setAnalyzing(false);
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

    const handleSubmit = async () => {
        if (selectedViolations.size === 0) {
            Alert.alert('Увага', 'Оберіть хоча б одне порушення');
            return;
        }

        if (!reportId) {
            Alert.alert('Помилка', 'Відсутній ідентифікатор порушення');
            return;
        }

        setSubmitting(true);
        try {
            const violations = Array.from(selectedViolations).map(key => ({
                violation_reason: key,
                violation_code: key,
                violation_type: key,
            }));

            const payload = {
                violations,
                notes: notes || undefined,
            };

            console.log('Submitting violations:', violations);
            console.log('Full payload:', JSON.stringify(payload, null, 2));
            console.log('Notes:', notes);

            const result = await submitViolation(reportId, payload);

            console.log('Submission successful:', result);

            // Navigate to success/evidence screen
            router.push('/violation-success');
        } catch (error: any) {
            console.error('Submission failed:', error);
            console.error('Error details:', error.data);

            // Check if timer is required
            if (error.status === 400 && error.data?.detail) {
                const detail = error.data.detail;

                if (detail.includes('timer') || detail.includes('5-minute') || detail.includes('sign photo')) {
                    // Timer is required - start it automatically
                    console.log('Timer required, starting timer...');
                    try {
                        const { startTimer } = await import('@/services/api');
                        await startTimer(reportId);
                        console.log('Timer started successfully');
                        router.push('/waiting-confirmation');
                    } catch (err) {
                        console.error('Failed to start timer:', err);
                        alert('Помилка: Не вдалося запустити таймер');
                    }
                } else {
                    // Other 400 error
                    console.error('Other 400 error:', detail);
                    alert(`Помилка: ${detail || 'Не вдалося відправити звіт'}`);
                }
            } else {
                console.error('Non-400 error:', error.message);
                alert(`Помилка: ${error.message || 'Не вдалося відправити звіт'}`);
            }
        } finally {
            setSubmitting(false);
        }
    };

    if (analyzing) {
        return (
            <ThemedView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <ThemedText style={styles.loadingText}>
                        Аналіз паркування...
                    </ThemedText>
                    <ThemedText style={styles.loadingSubtext}>
                        Це може зайняти кілька секунд
                    </ThemedText>
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
                    Деталі порушення
                </ThemedText>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <ThemedText style={styles.sectionTitle}>Оберіть типи порушень</ThemedText>
                <ThemedText style={styles.sectionSubtitle}>
                    Типи з ймовірністю {'>'} 50% вже обрані
                </ThemedText>

                {/* Violation Types */}
                {Object.entries(VIOLATION_TYPES).map(([key, info]) => {
                    const probability = analysis?.probabilityBreakdown?.[key] || 0;
                    const isSelected = selectedViolations.has(key);

                    return (
                        <TouchableOpacity
                            key={key}
                            style={[
                                styles.violationCard,
                                isSelected && styles.violationCardSelected
                            ]}
                            onPress={() => toggleViolation(key)}
                        >
                            <View style={styles.violationHeader}>
                                <View style={styles.violationInfo}>
                                    <ThemedText style={styles.violationTitle}>
                                        {info.title}
                                    </ThemedText>
                                    <ThemedText style={styles.violationDescription}>
                                        {info.description}
                                    </ThemedText>
                                </View>
                                <View style={styles.violationRight}>
                                    {probability > 0 && (
                                        <View style={styles.probabilityBadge}>
                                            <ThemedText style={styles.probabilityText}>
                                                {Math.round(probability * 100)}%
                                            </ThemedText>
                                        </View>
                                    )}
                                    <Ionicons
                                        name={isSelected ? 'checkbox' : 'square-outline'}
                                        size={24}
                                        color={isSelected ? '#007AFF' : '#C7C7CC'}
                                    />
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                {/* Notes */}
                <View style={styles.notesSection}>
                    <ThemedText style={styles.sectionTitle}>Додаткові примітки (опціонально)</ThemedText>
                    <TextInput
                        style={styles.notesInput}
                        placeholder="Додайте будь-які деталі про порушення..."
                        placeholderTextColor="#999"
                        multiline
                        numberOfLines={4}
                        value={notes}
                        onChangeText={setNotes}
                        textAlignVertical="top"
                    />
                </View>
            </ScrollView>

            {/* Submit Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={[styles.submitButton, submitting && styles.submitButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.submitButtonText}>
                            Відправити звіт
                        </ThemedText>
                    )}
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#fff' },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingText: { fontSize: 18, fontWeight: '600', color: '#000' },
    loadingSubtext: { marginTop: 8, fontSize: 14, color: '#333', opacity: 0.6 },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#E5E5EA' },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, color: '#000' },
    scrollView: { flex: 1 },
    content: { padding: 20 },
    sectionTitle: { fontSize: 18, fontWeight: '600', color: '#000', marginBottom: 8 },
    sectionSubtitle: { fontSize: 14, color: '#333', opacity: 0.6, marginBottom: 16 },
    violationCard: {
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 }
    },
    violationCardSelected: {
        borderColor: '#007AFF',
        backgroundColor: '#E3F2FD'
    },
    violationHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    violationInfo: { flex: 1, marginRight: 12 },
    violationTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
    violationDescription: { fontSize: 14, color: '#333', opacity: 0.8 },
    violationRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    probabilityBadge: { backgroundColor: '#007AFF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 },
    probabilityText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    notesSection: { marginTop: 24 },
    notesInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, fontSize: 16, color: '#000', minHeight: 100, marginTop: 8 },
    footer: { padding: 20, borderTopWidth: 1, borderTopColor: '#E5E5EA' },
    submitButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    submitButtonDisabled: { opacity: 0.5 },
    submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
