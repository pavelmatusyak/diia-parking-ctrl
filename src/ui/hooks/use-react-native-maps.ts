import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

type MapComponents = {
    MapView: typeof import('react-native-maps').default;
    Marker: typeof import('react-native-maps').Marker;
    UrlTile: typeof import('react-native-maps').UrlTile;
};

export function useReactNativeMaps() {
    const [components, setComponents] = useState<MapComponents | null>(null);

    useEffect(() => {
        let isMounted = true;

        const loadMapsModule = async () => {
            if (Platform.OS === 'web') {
                return;
            }

            try {
                const module = await import('react-native-maps');
                if (isMounted) {
                    setComponents({
                        MapView: module.default,
                        Marker: module.Marker,
                        UrlTile: module.UrlTile,
                    });
                }
            } catch (error) {
                console.warn('react-native-maps is unavailable in this environment.', error);
            }
        };

        loadMapsModule();

        return () => {
            isMounted = false;
        };
    }, []);

    return components;
}

