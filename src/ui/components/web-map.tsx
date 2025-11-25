import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type WebMapProps = {
    center: { latitude: number; longitude: number };
    onLocationChange: (location: { latitude: number; longitude: number }, address: string) => void;
    theme: any;
};

export default function WebMap({ center, onLocationChange }: WebMapProps) {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const markerRef = useRef<any>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;

        const loadLeaflet = async () => {
            const L = (await import('leaflet')).default;

            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);

            delete (L.Icon.Default.prototype as any)._getIconUrl;
            L.Icon.Default.mergeOptions({
                iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
                iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
                shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            });

            if (!mapContainerRef.current || mapRef.current) return;

            const map = L.map(mapContainerRef.current).setView(
                [center.latitude, center.longitude],
                15
            );

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19,
            }).addTo(map);

            const marker = L.marker([center.latitude, center.longitude], {
                draggable: true,
            }).addTo(map);

            marker.on('dragend', async () => {
                const position = marker.getLatLng();
                const address = await reverseGeocode(position.lat, position.lng);
                onLocationChange(
                    { latitude: position.lat, longitude: position.lng },
                    address
                );
            });

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
        } catch {
            return 'Адресу не знайдено';
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
                () => alert('Не вдалося визначити ваше місцезнаходження')
            );
        } else {
            alert('Геолокація не підтримується вашим браузером');
        }
    };

    return (
        <View style={styles.container}>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

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
