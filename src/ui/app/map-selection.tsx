import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { Colors } from '@/constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View,
    useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViolationContext } from '@/context/violation-context';
import { createViolation } from '@/services/api';
import WebMap from '@/components/web-map';
import { LinearGradient } from 'expo-linear-gradient';

export default function MapSelectionScreen() {
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const { setReportId } = useViolationContext();

    const [loading, setLoading] = useState(true);
    const [location, setLocation] = useState<{ latitude: number; longitude: number }>({
        latitude: 50.4501,
        longitude: 30.5234,
    });
    const [selectedLocation, setSelectedLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [address, setAddress] = useState<string>('');
    const [creating, setCreating] = useState(false);

    useEffect(() => {
        if (Platform.OS === 'web' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    setLocation({ latitude, longitude });
                    setSelectedLocation({ latitude, longitude });
                    setLoading(false);
                },
                () => {
                    setLoading(false);
                }
            );
        } else {
            setLoading(false);
        }
    }, []);

    const handleLocationChange = (newLocation: { latitude: number; longitude: number }, newAddress: string) => {
        setSelectedLocation(newLocation);
        setAddress(newAddress);
    };

    const handleConfirm = async () => {
        if (!selectedLocation) {
            Alert.alert('Помилка', 'Будь ласка, оберіть локацію');
            return;
        }
        setCreating(true);

        try {
            const violation = await createViolation(
                selectedLocation.latitude,
                selectedLocation.longitude,
                address || `${selectedLocation.latitude.toFixed(6)}, ${selectedLocation.longitude.toFixed(6)}`
            );

            setReportId(violation.id);

            router.push({
                pathname: '/plate-camera',
                params: {
                    violationId: violation.id,
                    lat: selectedLocation.latitude.toString(),
                    lng: selectedLocation.longitude.toString(),
                    address,
                },
            });
        } catch (error: any) {
            Alert.alert('Помилка', error.message || 'Не вдалося створити звіт');
        } finally {
            setCreating(false);
        }
    };

    if (loading) {
        return (
            <LinearGradient colors={['#F2F2F7', '#FFFFFF']} style={styles.full}>
                <ActivityIndicator size="large" color="#007AFF" />
                <ThemedText style={styles.loadingText}>Завантаження мапи...</ThemedText>
            </LinearGradient>
        );
    }

    const center = selectedLocation || location;

    return (
        <LinearGradient colors={['#F2F2F7', '#FFFFFF']} style={styles.container}>
            <View style={styles.mapContainer}>
                <WebMap
                    center={center}
                    onLocationChange={handleLocationChange}
                    theme={colorScheme}
                />
            </View>

            <View style={[styles.header, { top: insets.top + 10 }]}>
                <TouchableOpacity style={styles.iconButton} onPress={() => router.back()}>
                    <Ionicons name="arrow-back" size={24} color="#111827" />
                </TouchableOpacity>

                <View style={styles.titleContainer}>
                    <ThemedText type="defaultSemiBold" style={styles.headerTitle}>
                        Локація авто
                    </ThemedText>
                </View>

                <View style={{ width: 48 }} />
            </View>

            <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 16 }]}>
                <View style={styles.dragIndicator} />

                <View style={styles.addressContainer}>
                    <View style={styles.addressIconContainer}>
                        <Ionicons name="location" size={24} color="#C0C0C0" />
                    </View>

                    <View style={styles.addressTextContainer}>
                        <ThemedText style={styles.addressText} numberOfLines={2}>
                            {address || 'Перетягніть маркер або введіть адресу...'}
                        </ThemedText>

                        {selectedLocation && (
                            <ThemedText style={styles.coordsText}>
                                {selectedLocation.latitude.toFixed(6)}, {selectedLocation.longitude.toFixed(6)}
                            </ThemedText>
                        )}
                    </View>
                </View>

                <TouchableOpacity
                    style={[styles.confirmButton, creating && { opacity: 0.6 }]}
                    onPress={handleConfirm}
                    disabled={creating}
                >
                    {creating ? (
                        <ActivityIndicator color="#FFFFFF" />
                    ) : (
                        <>
                            <ThemedText style={styles.confirmButtonText}>Підтвердити локацію</ThemedText>
                            <Ionicons name="arrow-forward" size={20} color="#FFFFFF" style={{ marginLeft: 8 }} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </LinearGradient>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    full: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F9FA' },
    mapContainer: { ...StyleSheet.absoluteFillObject },
    header: {
        position: 'absolute',
        left: 20,
        right: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 10,
    },
    iconButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    titleContainer: {
        paddingHorizontal: 20,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    headerTitle: { fontSize: 17, fontWeight: '600' },
    bottomCard: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        paddingHorizontal: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
    },
    dragIndicator: {
        width: 48,
        height: 5,
        backgroundColor: '#D1D5DB',
        borderRadius: 3,
        alignSelf: 'center',
        marginBottom: 24,
        opacity: 0.4,
    },
    addressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 24 },
    addressIconContainer: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    addressTextContainer: { flex: 1 },
    addressText: { fontSize: 18, fontWeight: '700', marginBottom: 6 },
    coordsText: { fontSize: 14, color: '#6B7280', fontWeight: '500' },
    confirmButton: {
        height: 60,
        borderRadius: 30,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#000000',
    },
    confirmButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
    loadingText: { marginTop: 16, fontSize: 16, fontWeight: '500', color: '#6B7280' },
});
