import { ThemedText } from '@/components/themed-text';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme,
    FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useViolationContext } from '@/context/violation-context';
import { createViolation } from '@/services/api';
import UniversalMap from '@/components/UniversalMap';

// ======================
// TYPES
// ======================
type LatLng = { latitude: number; longitude: number };
type Violation = { id: string;[key: string]: any };

// ======================
// COMPONENT
// ======================
export default function MapSelectionScreen() {
    const colorScheme = useColorScheme();
    const insets = useSafeAreaInsets();
    const { setReportId } = useViolationContext();

    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);

    const [location, setLocation] = useState<LatLng>({ latitude: 50.4501, longitude: 30.5234 });
    const [selectedLocation, setSelectedLocation] = useState<LatLng | null>(null);
    const [address, setAddress] = useState<string>('вул. Шевченка, 1');
    const [city, setCity] = useState<string>('Львів');

    // MODAL STATES
    const [cityModalVisible, setCityModalVisible] = useState(false);
    const [addressModalVisible, setAddressModalVisible] = useState(false);
    const [tempAddress, setTempAddress] = useState(address);

    const cities = ['Львів', 'Київ', 'Одеса', 'Харків', 'Дніпро'];

    // GEO detection (web)
    useEffect(() => {
        if (Platform.OS === 'web' && 'geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const coords: LatLng = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
                    setLocation(coords);
                    setSelectedLocation(coords);
                    setLoading(false);
                },
                () => setLoading(false)
            );
        } else {
            setLoading(false);
        }
    }, []);

    const handleLocationChange = (newLocation: LatLng, newAddress: string) => {
        setSelectedLocation(newLocation);
        setAddress(newAddress);
        setTempAddress(newAddress);
    };

    const handleConfirm = async () => {
        if (!selectedLocation) {
            Alert.alert('Помилка', 'Будь ласка, оберіть локацію');
            return;
        }

        setCreating(true);
        try {
            const violation: Violation = await createViolation(
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
        } catch (err: unknown) {
            const error = err as Error;
            Alert.alert('Помилка', error.message || 'Не вдалося створити звіт');
        } finally {
            setCreating(false);
        }
    };

    // ===== MODAL HANDLERS =====
    const openCityModal = () => setCityModalVisible(true);
    const selectCity = (c: string) => {
        setCity(c);
        setCityModalVisible(false);
    };

    const openAddressModal = () => {
        setTempAddress(address);
        setAddressModalVisible(true);
    };
    const saveAddress = () => {
        setAddress(tempAddress);
        setAddressModalVisible(false);
    };

    if (loading) {
        return (
            <View style={styles.full}>
                <ActivityIndicator size="large" color="#000" />
                <ThemedText style={styles.loadingText}>Завантаження мапи...</ThemedText>
            </View>
        );
    }

    const center = selectedLocation || location;

    return (
        <View style={styles.container}>
            {/* HEADER */}
            <View style={[styles.headerWrap, { paddingTop: insets.top + 10 }]}>
                <View style={styles.backPill}>
                    <TouchableOpacity style={styles.backIcon} onPress={() => router.back()}>
                        <Ionicons name="arrow-back" size={24} color="#000" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* TITLE */}
            <View style={styles.titleWrap}>
                <ThemedText style={styles.titleText}>Відмітьте локацію авто</ThemedText>
            </View>

            {/* MAP */}
            <View style={styles.mapArea}>
                <View style={styles.mapCard}>
                    <UniversalMap center={center} onLocationChange={handleLocationChange} theme={colorScheme} />
                </View>
            </View>

            {/* BOTTOM CARD */}
            <View style={[styles.bottomCard, { paddingBottom: insets.bottom + 20 }]}>
                <View style={styles.inputGroup}>
                    <TouchableOpacity style={styles.inputRow} onPress={openCityModal}>
                        <View>
                            <ThemedText style={styles.inputLabel}>Місто</ThemedText>
                            <ThemedText style={styles.inputValue}>{city}</ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#374151" />
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.inputRow} onPress={openAddressModal}>
                        <View>
                            <ThemedText style={styles.inputLabel}>Адреса</ThemedText>
                            <ThemedText style={styles.inputValue}>{address}</ThemedText>
                        </View>
                        <Ionicons name="chevron-forward" size={22} color="#374151" />
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={[styles.confirmButton, creating && { opacity: 0.6 }]}
                    onPress={handleConfirm}
                    disabled={creating}
                >
                    {creating ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <ThemedText style={styles.confirmButtonText}>Підтвердити вибір</ThemedText>
                    )}
                </TouchableOpacity>
            </View>

            {/* CITY MODAL */}
            <Modal visible={cityModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <FlatList
                            data={cities}
                            keyExtractor={(item) => item}
                            renderItem={({ item }) => (
                                <TouchableOpacity style={styles.modalItem} onPress={() => selectCity(item)}>
                                    <ThemedText style={styles.modalItemText}>{item}</ThemedText>
                                </TouchableOpacity>
                            )}
                        />
                        <TouchableOpacity style={styles.modalClose} onPress={() => setCityModalVisible(false)}>
                            <ThemedText style={{ color: 'black', fontWeight: '700' }}>Закрити</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ADDRESS MODAL */}
            <Modal visible={addressModalVisible} animationType="slide" transparent>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <TextInput
                            value={tempAddress}
                            onChangeText={setTempAddress}
                            placeholder="Введіть адресу"
                            style={styles.textInput}
                        />
                        <TouchableOpacity style={styles.modalClose} onPress={saveAddress}>
                            <ThemedText style={{ color: 'white', fontWeight: '700' }}>Зберегти</ThemedText>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ======================
// STYLES
// ======================
const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#E2ECF4' },
    full: { flex: 1, backgroundColor: '#E2ECF4', justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#374151', fontSize: 15 },

    headerWrap: { position: 'absolute', left: 16, right: 16, zIndex: 30 },
    backPill: {
        height: 56,
        borderRadius: 12,
        backgroundColor: 'rgba(255,255,255,0.9)',
        justifyContent: 'center',
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    backIcon: { width: 40, height: 40, justifyContent: 'center', alignItems: 'flex-start' },

    titleWrap: { marginTop: 86, alignItems: 'center', paddingHorizontal: 20, marginBottom: 12 },
    titleText: { fontSize: 20, fontWeight: '700', color: '#111827' },

    mapArea: { paddingHorizontal: 16 },
    mapCard: { height: 320, backgroundColor: '#fff', borderRadius: 12, overflow: 'hidden', marginBottom: 18 },

    bottomCard: {
        position: 'absolute',
        left: 12,
        right: 12,
        bottom: 12,
        backgroundColor: '#fff',
        borderRadius: 18,
        paddingVertical: 18,
        paddingHorizontal: 16,
        zIndex: 40,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 10,
        shadowOffset: { width: 0, height: 6 },
        elevation: 6,
    },
    inputGroup: { gap: 12, marginBottom: 18 },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#fff',
        borderRadius: 12,
        paddingVertical: 16,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#E6EEF6',
        shadowColor: '#000',
        shadowOpacity: 0.03,
        shadowRadius: 6,
        shadowOffset: { width: 0, height: 2 },
    },
    inputLabel: { fontSize: 13, color: '#6B7280', marginBottom: 6 },
    inputValue: { fontSize: 18, fontWeight: '700', color: '#111827' },

    confirmButton: { height: 60, borderRadius: 30, backgroundColor: '#000', alignItems: 'center', justifyContent: 'center', marginHorizontal: 24 },
    confirmButtonText: { color: '#fff', fontSize: 18, fontWeight: '700' },

    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 20,
    },
    modalContent: {
        width: '100%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        maxHeight: '70%',
    },
    modalItem: { paddingVertical: 12 },
    modalItemText: { fontSize: 18, color:"#000" },
    modalClose: {
        marginTop: 16,
        backgroundColor: '#000',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
    },
    textInput: { borderWidth: 1, borderColor: '#ccc', borderRadius: 12, padding: 12, fontSize: 16 },
});
