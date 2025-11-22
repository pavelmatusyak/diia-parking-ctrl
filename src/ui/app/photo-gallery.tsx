import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import { uploadViolationPhoto, createViolation } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';

const MAX_PHOTOS = 5;

export default function PhotoGalleryScreen() {
    const insets = useSafeAreaInsets();
    const { platePhoto, widePhoto, signsPhotos, reportId, setReportId, addSignPhoto, setWidePhoto } = useViolationContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadType, setUploadType] = useState<'initial' | 'context'>('context');
    const [uploading, setUploading] = useState(false);

    useEffect(() => {
        const initViolation = async () => {
            if (!reportId) {
                try {
                    const violation = await createViolation(50.4501, 30.5234, 'Test violation');
                    setReportId(violation.id);
                } catch (error) {
                    console.error(error);
                }
            }
        };
        initViolation();
    }, [reportId, setReportId]);

    const allPhotos = [platePhoto, widePhoto, ...signsPhotos].filter(Boolean);
    const canAddMore = allPhotos.length < MAX_PHOTOS;

    const handleFileSelect = async (event: any) => {
        const file = event.target.files?.[0];
        if (!file || !reportId) return;

        setUploading(true);
        try {
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            await uploadViolationPhoto(reportId, dataUrl, uploadType);

            if (uploadType === 'initial') setWidePhoto(dataUrl);
            else addSignPhoto(dataUrl);

            Alert.alert('Успіх', 'Фото завантажено');
        } catch (error: any) {
            Alert.alert('Помилка', error.message || 'Не вдалося завантажити фото');
        } finally {
            setUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const handleAddPhoto = (type: 'ocr' | 'sign') => {
        if (!canAddMore) {
            Alert.alert('Ліміт фото', `Максимум ${MAX_PHOTOS} фото`);
            return;
        }

        if (Platform.OS === 'web') {
            setUploadType('context');
            fileInputRef.current?.click();
        } else {
            router.push(type === 'ocr' ? '/wide-photo' : '/signs-camera');
        }
    };

    const handleContinue = () => router.push('/violation-details');

    return (
        <LinearGradient colors={['#E0F7FA', '#D0F0E7']} style={styles.container}>
            {Platform.OS === 'web' && (
                <input ref={fileInputRef as any} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFileSelect} />
            )}

            <View style={[styles.tile, { paddingTop: insets.top + 16 }]}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                    <ThemedText style={styles.headerTitle}>Фотографії ({allPhotos.length}/{MAX_PHOTOS})</ThemedText>
                    <View style={{ width: 44 }} />
                </View>

                <ScrollView contentContainerStyle={styles.content}>
                    <ThemedText style={styles.subtitle}>
                        Додайте додаткові фото для підтвердження порушення
                    </ThemedText>

                    <View style={styles.photoGrid}>
                        {allPhotos.map((photo, index) => photo && (
                            <View key={index} style={styles.photoCard}>
                                <Image source={{ uri: photo }} style={styles.photoImage} />
                                <View style={styles.photoLabel}>
                                    <ThemedText style={styles.photoLabelText}>
                                        {index === 0 ? 'Номерний знак' : `Фото ${index + 1}`}
                                    </ThemedText>
                                </View>
                            </View>
                        ))}
                    </View>

                    {canAddMore && !uploading && (
                        <View style={styles.addButtonsContainer}>
                            <ThemedText style={styles.addTitle}>Додати ще фото:</ThemedText>

                            <TouchableOpacity style={styles.addButton} onPress={() => handleAddPhoto('ocr')}>
                                <Ionicons name="car" size={24} color="#007AFF" />
                                <View style={styles.addButtonText}>
                                    <ThemedText style={styles.addButtonTitle}>Фото автомобіля</ThemedText>
                                    <ThemedText style={styles.addButtonSubtitle}>З розпізнаванням номера</ThemedText>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.addButton} onPress={() => handleAddPhoto('sign')}>
                                <Ionicons name="warning" size={24} color="#007AFF" />
                                <View style={styles.addButtonText}>
                                    <ThemedText style={styles.addButtonTitle}>Фото знаку або розмітки</ThemedText>
                                    <ThemedText style={styles.addButtonSubtitle}>Контекстне фото</ThemedText>
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                            </TouchableOpacity>
                        </View>
                    )}

                    {uploading && (
                        <View style={styles.uploadingContainer}>
                            <ActivityIndicator size="large" color="#007AFF" />
                            <ThemedText style={styles.uploadingText}>Завантаження фото...</ThemedText>
                        </View>
                    )}

                    {!canAddMore && (
                        <View style={styles.limitReached}>
                            <Ionicons name="checkmark-circle" size={48} color="#34C759" />
                            <ThemedText style={styles.limitText}>Досягнуто максимум фото</ThemedText>
                        </View>
                    )}
                </ScrollView>

                <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                    <TouchableOpacity style={styles.continueButton} onPress={handleContinue}>
                        <ThemedText style={styles.continueButtonText}>Продовжити</ThemedText>
                    </TouchableOpacity>
                </View>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    tile: {
        width: '92%',
        backgroundColor: 'rgba(255,255,255,0.85)',
        borderRadius: 20,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        flex: 1,
    },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
    backButton: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
    headerTitle: { fontSize: 18, fontWeight: '600', color: '#000' },
    content: { paddingVertical: 12 },
    subtitle: { fontSize: 16, marginBottom: 16, opacity: 0.8 },
    photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 20 },
    photoCard: { width: '48%', aspectRatio: 1, borderRadius: 12, overflow: 'hidden', backgroundColor: 'rgba(245,245,245,0.7)' },
    photoImage: { width: '100%', height: '100%' },
    photoLabel: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.5)', padding: 6 },
    photoLabelText: { color: '#fff', fontSize: 12, fontWeight: '600' },
    addButtonsContainer: { marginTop: 8 },
    addTitle: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
    addButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(245,245,245,0.7)', borderRadius: 14, padding: 14, marginBottom: 12 },
    addButtonText: { flex: 1, marginLeft: 12 },
    addButtonTitle: { fontSize: 16, fontWeight: '600', marginBottom: 2 },
    addButtonSubtitle: { fontSize: 13, opacity: 0.6 },
    uploadingContainer: { alignItems: 'center', padding: 24 },
    uploadingText: { marginTop: 10, fontSize: 16, opacity: 0.7 },
    limitReached: { alignItems: 'center', padding: 24 },
    limitText: { fontSize: 16, marginTop: 8, opacity: 0.7 },
    footer: { marginTop: 12 },
    continueButton: { backgroundColor: '#007AFF', paddingVertical: 16, borderRadius: 14, alignItems: 'center' },
    continueButtonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
