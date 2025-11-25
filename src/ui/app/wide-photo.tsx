import { CameraCaptureView } from '@/components/camera/capture-view';
import { ThemedText } from '@/components/themed-text';
import { useViolationContext } from '@/context/violation-context';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';
import { uploadViolationPhoto } from '@/services/api';

export default function WidePhotoScreen() {
  const { setWidePhoto, reportId } = useViolationContext();

  const handleCapture = async (photo: { uri: string }) => {
    setWidePhoto(photo.uri);

    // Upload as context photo if we have a violation ID
    if (reportId) {
      try {
        await uploadViolationPhoto(reportId, photo.uri, 'context');
      } catch (e) {
        console.error('Failed to upload wide photo', e);
      }
    }

    router.replace('/photo-gallery');
  };

  const handleSkip = () => {
    setWidePhoto(null);
    router.replace('/photo-gallery');
  };

  return (
    <CameraCaptureView
      title="Зробіть широке фото сцени"
      subtitle="Покажіть авто та розмітку, щоб зберегти контекст"
      onCapture={handleCapture}
      headerAccessory={
        <TouchableOpacity onPress={handleSkip}>
          <ThemedText style={{ color: '#fff' }}>Пропустити</ThemedText>
        </TouchableOpacity>
      }
    />
  );
}

