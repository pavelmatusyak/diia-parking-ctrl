import { CameraCaptureView } from '@/components/camera/capture-view';
import { useViolationContext } from '@/context/violation-context';
import { router } from 'expo-router';

export default function SignsCameraScreen() {
    const { addSignPhoto } = useViolationContext();

    const handleCapture = async (photo: { uri: string }) => {
        addSignPhoto(photo.uri);
        router.replace('/violation-reason');
    };

    return (
        <CameraCaptureView
            title="Зробіть фото знаку або розмітки"
            subtitle="Це допоможе підтвердити вибрані обмеження"
            onCapture={handleCapture}
        />
    );
}

