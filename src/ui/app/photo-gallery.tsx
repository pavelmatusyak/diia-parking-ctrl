import { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Image, Alert, Platform, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { useViolationContext } from '@/context/violation-context';
import { uploadViolationPhoto, createViolation } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const MAX_PHOTOS = 5;

export default function PhotoGalleryScreen() {
    const insets = useSafeAreaInsets();
    const { platePhoto, widePhoto, signsPhotos, reportId, setReportId, addSignPhoto, setWidePhoto } = useViolationContext();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [uploadType, setUploadType] = useState<'initial' | 'context'>('context');
    const [uploading, setUploading] = useState(false);

    // Auto-create violation if not exists (for testing)
    useEffect(() => {
        const initViolation = async () => {
            if (!reportId) {
                try {
                    console.log('Creating test violation...');
                    const violation = await createViolation(50.4501, 30.5234, 'Test violation from photo gallery');
                    setReportId(violation.id);
                    console.log('Created test violation:', violation.id);
                } catch (error) {
                    console.error('Failed to create test violation:', error);
                }
            }
        };
        initViolation();
    }, [reportId, setReportId]);

    // Calculate total photos (plate photo is always first)
    const allPhotos = [
        platePhoto,
        widePhoto,
        ...signsPhotos
    ].filter(Boolean);

    const canAddMore = allPhotos.length < MAX_PHOTOS;

    const handleFileSelect = async (event: any) => {
        const file = event.target.files?.[0];
        if (!file) {
            console.log('No file selected');
            return;
        }

        console.log('File selected:', file.name, file.type, file.size);

        if (!reportId) {
            Alert.alert('Помилка', 'Відсутній ідентифікатор порушення. Спробуйте пізніше.');
            return;
        }

        setUploading(true);

        try {
            // Convert file to data URL
            const dataUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(file);
            });

            console.log('Uploading photo, type:', uploadType, 'reportId:', reportId);

            // Upload to backend
            const result = await uploadViolationPhoto(reportId, dataUrl, uploadType);

            console.log('Upload successful:', result);

            // Update context with the photo
            if (uploadType === 'initial') {
                setWidePhoto(dataUrl);
            } else {
                addSignPhoto(dataUrl);
            }

            Alert.alert('Успіх', 'Фото успішно завантажено');
        } catch (error: any) {
            console.error('Failed to upload file:', error);
            Alert.alert('Помилка', error.message || 'Не вдалося завантажити фото');
        } finally {
            setUploading(false);
            // Reset file input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const handleAddOCRPhoto = () => {
        if (!canAddMore) {
            Alert.alert('Ліміт фото', `Ви можете додати максимум ${MAX_PHOTOS} фото`);
            return;
        }

        if (Platform.OS === 'web') {
            // On web, show file picker - use 'context' type (plate photo was already 'initial')
            setUploadType('context');
            fileInputRef.current?.click();
        } else {
            // On native, go to camera
            router.push('/wide-photo');
        }
    };

    const handleAddSignPhoto = () => {
        if (!canAddMore) {
            Alert.alert('Ліміт фото', `Ви можете додати максимум ${MAX_PHOTOS} фото`);
            return;
        }

        if (Platform.OS === 'web') {
            // On web, show file picker - use 'context' type
            setUploadType('context');
            fileInputRef.current?.click();
        } else {
            // On native, go to camera
            router.push('/signs-camera');
        }
    };

    const handleContinue = () => {
        router.push('/violation-details');
    };

    return (
        <ThemedView style={styles.container}>
            {/* Hidden file input for web */}
            {Platform.OS === 'web' && (
                <input
                    ref={fileInputRef as any}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />
            )}

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#000" />
                </TouchableOpacity>
                <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                    Фотографії ({allPhotos.length}/{MAX_PHOTOS})
                </ThemedText>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
                <ThemedText style={styles.subtitle}>
                    Додайте додаткові фото для підтвердження порушення
                </ThemedText>

                {/* Photo Grid */}
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

                {/* Add Photo Buttons */}
                {canAddMore && !uploading && (
                    <View style={styles.addButtonsContainer}>
                        <ThemedText style={styles.addTitle}>Додати ще фото:</ThemedText>

                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleAddOCRPhoto}
                        >
                            <Ionicons name="car" size={24} color="#007AFF" />
                            <View style={styles.addButtonText}>
                                <ThemedText style={styles.addButtonTitle}>
                                    Фото автомобіля
                                </ThemedText>
                                <ThemedText style={styles.addButtonSubtitle}>
                                    З розпізнаванням номера
                                </ThemedText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.addButton}
                            onPress={handleAddSignPhoto}
                        >
                            <Ionicons name="warning" size={24} color="#007AFF" />
                            <View style={styles.addButtonText}>
                                <ThemedText style={styles.addButtonTitle}>
                                    Фото знаку або розмітки
                                </ThemedText>
                                <ThemedText style={styles.addButtonSubtitle}>
                                    Контекстне фото
                                </ThemedText>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color="#C7C7CC" />
                        </TouchableOpacity>
                    </View>
                )}

                {uploading && (
                    <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color="#007AFF" />
                        <ThemedText style={styles.uploadingText}>
                            Завантаження фото...
                        </ThemedText>
                    </View>
                )}

                {!canAddMore && (
                    <View style={styles.limitReached}>
                        <Ionicons name="checkmark-circle" size={48} color="#34C759" />
                        <ThemedText style={styles.limitText}>
                            Досягнуто максимум фото
                        </ThemedText>
                    </View>
                )}
            </ScrollView>

            {/* Continue Button */}
            <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
                <TouchableOpacity
                    style={styles.continueButton}
                    onPress={handleContinue}
                >
                    <ThemedText style={styles.continueButtonText}>
                        Продовжити
                    </ThemedText>
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
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
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    photoCard: {
        width: '48%',
        aspectRatio: 1,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#F5F5F5',
    },
    photoImage: {
        width: '100%',
        height: '100%',
    },
    photoLabel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        padding: 8,
    },
    photoLabelText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
    },
    addButtonsContainer: {
        marginTop: 8,
    },
    addTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
    },
    addButtonText: {
        flex: 1,
        marginLeft: 12,
    },
    addButtonTitle: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4,
    },
    addButtonSubtitle: {
        fontSize: 14,
        opacity: 0.6,
    },
    uploadingContainer: {
        alignItems: 'center',
        padding: 32,
    },
    uploadingText: {
        marginTop: 12,
        fontSize: 16,
        opacity: 0.6,
    },
    limitReached: {
        alignItems: 'center',
        padding: 32,
    },
    limitText: {
        fontSize: 16,
        marginTop: 12,
        opacity: 0.6,
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
    continueButtonText: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '700',
    },
});
