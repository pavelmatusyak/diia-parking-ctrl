import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { ThemedText } from './themed-text';
import { Ionicons } from '@expo/vector-icons';

type WebMapProps = {
    center: { latitude: number; longitude: number };
    onLocationChange: (location: { latitude: number; longitude: number }, address: string) => void;
    theme: any;
};

export default function WebMap({ center, onLocationChange, theme }: WebMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const loadLeaflet = async () => {
            const L = (await import('leaflet')).default;

            // Import Leaflet CSS
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            // Fix marker icon issue
            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            if (!mapContainerRef.current || mapRef.current) return;

            // Create map
            const map = L.map(mapContainerRef.current).setView(
                [center.latitude, center.longitude],
                15
            );

            // Add OpenStreetMap tiles
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(map);

            // Add draggable marker
            const marker = L.marker([center.latitude, center.longitude], {
                draggable: true,
            }).addTo(map);

            // Handle marker drag
            marker.on('dragend', async () => {
                const position = marker.getLatLng();
                const address = await reverseGeocode(position.lat, position.lng);
                onLocationChange(
                    { latitude: position.lat, longitude: position.lng },
                    address
                );
            });

            // Handle map click
            map.on('click', async (e: any) => {
                marker.setLatLng(e.latlng);
                const address = await reverseGeocode(e.latlng.lat, e.latlng.lng);
                onLocationChange(
                    { latitude: e.latlng.lat, longitude: e.latlng.lng },
                    address
                );
            });

            mapRef.current = map;
            markerRef.current = marker;

            // Get initial address
            const initialAddress = await reverseGeocode(center.latitude, center.longitude);
            onLocationChange(center, initialAddress);
        };

        loadLeaflet();

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (mapRef.current && markerRef.current) {
            mapRef.current.setView([center.latitude, center.longitude], 15);
            markerRef.current.setLatLng([center.latitude, center.longitude]);
        }
    }, [center]);

    const reverseGeocode = async (lat: number, lng: number): Promise<string> => {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`
            );
            const data = await response.json();

            if (data.address) {
                const { road, house_number, city, town, village, county } = data.address;
                const street = road && house_number ? `${road} ${house_number}` : road || '';
                const locality = city || town || village || county || '';
                return street ? `${street}, ${locality}` : locality || 'Адресу не знайдено';
            }
            return 'Адресу не знайдено';
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            return 'Адресу не знайдено';
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) return;

        setSearching(true);
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(searchQuery)}&format=json&limit=1`
            );
            const data = await response.json();

            if (data && data.length > 0) {
                const { lat, lon, display_name } = data[0];
                const latitude = parseFloat(lat);
                const longitude = parseFloat(lon);

                if (mapRef.current && markerRef.current) {
                    mapRef.current.setView([latitude, longitude], 15);
                    markerRef.current.setLatLng([latitude, longitude]);
                }

                onLocationChange({ latitude, longitude }, display_name);
            }
        } catch (error) {
            console.error('Geocoding failed:', error);
        } finally {
            setSearching(false);
        }
    };

    const handleLocateMe = () => {
        if ('geolocation' in navigator) {
            navigator.geolocation.getCurrentPosition(
                async (position) => {
                    const { latitude, longitude } = position.coords;

                    if (mapRef.current && markerRef.current) {
                        mapRef.current.setView([latitude, longitude], 15);
                        markerRef.current.setLatLng([latitude, longitude]);
                    }

                    const address = await reverseGeocode(latitude, longitude);
                    onLocationChange({ latitude, longitude }, address);
                },
                (error) => {
                    console.error('Geolocation error:', error);
                    alert('Не вдалося визначити ваше місцезнаходження');
                }
            );
        } else {
            alert('Геолокація не підтримується вашим браузером');
        }
    };

    return (
        <View style={styles.container}>
            {/* Search Bar */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#6B7280" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Введіть адресу..."
                    placeholderTextColor="#9CA3AF"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    onSubmitEditing={handleSearch}
                    returnKeyType="search"
                />
                {searching ? (
                    <ActivityIndicator size="small" color="#000000" style={styles.searchButton} />
                ) : (
                    <TouchableOpacity onPress={handleSearch} style={styles.searchButton}>
                        <Ionicons name="arrow-forward" size={20} color="#111827" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Map Container */}
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

            {/* Locate Me Button */}
            <TouchableOpacity
                style={styles.locateButton}
                onPress={handleLocateMe}
                activeOpacity={0.8}
            >
                <Ionicons name="locate" size={24} color="#C0C0C0" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'relative',
    },
    searchContainer: {
        position: 'absolute',
        top: 80,
        left: 20,
        right: 20,
        zIndex: 1000,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 16,
        paddingHorizontal: 16,
        paddingVertical: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    searchIcon: {
        marginRight: 12,
        opacity: 0.7,
    },
    searchInput: {
        flex: 1,
        fontSize: 16,
        paddingVertical: 4,
        fontWeight: '500',
        color: '#111827',
    },
    searchButton: {
        padding: 8,
        marginLeft: 4,
    },
    locateButton: {
        position: 'absolute',
        bottom: 240,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 8,
        zIndex: 1000,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
});
