import { ThemedText } from '@/components/themed-text';
import { MAPTILER_TILE_URL } from '@/constants/maptiler';
import { ThemedView } from '@/constants/themed-view';
import { useReactNativeMaps } from '@/hooks/use-react-native-maps';
import { submitInitialReport } from '@/services/api';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    StyleSheet,
    TouchableOpacity,
    View,
} from 'react-native';

export default function PhotoPreviewScreen() {
    const params = useLocalSearchParams();
    const photoUri = params.photoUri as string;
    const latitude = Number(params.latitude);
    const longitude = Number(params.longitude);
    const [sending, setSending] = useState(false);
    const [statusMessage, setStatusMessage] = useState<string | null>(null);
    const mapComponents = useReactNativeMaps();
    const MapViewComponent = mapComponents?.MapView;
    const MarkerComponent = mapComponents?.Marker;
    const UrlTileComponent = mapComponents?.UrlTile;

    const hasValidLocation = !isNaN(latitude) && !isNaN(longitude);
    const canRenderTileOverlay = Boolean(UrlTileComponent);

    const handleSend = async () => {
        if (!photoUri || !hasValidLocation) {
            Alert.alert('Помилка', 'Немає фото або геолокації для відправки');
            return;
        }

        setSending(true);
        setStatusMessage('Надсилаємо фото та геолокацію…');

        try {
            const response = await submitInitialReport({
                photoUri,
                latitude,
                longitude,
            });

            const violationId = response?.violation_id || response?.reportId;
            if (!violationId) {
                throw new Error('Сервер не повернув ідентифікатор порушення.');
            }

            setStatusMessage('Фото відправлено. Завантажуємо наступний крок…');

            router.replace({
                pathname: '/violation-details' as any,
                params: {
                    reportId: violationId,
                    violationId: violationId,
                    latitude: String(latitude),
                    longitude: String(longitude),
                },
            });
        } catch (error) {
            console.error('Failed to create report', error);
            let message = 'Не вдалося відправити дані. Спробуйте ще раз.';
            
            if (error instanceof Error) {
                message = error.message;
                // Якщо помилка про відсутність підключення
                if (error.message.includes('підключення') || error.message.includes('інтернет')) {
                    message = 'Немає підключення до інтернету. Перевірте з\'єднання та спробуйте ще раз.';
                }
                // Якщо помилка про відсутність відповіді від сервера
                if (error.message.includes('не отримано відповіді') || error.message.includes('немає відповіді')) {
                    message = 'Сервер не відповідає. Перевірте підключення до інтернету та спробуйте ще раз.';
                }
            }
            
            Alert.alert('Помилка відправки', message);
            // НЕ переходимо далі - залишаємось на цій сторінці
        } finally {
            setSending(false);
            setStatusMessage(null);
        }
    };

    const handleRetake = () => {
        router.back();
    };

    if (!photoUri) {
        return (
            <ThemedView style={styles.container}>
                <ThemedText>Помилка: фото не знайдено</ThemedText>
                <TouchableOpacity onPress={() => router.back()}>
                    <ThemedText>Назад</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        );
    }

    const renderCustomTile = () => {
        if (!canRenderTileOverlay || !UrlTileComponent || !MAPTILER_TILE_URL) {
            return null;
        }

        const Tile = UrlTileComponent;
        return (
            <Tile
                urlTemplate={MAPTILER_TILE_URL}
                zIndex={0}
                maximumZ={20}
                tileSize={512}
            />
        );
    };

    return (
        <ThemedView style={styles.container}>
            <View style={styles.photoContainer}>
                <Image
                    source={{ uri: photoUri }}
                    style={styles.photo}
                    resizeMode="contain"
                />
            </View>

            {hasValidLocation && MapViewComponent && MarkerComponent ? (
                <View style={styles.mapContainer}>
                    <MapViewComponent
                        style={styles.map}
                        mapType={canRenderTileOverlay ? 'none' : 'standard'}
                        initialRegion={{
                            latitude,
                            longitude,
                            latitudeDelta: 0.01,
                            longitudeDelta: 0.01,
                        }}
                        scrollEnabled={false}
                        zoomEnabled={false}
                        pitchEnabled={false}
                        rotateEnabled={false}
                    >
                        {renderCustomTile()}
                        <MarkerComponent coordinate={{ latitude, longitude }} title="Місце створення квитка" />
                    </MapViewComponent>
                </View>
            ) : hasValidLocation ? (
                <View style={styles.mapContainer}>
                    <ThemedView style={styles.mapPlaceholder}>
                        <ThemedText style={styles.mapPlaceholderText}>
                            Координати: {latitude.toFixed(6)}, {longitude.toFixed(6)}
                        </ThemedText>
                        <ThemedText style={styles.mapPlaceholderSubtext}>
                            Потрібен development build з react-native-maps для перегляду карти
                        </ThemedText>
                    </ThemedView>
                </View>
            ) : null}

            <View style={styles.actions}>
                {statusMessage && (
                    <View style={styles.statusContainer}>
                        <ThemedText style={styles.statusText}>{statusMessage}</ThemedText>
                    </View>
                )}
                <TouchableOpacity
                    style={[styles.button, styles.retakeButton]}
                    onPress={handleRetake}
                    disabled={sending}
                >
                    <ThemedText style={styles.retakeButtonText}>Переробити</ThemedText>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.sendButton]}
                    onPress={handleSend}
                    disabled={sending}
                >
                    {sending ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <ThemedText style={styles.sendButtonText}>Відправити</ThemedText>
                    )}
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },
    photoContainer: {
        flex: 1,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    photo: {
        width: '100%',
        height: '100%',
    },
    mapContainer: {
        height: 200,
        margin: 10,
        borderRadius: 10,
        overflow: 'hidden',
    },
    map: {
        flex: 1,
    },
    actions: {
        flexDirection: 'row',
        padding: 20,
        gap: 15,
        alignItems: 'center',
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 50,
    },
    statusContainer: {
        position: 'absolute',
        left: 20,
        right: 20,
        bottom: 90,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 10,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    statusText: {
        color: '#FFFFFF',
        fontSize: 14,
        textAlign: 'center',
    },
    retakeButton: {
        backgroundColor: '#E0E0E0',
    },
    retakeButtonText: {
        color: '#000000',
        fontSize: 16,
        fontWeight: '600',
    },
    sendButton: {
        backgroundColor: '#007AFF',
    },
    sendButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '600',
    },
    mapPlaceholder: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F5F5',
    },
    mapPlaceholderText: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 4,
    },
    mapPlaceholderSubtext: {
        fontSize: 12,
        opacity: 0.6,
    },
});
