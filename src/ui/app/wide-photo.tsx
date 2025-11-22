import { CameraCaptureView } from '@/components/camera/capture-view';
import { ThemedText } from '@/components/themed-text';
import { useViolationContext } from '@/context/violation-context';
import { router } from 'expo-router';
import { TouchableOpacity } from 'react-native';

export default function WidePhotoScreen() {
  const { setWidePhoto } = useViolationContext();

  const handleCapture = async (photo: { uri: string }) => {
    setWidePhoto(photo.uri);
    router.replace('/signs-selection');
  };

  const handleSkip = () => {
    setWidePhoto(null);
    router.replace('/signs-selection');
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

