import { ThemedText } from '@/components/themed-text';
import { MAPTILER_TILE_URL } from '@/constants/maptiler';
import { ThemedView } from '@/constants/themed-view';
import { useReactNativeMaps } from '@/hooks/use-react-native-maps';
import { getCurrentLocation } from '@/services/location';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState, useRef } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
    useColorScheme,
    Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViolationContext } from '@/context/violation-context';
import { createViolation } from '@/services/api';

const { width } = Dimensions.get('window');

export default function MapSelectionScreen() {
    const mapComponents = useReactNativeMaps();
    const MapView = mapComponents?.MapView;
    const Marker = mapComponents?.Marker;
    const UrlTile = mapComponents?.UrlTile;
    const mapRef = useRef<any>(null);

    const colorScheme = useColorScheme();
    const theme = Colors[colorScheme ?? 'light'];
    const insets = useSafeAreaInsets();
    const { setReportId } = useViolationContext();

    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [city, setCity] = useState<string>('');
    const [address, setAddress] = useState<string>('');
    const [creating, setCreating] = useState(false);

    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
        try {
            const res = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            const first = res?.[0] || null;
            if (first) {
                const resolvedCity = first.city || first.region || '';
                setCity(resolvedCity);

                const street = first.street ?? first.name ?? '';
                const number = first.streetNumber ?? '';
                const addr = street && number ? `${street} ${number}` : street || 'Адресу не знайдено';
                setAddress(addr);
            } else {
                setCity('');
                setAddress('Адресу не знайдено');
            }
        } catch (err) {
            console.warn('Reverse geocode failed', err);
            setCity('');
            setAddress('Адресу не знайдено');
        }
    }, []);

    const initializeLocation = useCallback(async () => {
        try {
            const loc = await getCurrentLocation();
            setLocation(loc);
            setSelectedLocation(loc);
            await reverseGeocode(loc.latitude, loc.longitude);
        } catch (err) {
            console.error('Init location failed', err);
            Alert.alert('Помилка', 'Не вдалося отримати локацію. Перевірте дозволи.');
        } finally {
            setLoading(false);
        }
    }, [reverseGeocode]);

    useEffect(() => {
        initializeLocation();
    }, [initializeLocation]);

    const onMapPress = async (event: any) => {
        const coords = event.nativeEvent?.coordinate;
        if (!coords) return;
        setSelectedLocation({ latitude: coords.latitude, longitude: coords.longitude });
        await reverseGeocode(coords.latitude, coords.longitude);
    };

    const onRegionComplete = async (region: { latitude: number; longitude: number }) => {
        if (!region) return;
        setSelectedLocation({ latitude: region.latitude, longitude: region.longitude });
        await reverseGeocode(region.latitude, region.longitude);
    };

    const handleConfirm = async () => {
        if (!selectedLocation) {
            Alert.alert('Помилка', 'Будь ласка, оберіть локацію на мапі');
            return;
        }

        setCreating(true);
        try {
            // Step 1: Create violation with location
            const violation = await createViolation(
                selectedLocation.latitude,
                selectedLocation.longitude,
                address || `${city || 'Невідоме місто'}, ${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`
            );

            // Store violation ID in context
            setReportId(violation.id);

            // Navigate to plate camera with violation ID
            router.push({
                pathname: '/plate-camera',
                params: {
                    violationId: violation.id,
                    lat: selectedLocation.latitude.toString(),
                    lng: selectedLocation.longitude.toString(),
                    city,
                    address,
                },
            });
        } catch (error: any) {
            console.error('Failed to create violation:', error);
            Alert.alert('Помилка', error.message || 'Не вдалося створити звіт');
        } finally {
            setCreating(false);
        }
    };

    const handleLocateMe = async () => {
        try {
            const loc = await getCurrentLocation();
            if (mapRef.current) {
                mapRef.current.animateToRegion({
                    latitude: loc.latitude,
                    longitude: loc.longitude,
                    latitudeDelta: 0.005,
                    longitudeDelta: 0.005,
                });
            }
            setSelectedLocation(loc);
            await reverseGeocode(loc.latitude, loc.longitude);
        } catch (error) {
            Alert.alert('Помилка', 'Не вдалося визначити ваше місцезнаходження');
        }
    };

    if (loading) {
        return (
            <ThemedView style={styles.full}>
                <ActivityIndicator size="large" color={theme.tint} />
                <ThemedText style={styles.loadingText}>Завантаження мапи...</ThemedText>
            </ThemedView>
        );
    }

    if (!location) {
        return (
            <ThemedView style={styles.full}>
                <ThemedText style={styles.errorTitle}>Не вдалось визначити початкову локацію</ThemedText>
                <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                    <ThemedText type="link">Назад</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        );
    }

    const center = selectedLocation || location;

    return (
        <View style={styles.container}>
            {/* Map takes full screen */}
            <View style={styles.mapContainer}>
                {MapView && Marker ? (
                    <MapView
                        ref={mapRef}
                        style={styles.map}
                        provider={'google'}
                        mapType={'standard'}
                        initialRegion={{
                            latitude: location.latitude,
                            longitude: location.longitude,
                            latitudeDelta: 0.005,
                            longitudeDelta: 0.005,
                        }}
                        onPress={onMapPress}
                        onRegionChangeComplete={onRegionComplete}
                        showsUserLocation
                        showsMyLocationButton={false} // Custom button used
                        showsCompass={false}
                        zoomEnabled
                        scrollEnabled
                    >
                        {MAPTILER_TILE_URL && UrlTile && (
                            <UrlTile
                                urlTemplate={MAPTILER_TILE_URL}
                                zIndex={0}
                                maximumZ={20}
                                tileSize={512}
                            />
                        )}
                        {center && <Marker coordinate={center} />}
                    </MapView>
                ) : (
                    <ThemedView style={styles.mapPlaceholder}>
                        <ThemedText style={styles.mapPlaceholderText}>
                            Карта недоступна в веб-версії
                        </ThemedText>
                        <ThemedText style={styles.mapPlaceholderSubtext}>
                            Координати: {center.latitude.toFixed(6)}, {center.longitude.toFixed(6)}
                        </ThemedText>
                    </ThemedView>
                )}
            </View>

            {/* Floating Header */}
            <View style={[styles.header, { top: insets.top + 10 }]}>
                <TouchableOpacity
                    style={[styles.iconButton, { backgroundColor: theme.background }]}
                    onPress={() => router.back()}
                >
                    <Ionicons name="arrow-back" size={24} color={theme.text} />
                </TouchableOpacity>
                <View style={[styles.titleContainer, { backgroundColor: theme.background }]}>
                    <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                        Локація авто
                    </ThemedText>
                </View>
                <View style={{ width: 44 }} />
            </View>

            {/* Locate Me Button */}
            <TouchableOpacity
                style={[styles.locateButton, { bottom: 240, right: 16, backgroundColor: theme.background }]}
                onPress={handleLocateMe}
                activeOpacity={0.8}
            >
                <Ionicons name="locate" size={24} color={theme.tint} />
            </TouchableOpacity>

            {/* Bottom Card */}
            <View style={[styles.bottomCard, { backgroundColor: theme.background, paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.dragIndicator} />

                <View style={styles.addressContainer}>
                    <View style={styles.addressIconContainer}>
                        <Ionicons name="location" size={24} color={theme.tint} />
                    </View>
                    <View style={styles.addressTextContainer}>
                        <ThemedText style={styles.cityText}>{city || 'Визначення міста...'}</ThemedText>
                        <ThemedText style={styles.addressText} numberOfLines={2}>
                            {address || 'Визначення адреси...'}
                        </ThemedText>
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.confirmButton, { backgroundColor: theme.tint }, creating && { opacity: 0.6 }]}
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                    disabled={creating}
                >
                    {creating ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <ThemedText style={styles.confirmButtonText}>Підтвердити локацію</ThemedText>
                            <Ionicons name="arrow-forward" size={20} color="#FFF" style={{ marginLeft: 8 }} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    full: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    mapContainer: { ...StyleSheet.absoluteFillObject },
    map: { flex: 1 },

    header: {
        position: 'absolute',
        left: 16,
        right: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    titleContainer: {
        paddingHorizontal: 16,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 4,
    },
    headerTitle: { fontSize: 16 },

    locateButton: {
        position: 'absolute',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
        zIndex: 10,
    },

    bottomCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
        paddingTop: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
    },
    dragIndicator: {
        width: 40,
        height: 4,
        backgroundColor: '#E5E5EA',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 20,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 24,
    },
    addressIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: 'rgba(0, 122, 255, 0.1)', // Light blue tint
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    addressTextContainer: {
        flex: 1,
    },
    cityText: {
        fontSize: 13,
        color: '#8E8E93',
        marginBottom: 4,
        fontWeight: '600',
    },
    addressText: {
        fontSize: 17,
        fontWeight: '700',
    },

    confirmButton: {
        height: 56,
        borderRadius: 28,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    confirmButtonText: {
        color: '#FFF',
        fontSize: 17,
        fontWeight: '700',
    },

    loadingText: { marginTop: 12 },
    errorTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    backLink: { marginTop: 8 },
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
