import { CameraCaptureView } from '@/components/camera/capture-view';
import { ThemedText } from '@/components/themed-text';
import { useViolationContext } from '@/context/violation-context';
import { router } from 'expo-router';
import { View } from 'react-native';

export default function PlateCameraScreen() {
  const { setPlatePhoto } = useViolationContext();

  const handleCapture = async (photo: { uri: string }) => {
    setPlatePhoto(photo.uri);
    const success = Math.random() > 0.5;
    if (success) {
      router.replace('/wide-photo');
    } else {
      router.replace('/number-plate-fail');
    }
  };

  return (
    <CameraCaptureView
      title="Зробіть фото номерного знаку"
      subtitle="Сфокусуйтеся на номері, щоб ми могли його розпізнати"
      onCapture={handleCapture}
      footerAccessory={
        <View>
          <ThemedText style={{ color: '#fff', textAlign: 'center' }}>
            Після фото автоматично запускається розпізнавання номеру
          </ThemedText>
        </View>
      }
    />
  );
}

