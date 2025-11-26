import { useState, useEffect, useMemo } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Alert,
    ActivityIndicator,
    TextInput,
    Platform,
} from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import { analyzeParking, submitViolation, startTimer } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

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
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        performAnalysis();
    }, []);

    const performAnalysis = async () => {
        if (!reportId) {
            setAnalyzing(false);
            Alert.alert('Помилка', 'Відсутній ідентифікатор порушення', [
                { text: 'OK', onPress: () => router.back() },
            ]);
            return;
        }

        setAnalyzing(true);
        try {
            const results = await Promise.race([
                analyzeParking(reportId),
                analyzeParking(reportId),
                analyzeParking(reportId),
            ]);

            setAnalysis(results);

            const preselected = new Set<string>();
            const breakdown = results?.probabilityBreakdown || {};
            Object.entries(breakdown).forEach(([key, prob]) => {
                if ((prob as number) > 0.5) preselected.add(key);
            });
            setSelectedViolations(preselected);

            if (results?.finalHumanReadableConclusion) {
                Alert.alert('Аналіз паркування', results.finalHumanReadableConclusion);
            }
        } catch (error: any) {
            Alert.alert('Помилка', 'Не вдалося проаналізувати паркування');
            router.back();
        } finally {
            setAnalyzing(false);
        }
    };

    const toggleViolation = (key: string) => {
        const newSet = new Set(selectedViolations);
        if (newSet.has(key)) newSet.delete(key);
        else newSet.add(key);
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

        // 🔥 ЄДИНА ЗМІНА ТУТ:
        const needsTimer =
            selectedViolations.has('pedestrian_zone') ||
            selectedViolations.has('bus_stop_30m');

        if (needsTimer) {
            console.log("Timer triggered by violation selection");
            try {
                await startTimer(reportId);
                router.push('/waiting-confirmation');
                return;
            } catch (err) {
                alert("Помилка запуску таймера");
                return;
            }
        }
        // 🔥 КІНЕЦЬ ЄДИНОЇ ЗМІНИ

        setSubmitting(true);
        try {
            const violations = Array.from(selectedViolations).map((key) => ({
                violation_reason: key,
                violation_code: key,
                violation_type: key,
            }));

            const payload = {
                violations,
                notes: notes || undefined,
            };

            await submitViolation(reportId, payload);
            router.push('/violation-success');
        } catch (error: any) {
            alert("Помилка відправки звіту");
        } finally {
            setSubmitting(false);
        }
    };

    const backendBreakdown: Record<string, number> = useMemo(() => {
        return analysis?.probabilityBreakdown || {};
    }, [analysis]);

    const sortedFilteredViolations = useMemo(() => {
        const arr = Object.entries(VIOLATION_TYPES).map(([key, info]) => {
            const prob = typeof backendBreakdown[key] === 'number' ? backendBreakdown[key] : 0;
            return { key, info, prob };
        });

        const q = searchQuery.trim().toLowerCase();
        const filtered = q
            ? arr.filter((item) => `${item.info.title} ${item.info.description}`.toLowerCase().includes(q))
            : arr;

        filtered.sort((a, b) => b.prob - a.prob);
        return filtered;
    }, [backendBreakdown, searchQuery]);

    if (analyzing) {
        return (
            <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#007AFF" />
                    <ThemedText style={styles.loadingText}>Аналіз паркування...</ThemedText>
                    <ThemedText style={styles.loadingSubtext}>Це може зайняти кілька секунд</ThemedText>
                </View>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>

                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    Оберіть правопорушення
                </ThemedText>

                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.infoBox}>
                    <Ionicons name="information-circle" size={18} color="#000" />
                    <ThemedText style={styles.infoText}>
                        Виберіть усі підходящі правопорушення для вашого випадку
                    </ThemedText>
                </View>

                <View style={styles.searchRow}>
                    <View style={styles.searchBox}>
                        <Ionicons name="search" size={18} color="#697386" style={{ marginRight: 8 }} />
                        <TextInput
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                            placeholder="Пошук правопорушення"
                            placeholderTextColor="#697386"
                            style={styles.searchInput}
                        />
                    </View>
                </View>

                <ThemedText style={styles.selectedCount}>
                    Обрано порушень: {selectedViolations.size}
                </ThemedText>

                <View style={{ marginTop: 8 }}>
                    {sortedFilteredViolations.map(({ key, info, prob }, index) => {
                        const isSelected = selectedViolations.has(key);
                        const percent = Math.round((prob || 0) * 100);

                        const isTop =
                            index === 0 &&
                            sortedFilteredViolations.length > 0 &&
                            (sortedFilteredViolations[0].prob || 0) > 0;

                        return (
                            <TouchableOpacity
                                key={key}
                                style={[
                                    styles.violationRow,
                                    isSelected && styles.violationRowSelected,
                                    isTop && styles.violationRowTop,
                                ]}
                                onPress={() => toggleViolation(key)}
                                activeOpacity={0.85}
                            >
                                <View style={styles.checkboxWrapper}>
                                    <Ionicons
                                        name={isSelected ? 'checkbox' : 'square-outline'}
                                        size={26}
                                        color={isSelected ? '#000' : '#697386'}
                                    />
                                </View>

                                <View style={styles.violationTextWrap}>
                                    <ThemedText style={styles.violationTitle}>{info.title}</ThemedText>
                                    <ThemedText style={styles.violationDescription}>{info.description}</ThemedText>
                                </View>

                                <View style={styles.probWrap}>
                                    <View style={[styles.probBadge, isTop && styles.probBadgeTop]}>
                                        <ThemedText
                                            style={[styles.probText, isTop && styles.probTextTop]}
                                        >
                                            {percent}%
                                        </ThemedText>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <View style={styles.notesSection}>
                    <ThemedText style={styles.notesTitle}>Додаткові примітки (опціонально)</ThemedText>
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

            <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
                <TouchableOpacity
                    style={[styles.nextButton, submitting && styles.nextButtonDisabled]}
                    onPress={handleSubmit}
                    disabled={submitting}
                    activeOpacity={0.85}
                >
                    {submitting ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.nextButtonText}>Далі</ThemedText>
                    )}
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E2ECF4' },

    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    loadingText: { fontSize: 18, fontWeight: '600', color: '#000' },
    loadingSubtext: { marginTop: 8, fontSize: 14, color: '#333', opacity: 0.6 },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingBottom: 8,
        height: Platform.OS === 'ios' ? 68 : 64,
    },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 22, fontWeight: '600', color: '#000' },

    content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 48 },

    infoBox: {
        backgroundColor: '#0075FB29',
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 12,
        borderRadius: 12,
        marginTop: 6,
    },
    infoText: { marginLeft: 8, fontSize: 14, color: '#000' },

    searchRow: { marginTop: 16 },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
    },
    searchInput: { flex: 1, fontSize: 16, color: '#000' },

    selectedCount: { marginTop: 12, marginBottom: 8, fontSize: 14, color: '#000' },

    violationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: 14,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    violationRowSelected: { borderColor: '#000' },
    violationRowTop: {
        borderWidth: 2,
        borderColor: '#000',
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 4 },
    },
    checkboxWrapper: { width: 42, alignItems: 'center', justifyContent: 'center' },
    violationTextWrap: { flex: 1 },
    violationTitle: { fontSize: 16, fontWeight: '600', color: '#000' },
    violationDescription: { fontSize: 13, color: '#333', marginTop: 4 },

    probWrap: { marginLeft: 12, alignItems: 'flex-end' },
    probBadge: {
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E5E5EA',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        minWidth: 56,
        alignItems: 'center',
    },
    probText: { fontSize: 14, fontWeight: '600', color: '#000' },

    probBadgeTop: { backgroundColor: '#000', borderColor: '#000' },
    probTextTop: { color: '#fff' },

    notesSection: { marginTop: 18, marginBottom: 8 },
    notesTitle: { fontSize: 16, fontWeight: '600', color: '#000', marginBottom: 8 },
    notesInput: {
        backgroundColor: '#ffffff',
        borderRadius: 12,
        padding: 12,
        fontSize: 15,
        color: '#000',
        minHeight: 92,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },

    footer: { paddingHorizontal: 16, backgroundColor: 'transparent' },
    nextButton: { backgroundColor: '#000', paddingVertical: 16, borderRadius: 50, alignItems: 'center', justifyContent: 'center' },
    nextButtonDisabled: { opacity: 0.6 },
    nextButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
