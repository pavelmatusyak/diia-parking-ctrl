import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { CameraCapturedPicture, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { useRef, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity, View } from 'react-native';

export default function CameraScreen() {
    const params = useLocalSearchParams();
    const [permission, requestPermission] = useCameraPermissions();
    const [facing, setFacing] = useState<CameraType>('back');
    const cameraRef = useRef<CameraView>(null);

    const toggleFacing = () => {
        setFacing((current) => (current === 'back' ? 'front' : 'back'));
    };

    const handleTakePhoto = async () => {
        if (!permission?.granted) {
            const result = await requestPermission();
            if (!result.granted) {
                Alert.alert(
                    'Дозвіл на камеру',
                    'Для створення квитків потрібен доступ до камери.',
                    [
                        { text: 'Скасувати', onPress: () => router.back(), style: 'cancel' },
                        { text: 'Спробувати знову', onPress: () => requestPermission() },
                    ]
                );
                return;
            }
        }

        if (!cameraRef.current) return;

        try {
            const photo: CameraCapturedPicture = await cameraRef.current.takePictureAsync({
                quality: 0.8,
                base64: false,
            });

            router.push({
                pathname: '/photo-preview',
                params: {
                    photoUri: photo.uri,
                    latitude: (params.latitude as string) || '0',
                    longitude: (params.longitude as string) || '0',
                },
            });
        } catch (error) {
            console.error('Error taking photo:', error);
            Alert.alert('Помилка', 'Не вдалося зробити фото');
        }
    };

    if (!permission) {
        return (
            <ThemedView style={styles.container}>
                <ThemedText>Завантаження...</ThemedText>
            </ThemedView>
        );
    }

    if (!permission.granted) {
        return (
            <ThemedView style={styles.container}>
                <ThemedText style={styles.message}>Потрібен доступ до камери</ThemedText>
                <TouchableOpacity
                    style={styles.button}
                    onPress={requestPermission}
                >
                    <ThemedText style={styles.buttonText}>Надати доступ</ThemedText>
                </TouchableOpacity>
            </ThemedView>
        );
    }

    return (
        <ThemedView style={styles.container}>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing}>
                <View style={styles.overlay}>
                    <View style={styles.header}>
                        <ThemedText type="title" style={styles.title}>
                            Зробіть фото з видним номерним знаком авто
                        </ThemedText>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => router.back()}
                        >
                            <ThemedText style={styles.closeButtonText}>✕</ThemedText>
                        </TouchableOpacity>
                    </View>

                    <View style={styles.bottomBar}>
                        <TouchableOpacity
                            style={styles.flipButton}
                            onPress={toggleFacing}
                        >
                            <ThemedText style={styles.flipButtonText}>
                                {facing === 'back' ? 'Увімкнути фронтальну камеру' : 'Увімкнути основну камеру'}
                            </ThemedText>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.captureButton}
                            onPress={handleTakePhoto}
                        >
                            <View style={styles.captureButtonInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            </CameraView>
        </ThemedView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000000',
    },
    camera: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'space-between',
    },
    header: {
        padding: 20,
        paddingTop: 60,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFFFFF',
        textShadowColor: 'rgba(0, 0, 0, 0.75)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 3,
        marginBottom: 10,
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 20,
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#FFFFFF',
        fontSize: 20,
        fontWeight: 'bold',
    },
    bottomBar: {
        padding: 40,
        alignItems: 'center',
        gap: 16,
    },
    captureButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#FFFFFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 4,
        borderColor: '#CCCCCC',
    },
    captureButtonInner: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: '#FFFFFF',
    },
    flipButton: {
        paddingVertical: 10,
        paddingHorizontal: 20,
        borderRadius: 20,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    flipButtonText: {
        color: '#FFFFFF',
        fontSize: 14,
        fontWeight: '600',
    },
    message: {
        fontSize: 16,
        marginBottom: 20,
        textAlign: 'center',
    },
    button: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: '#E0E0E0',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000000',
    },
});

