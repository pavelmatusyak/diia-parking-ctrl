import { ThemedText } from '@/components/themed-text';
import { MAPTILER_TILE_URL } from '@/constants/maptiler';
import { ThemedView } from '@/constants/themed-view';
import { getCurrentLocation } from '@/services/location';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

// ❗ ДОДАНО ПРЯМИЙ ІМПОРТ
import MapView, { Marker, UrlTile } from 'react-native-maps';

const DESIGN_IMAGE_PATH = '/mnt/data/8d16a915-af93-4da1-a830-d37439f31a27.png';

export default function MapSelectionScreen() {
    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [city, setCity] = useState<string>('');
    const [address, setAddress] = useState<string>('');

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

    const handleConfirm = () => {
        if (!selectedLocation) {
            Alert.alert('Помилка', 'Будь ласка, оберіть локацію на мапі');
            return;
        }
        router.push({
            pathname: '/plate-camera',
            params: {
                lat: selectedLocation.latitude.toString(),
                lng: selectedLocation.longitude.toString(),
                city,
                address,
            },
        });
    };

    if (loading) {
        return (
            <ThemedView style={styles.full}>
                <ActivityIndicator size="large" />
                <ThemedText style={styles.loadingText}>Завантаження мапи...</ThemedText>
            </ThemedView>
        );
    }

    if (!location) {
        return (
            <ThemedView style={styles.full}>
                <ThemedText style={styles.errorTitle}>Не вдалось визначити початкову локацію</ThemedText>
                <TouchableOpacity style={styles.backLink} onPress={() => router.back()}>
                    <ThemedText>Назад</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        );
    }

    const center = selectedLocation || location;

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.topBar}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <ThemedText style={styles.backButtonText}>←</ThemedText>
                </TouchableOpacity>
                <ThemedText type="title" style={styles.screenTitle}>
                    Виберіть локацію авто
                </ThemedText>
                <View style={styles.backButtonPlaceholder} />
            </View>

            {/* Map */}
            <View style={styles.mapWrapper}>
                <MapView
                    style={styles.map}
                    provider={'google'}
                    mapType={'standard'}
                    initialRegion={{
                        latitude: location.latitude,
                        longitude: location.longitude,
                        latitudeDelta: 0.01,
                        longitudeDelta: 0.01,
                    }}
                    onPress={onMapPress}
                    onRegionChangeComplete={onRegionComplete}
                    showsUserLocation
                    showsMyLocationButton
                    showsCompass
                    zoomEnabled
                    scrollEnabled
                >
                    {MAPTILER_TILE_URL && (
                        <UrlTile
                            urlTemplate={MAPTILER_TILE_URL}
                            zIndex={0}
                            maximumZ={20}
                            tileSize={512}
                        />
                    )}

                    {center && <Marker coordinate={center} />}
                </MapView>
            </View>

            {/* Address card */}
            <View style={styles.addressCard}>
                <View style={styles.addressRow}>
                    <ThemedText style={styles.fieldLabel}>Місто</ThemedText>
                    <ThemedText style={styles.fieldValue}>{city || '—'}</ThemedText>
                </View>
                <View style={[styles.addressRow, { marginTop: 8 }]}>
                    <ThemedText style={styles.fieldLabel}>Адреса</ThemedText>
                    <ThemedText style={styles.fieldValue} numberOfLines={2}>
                        {address || '—'}
                    </ThemedText>
                </View>
            </View>

            {/* Confirm button */}
            <View style={styles.footer}>
                <TouchableOpacity
                    style={[styles.confirmButton, !selectedLocation && styles.confirmButtonDisabled]}
                    onPress={handleConfirm}
                    activeOpacity={0.85}
                >
                    <ThemedText style={styles.confirmButtonText}>Підтвердити вибір</ThemedText>
                </TouchableOpacity>
            </View>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    full: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    container: { flex: 1, backgroundColor: '#E9F0F6' },
    topBar: { height: 88, paddingTop: 44, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    backButton: { width: 36, height: 36, borderRadius: 18, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
    backButtonText: { fontSize: 22, color: '#111' },
    backButtonPlaceholder: { width: 36, height: 36 },
    screenTitle: { fontSize: 16, fontWeight: '700', textAlign: 'center', flex: 1, color: '#111' },
    mapWrapper: { marginHorizontal: 16, borderRadius: 16, overflow: 'hidden', height: 420, backgroundColor: '#fff' },
    map: { flex: 1 },
    addressCard: { position: 'absolute', left: 24, right: 24, bottom: 100, backgroundColor: '#FFFFFF', borderRadius: 14, padding: 16 },
    addressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    fieldLabel: { fontSize: 13, color: '#6B6B6B', maxWidth: '40%' },
    fieldValue: { fontSize: 15, fontWeight: '600', color: '#111', textAlign: 'right', maxWidth: '58%' },
    footer: { paddingHorizontal: 24, paddingBottom: 28, paddingTop: 16 },
    confirmButton: { height: 56, borderRadius: 28, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center' },
    confirmButtonDisabled: { opacity: 0.6 },
    confirmButtonText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    loadingText: { marginTop: 12 },
    errorTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
    backLink: { marginTop: 8 },
});
