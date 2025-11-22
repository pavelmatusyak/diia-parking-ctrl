import { ThemedText } from '@/components/themed-text';
import { MAPTILER_TILE_URL } from '@/constants/maptiler';
import { ThemedView } from '@/constants/themed-view';
import { useReactNativeMaps } from '@/hooks/use-react-native-maps';
import { submitViolationDetails } from '@/services/api';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View, useColorScheme } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViolationContext } from '@/context/violation-context';

const REASONS = [
    { id: 'no_stopping_zone', title: 'Стоянка під знаком заборони', description: 'Знак 3.34 «Зупинку заборонено»' },
    { id: 'crosswalk_blocked', title: 'Перешкода пішоходам', description: 'Паркування на переході або тротуарі' },
    { id: 'disabled_spot', title: 'Місце для людей з інвалідністю', description: 'Без відповідного посвідчення' },
    { id: 'intersection', title: 'Ближче 10м до перехрестя', description: 'Обмеження оглядовості' },
    { id: 'other', title: 'Інше порушення', description: 'Опишіть деталі в коментарі' },
];

export default function ViolationDetailsScreen() {
    const params = useLocalSearchParams();
    const reportId = params.reportId as string | undefined;
    const latitude = params.latitude ? Number(params.latitude) : undefined;
    const longitude = params.longitude ? Number(params.longitude) : undefined;
    const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);

    const { signsPhotos, addSignPhoto, confirmPhoto } = useViolationContext();
    const [selectedReason, setSelectedReason] = useState<string | null>(null);
    const [hasSigns, setHasSigns] = useState<'yes' | 'no' | null>(null);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();

    const mapComponents = useReactNativeMaps();
    const MapViewComponent = mapComponents?.MapView;
    const MarkerComponent = mapComponents?.Marker;
    const UrlTileComponent = mapComponents?.UrlTile;
    const canRenderTileOverlay = Boolean(UrlTileComponent);

    const activeReason = useMemo(() => REASONS.find(r => r.id === selectedReason), [selectedReason]);

    const handleAddSignPhoto = () => {
        router.push('/signs-camera');
    };

    const handleSubmit = async () => {
        if (!reportId) {
            Alert.alert('Помилка', 'Відсутній ID звіту');
            return;
        }
        if (!selectedReason) {
            Alert.alert('Увага', 'Оберіть причину порушення');
            return;
        }
        if (hasSigns === null) {
            Alert.alert('Увага', 'Вкажіть наявність знаків');
            return;
        }
        if (hasSigns === 'yes' && signsPhotos.length === 0) {
            Alert.alert('Увага', 'Ви вказали наявність знаків, але не додали фото');
            return;
        }

        // Timer Logic Check
        if (hasSigns === 'no' && !confirmPhoto) {
            router.push('/waiting-confirmation');
            return;
        }

        setSending(true);
        try {
            const violationId = params.violationId as string || reportId;
            await submitViolationDetails({
                violationId,
                reason: selectedReason,
                hasSupportingSigns: hasSigns === 'yes',
                note: note.trim() || undefined,
                latitude,
                longitude,
                confirmPhotoUri: confirmPhoto || undefined,
            });
            router.replace('/violation-success');
        } catch (error) {
            console.error(error);
            Alert.alert('Помилка', 'Не вдалося відправити дані');
        } finally {
            setSending(false);
        }
    };

    const renderCustomTile = () => {
        if (!canRenderTileOverlay || !UrlTileComponent || !MAPTILER_TILE_URL) return null;
        const Tile = UrlTileComponent;
        return <Tile urlTemplate={MAPTILER_TILE_URL} zIndex={0} maximumZ={20} tileSize={512} />;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <ScrollView contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}>

                {/* Map Header */}
                {MapViewComponent && MarkerComponent && hasLocation && (
                    <View style={styles.mapContainer}>
                        <MapViewComponent
                            style={styles.map}
                            mapType={canRenderTileOverlay ? 'none' : 'standard'}
                            initialRegion={{
                                latitude: latitude!,
                                longitude: longitude!,
                                latitudeDelta: 0.004,
                                longitudeDelta: 0.004,
                            }}
                            scrollEnabled={false}
                            zoomEnabled={false}
                        >
                            {renderCustomTile()}
                            <MarkerComponent coordinate={{ latitude: latitude!, longitude: longitude! }} />
                        </MapViewComponent>
                        <View style={styles.mapOverlay} />
                    </View>
                )}

                <View style={styles.content}>
                    <ThemedText type="title" style={styles.pageTitle}>Деталі порушення</ThemedText>

                    {/* Reason Section */}
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Причина</ThemedText>
                    <View style={styles.reasonsGrid}>
                        {REASONS.map(r => {
                            const isActive = r.id === selectedReason;
                            return (
                                <TouchableOpacity
                                    key={r.id}
                                    style={[styles.reasonCard, isActive && { borderColor: theme.tint, backgroundColor: theme.tint + '10' }]}
                                    onPress={() => setSelectedReason(r.id)}
                                >
                                    <ThemedText style={[styles.reasonTitle, isActive && { color: theme.tint }]}>{r.title}</ThemedText>
                                    <ThemedText style={styles.reasonDesc}>{r.description}</ThemedText>
                                    {isActive && (
                                        <View style={[styles.checkIcon, { backgroundColor: theme.tint }]}>
                                            <Ionicons name="checkmark" size={12} color="#fff" />
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        })}
                    </View>

                    {/* Signs Section */}
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Знаки та розмітка</ThemedText>
                    <View style={styles.signsContainer}>
                        <ThemedText style={styles.questionText}>Чи є поруч знаки, що забороняють паркування?</ThemedText>
                        <View style={styles.toggleRow}>
                            {['yes', 'no'].map(opt => {
                                const isSelected = hasSigns === opt;
                                return (
                                    <TouchableOpacity
                                        key={opt}
                                        style={[
                                            styles.toggleButton,
                                            isSelected && { backgroundColor: theme.tint, borderColor: theme.tint }
                                        ]}
                                        onPress={() => setHasSigns(opt as 'yes' | 'no')}
                                    >
                                        <ThemedText style={[styles.toggleText, isSelected && { color: '#fff' }]}>
                                            {opt === 'yes' ? 'Так, є знаки' : 'Ні, знаків немає'}
                                        </ThemedText>
                                    </TouchableOpacity>
                                );
                            })}
                        </View>

                        {hasSigns === 'yes' && (
                            <View style={styles.photoSection}>
                                <TouchableOpacity style={styles.addPhotoButton} onPress={handleAddSignPhoto}>
                                    <Ionicons name="camera" size={24} color={theme.tint} />
                                    <ThemedText style={[styles.addPhotoText, { color: theme.tint }]}>
                                        {signsPhotos.length > 0 ? `Додано фото: ${signsPhotos.length}` : 'Додати фото знаку'}
                                    </ThemedText>
                                </TouchableOpacity>
                            </View>
                        )}
                    </View>

                    {/* Note Section */}
                    <ThemedText type="defaultSemiBold" style={styles.sectionTitle}>Коментар</ThemedText>
                    <TextInput
                        style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                        placeholder="Додаткові деталі..."
                        placeholderTextColor="#999"
                        multiline
                        value={note}
                        onChangeText={setNote}
                    />
                </View>
            </ScrollView>

            {/* Footer */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 20, backgroundColor: theme.background }]}>
                <TouchableOpacity
                    style={[styles.submitButton, { backgroundColor: theme.tint }, sending && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={sending}
                >
                    {sending ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.submitButtonText}>Відправити звіт</ThemedText>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollContent: { paddingTop: 0 },
    mapContainer: { height: 200, width: '100%' },
    map: { flex: 1 },
    mapOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(0,0,0,0.1) 100%)' }, // Gradient simulation

    content: { padding: 20, marginTop: -20, borderTopLeftRadius: 24, borderTopRightRadius: 24, backgroundColor: '#fff' }, // Overlap map
    pageTitle: { fontSize: 24, marginBottom: 24 },
    sectionTitle: { fontSize: 18, marginBottom: 12, marginTop: 8 },

    reasonsGrid: { gap: 12, marginBottom: 24 },
    reasonCard: {
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        backgroundColor: '#fff',
        position: 'relative'
    },
    reasonTitle: { fontSize: 16, fontWeight: '600', marginBottom: 4 },
    reasonDesc: { fontSize: 14, color: '#8E8E93' },
    checkIcon: { position: 'absolute', top: 16, right: 16, width: 20, height: 20, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

    signsContainer: { marginBottom: 24 },
    questionText: { fontSize: 15, color: '#666', marginBottom: 12 },
    toggleRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    toggleButton: {
        flex: 1,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E5E5EA',
        alignItems: 'center'
    },
    toggleText: { fontWeight: '600' },

    photoSection: { marginTop: 8 },
    addPhotoButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        borderRadius: 12,
        backgroundColor: '#F2F2F7',
        gap: 8
    },
    addPhotoText: { fontWeight: '600', fontSize: 15 },

    input: {
        height: 100,
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        fontSize: 16,
        textAlignVertical: 'top'
    },

    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 5
    },
    submitButton: {
        height: 56,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5
    },
    disabledButton: { opacity: 0.7 },
    submitButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' }
});
