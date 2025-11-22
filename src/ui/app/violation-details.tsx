import { ThemedText } from '@/components/themed-text';
import { MAPTILER_TILE_URL } from '@/constants/maptiler';
import { ThemedView } from '@/constants/themed-view';
import { useReactNativeMaps } from '@/hooks/use-react-native-maps';
import { submitViolationDetails } from '@/services/api';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';

const REASONS = [
    { id: 'no_stopping_zone', title: 'Стоянка або зупинка під знаком', description: 'Наприклад, біля знаків 3.34‑3.38 або під знаком «Зупинка заборонена».' },
    { id: 'crosswalk_blocked', title: 'Перекрито пішохідний перехід / тротуар', description: 'Авто заважає пішоходам або обмежує огляд на переході.' },
    { id: 'disabled_spot', title: 'Стоянка на місці для людей з інвалідністю', description: 'Місце позначене відповідною розміткою або знаком.' },
];

export default function ViolationDetailsScreen() {
    const params = useLocalSearchParams();
    const reportId = params.reportId as string | undefined;
    const latitude = params.latitude ? Number(params.latitude) : undefined;
    const longitude = params.longitude ? Number(params.longitude) : undefined;
    const hasLocation = Number.isFinite(latitude) && Number.isFinite(longitude);

    const [selectedReason, setSelectedReason] = useState<string | null>(REASONS[0]?.id ?? null);
    const [hasSigns, setHasSigns] = useState<'yes' | 'no' | null>(null);
    const [note, setNote] = useState('');
    const [sending, setSending] = useState(false);
    const mapComponents = useReactNativeMaps();
    const MapViewComponent = mapComponents?.MapView;
    const MarkerComponent = mapComponents?.Marker;
    const UrlTileComponent = mapComponents?.UrlTile;
    const canRenderTileOverlay = Boolean(UrlTileComponent);

    const activeReason = useMemo(() => REASONS.find(r => r.id === selectedReason), [selectedReason]);

    const handleSubmit = async () => {
        if (!reportId) {
            alert('Відсутній ідентифікатор звіту. Спробуйте зробити фото ще раз.');
            router.replace('/(tabs)');
            return;
        }
        if (!selectedReason) {
            alert('Будь ласка, оберіть причину правопорушення');
            return;
        }
        if (hasSigns === null) {
            alert('Підтвердіть наявність знаків або розмітки');
            return;
        }

        setSending(true);
        try {
            console.log('[UI] Початок відправки штрафу до поліції...');
            
            const violationId = params.violationId as string | undefined || reportId;
            if (!violationId) {
                throw new Error('Відсутній ідентифікатор порушення');
            }
            
            console.log('[UI] Викликаємо submitViolationDetails з параметрами:', {
                violationId,
                reason: selectedReason,
                hasSupportingSigns: hasSigns === 'yes',
                note: note.trim() || undefined,
                latitude,
                longitude,
            });
            
            await submitViolationDetails({
                violationId,
                reason: selectedReason,
                hasSupportingSigns: hasSigns === 'yes',
                note: note.trim() || undefined,
                latitude,
                longitude,
            });
            
            console.log('[UI] ✅ submitViolationDetails завершено успішно. Переходимо до екрану успіху.');
            router.replace('/violation-success');
        } catch (error) {
            console.error('[UI] ❌ Помилка при відправці штрафу:', error);
            let message = 'Не вдалося відправити штраф. Спробуйте ще раз.';
            
            if (error instanceof Error) {
                message = error.message;
                // Якщо помилка про відсутність підключення
                if (error.message.includes('підключення') || error.message.includes('інтернет')) {
                    message = 'Немає підключення до інтернету. Штраф не відправлено. Перевірте з\'єднання та спробуйте ще раз.';
                }
                // Якщо помилка про відсутність відповіді від сервера
                if (error.message.includes('не отримано відповіді') || error.message.includes('немає відповіді')) {
                    message = 'Сервер не відповідає. Штраф не відправлено. Перевірте підключення до інтернету та спробуйте ще раз.';
                }
                // Якщо штраф не відправлено до поліції
                if (error.message.includes('не відправлено до поліції')) {
                    message = 'Штраф не відправлено до поліції. Спробуйте ще раз.';
                }
            }
            
            console.log('[UI] Показуємо Alert з помилкою:', message);
            Alert.alert('Помилка відправки', message);
            // НЕ переходимо далі - залишаємось на цій сторінці
            console.log('[UI] Залишаємось на поточній сторінці - перехід не виконано');
        } finally {
            setSending(false);
            console.log('[UI] setSending(false) - кнопка знову активна');
        }
    };

    const renderCustomTile = () => {
        if (!canRenderTileOverlay || !UrlTileComponent || !MAPTILER_TILE_URL) {
            return null;
        }
        const Tile = UrlTileComponent;
        return <Tile urlTemplate={MAPTILER_TILE_URL} zIndex={0} maximumZ={20} tileSize={512} />;
    };

    return (
        <ThemedView style={styles.container}>
            <ScrollView contentContainerStyle={{ paddingBottom: 140 }}>

                <ThemedText type="title" style={styles.title}>
                    Виглядає так, що авто дійсно припарковане не за правилами
                </ThemedText>
                <ThemedText style={styles.subtitle}>
                    Оберіть причину правопорушення та підтвердіть чи є знаки/розмітка
                </ThemedText>

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
                            pitchEnabled={false}
                            rotateEnabled={false}
                        >
                            {renderCustomTile()}
                            <MarkerComponent coordinate={{ latitude: latitude!, longitude: longitude! }} />
                        </MapViewComponent>
                    </View>
                )}

                <ThemedText style={styles.blockTitle}>Оберіть причину правопорушення</ThemedText>
                {REASONS.map(r => {
                    const isActive = r.id === selectedReason;
                    return (
                        <TouchableOpacity
                            key={r.id}
                            style={[styles.card, isActive && styles.cardActive]}
                            onPress={() => setSelectedReason(r.id)}
                        >
                            <ThemedText style={[styles.cardTitle, isActive && styles.cardTitleActive]}>{r.title}</ThemedText>
                            <ThemedText style={styles.cardDescription}>{r.description}</ThemedText>
                        </TouchableOpacity>
                    );
                })}

                <ThemedText style={styles.blockTitle}>
                    Чи є поруч знаки або розмітка котрі підтверджують правопорушення?
                </ThemedText>
                <View style={styles.answerRow}>
                    {['yes', 'no'].map(a => {
                        const isActive = hasSigns === a;
                        return (
                            <TouchableOpacity
                                key={a}
                                style={[styles.answerButton, isActive && styles.answerButtonActive]}
                                onPress={() => setHasSigns(a as 'yes' | 'no')}
                            >
                                <ThemedText style={[styles.answerText, isActive && styles.answerTextActive]}>
                                    {a === 'yes' ? 'Так' : 'Ні'}
                                </ThemedText>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {activeReason && (
                    <>
                        <ThemedText style={styles.blockTitle}>Додаткові деталі (необовʼязково)</ThemedText>
                        <TextInput
                            style={styles.noteInput}
                            multiline
                            numberOfLines={4}
                            placeholder="Наприклад: «Авто перекриває два місця та пішохідний перехід»"
                            value={note}
                            onChangeText={setNote}
                            textAlignVertical="top"
                        />
                    </>
                )}

            </ScrollView>

            <View style={styles.bottomBar}>
                <TouchableOpacity
                    style={[styles.nextBtn, sending ? styles.nextBtnDisabled : styles.nextBtnActive]}
                    onPress={handleSubmit}
                    disabled={sending}
                >
                    {sending ? <ActivityIndicator color="#fff" /> : <ThemedText style={[styles.nextText, sending && styles.nextTextDisabled]}>Відправити до поліції</ThemedText>}
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E9F2F8', paddingTop: 60, paddingHorizontal: 20 },
    title: { fontSize: 22, fontWeight: '700', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#1F1F1F', marginBottom: 16 },
    mapContainer: { height: 160, borderRadius: 12, overflow: 'hidden', marginBottom: 16 },
    map: { flex: 1 },
    blockTitle: { fontSize: 16, fontWeight: '600', marginBottom: 8 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#DCDCDC', gap: 4 },
    cardActive: { borderColor: '#000', backgroundColor: '#D9E9F5' },
    cardTitle: { fontSize: 15, fontWeight: '600', color: '#1F1F1F' },
    cardTitleActive: { color: '#000' },
    cardDescription: { fontSize: 14, color: '#6B6B6B' },
    answerRow: { flexDirection: 'row', gap: 12, marginBottom: 16 },
    answerButton: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: '#DCDCDC', alignItems: 'center' },
    answerButtonActive: { borderColor: '#000', backgroundColor: '#D9E9F5' },
    answerText: { fontSize: 15, fontWeight: '600', color: '#1F1F1F' },
    answerTextActive: { color: '#000' },
    noteInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#DCDCDC', padding: 12, fontSize: 14, lineHeight: 18, marginBottom: 16 },
    bottomBar: { position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20, backgroundColor: '#E9F2F8' },
    nextBtn: { paddingVertical: 14, borderRadius: 30, alignItems: 'center' },
    nextBtnActive: { backgroundColor: '#000' },
    nextBtnDisabled: { backgroundColor: '#CBD4DB' },
    nextText: { fontSize: 16, fontWeight: '600', color: '#fff' },
    nextTextDisabled: { color: '#808080' },
});
