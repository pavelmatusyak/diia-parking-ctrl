import { CameraCaptureView } from '@/components/camera/capture-view';
import { CameraCapturedPicture } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { Alert } from 'react-native';

export default function CameraScreen() {
    const params = useLocalSearchParams();

    const handleCapture = async (photo: CameraCapturedPicture) => {
        try {
            router.push({
                pathname: '/photo-preview',
                params: {
                    photoUri: photo.uri,
                    latitude: (params.latitude as string) || '0',
                    longitude: (params.longitude as string) || '0',
                },
            });
        } catch (error) {
            console.error('Error processing photo:', error);
            Alert.alert('Помилка', 'Не вдалося обробити фото');
        }
    };

    return (
        <CameraCaptureView
            title="Зробіть фото"
            subtitle="Фотографуйте порушення чітко"
            onCapture={handleCapture}
            overlayType="none"
        />
    );
}

