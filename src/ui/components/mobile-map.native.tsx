import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, TouchableOpacity, Alert } from 'react-native';
import MapView, { Marker, UrlTile, LatLng } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';

const MAPTILER_KEY = "e3tYBHbbu4V5TDCUPvPb"; // <<<<<< ВСТАВ СВІЙ КЛЮЧ

type MobileMapProps = {
    center: { latitude: number; longitude: number };
    onLocationChange: (location: { latitude: number; longitude: number }, address: string) => void;
};

export default function MobileMap({ center, onLocationChange }: MobileMapProps) {
    const mapRef = useRef<MapView>(null);
    const [markerPosition, setMarkerPosition] = useState<LatLng>(center);

    useEffect(() => {
        setMarkerPosition(center);
        mapRef.current?.animateToRegion({
            ...center,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
        });
    }, [center]);

    /** --- Reverse Geocode через MAPTILER --- **/
    const reverseGeocode = async (lat: number, lon: number): Promise<string> => {
        try {
            const url = `https://api.maptiler.com/geocoding/${lon},${lat}.json?key=${MAPTILER_KEY}`;
            const res = await fetch(url);
            const json = await res.json();

            if (json?.features?.length > 0) {
                return json.features[0].place_name;
            }

            return "Адресу не знайдено";
        } catch (err) {
            return "Адресу не знайдено";
        }
    };

    const updateLocation = async (coords: LatLng) => {
        setMarkerPosition(coords);
        const address = await reverseGeocode(coords.latitude, coords.longitude);
        onLocationChange(coords, address);
    };

    const handleMapPress = (e: any) => updateLocation(e.nativeEvent.coordinate);
    const handleMarkerDragEnd = (e: any) => updateLocation(e.nativeEvent.coordinate);

    const handleLocateMe = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert("Помилка", "Дозвіл на геолокацію відхилено");
                return;
            }

            const loc = await Location.getCurrentPositionAsync({});
            const coords = {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
            };

            mapRef.current?.animateToRegion({ ...coords, latitudeDelta: 0.01, longitudeDelta: 0.01 });
            updateLocation(coords);
        } catch (err) {
            Alert.alert("Помилка", "Не вдалося визначити місцезнаходження");
        }
    };

    return (
        <View style={styles.container}>
            <MapView
                ref={mapRef}
                style={styles.map}
                initialRegion={{
                    ...center,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }}
                onPress={handleMapPress}
            >
                {/* MAPTILER LEGAL TILE SOURCE */}
                <UrlTile
                    urlTemplate={`https://api.maptiler.com/maps/streets/{z}/{x}/{y}.png?key=${MAPTILER_KEY}`}
                    zIndex={1}
                    maximumZ={19}
                    tileSize={512}
                />

                <Marker
                    coordinate={markerPosition}
                    draggable
                    onDragEnd={handleMarkerDragEnd}
                />
            </MapView>

            <TouchableOpacity style={styles.locateButton} onPress={handleLocateMe}>
                <Ionicons name="locate" size={24} color="#606060" />
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    map: { width: "100%", height: "100%" },
    locateButton: {
        position: "absolute",
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#FFFFFF",
        elevation: 6,
        borderWidth: 1,
        borderColor: "#CCC",
    },
});
