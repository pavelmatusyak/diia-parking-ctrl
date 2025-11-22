import { CameraCaptureView } from '@/components/camera/capture-view';
import { ThemedText } from '@/components/themed-text';
import { useViolationContext } from '@/context/violation-context';
import { router } from 'expo-router';
import { View } from 'react-native';

export default function PlateRetakeScreen() {
  const { setPlatePhoto } = useViolationContext();

  const handleCapture = async (photo: { uri: string }) => {
    setPlatePhoto(photo.uri);
      router.replace('/violation-reason');
  };

  return (
    <CameraCaptureView
      title="Повторне фото номерного знаку"
      subtitle="Спробуйте зняти номер під іншим кутом"
      onCapture={handleCapture}
      footerAccessory={
        <View>
          <ThemedText style={{ color: '#fff', textAlign: 'center' }}>
            Вдале фото допоможе пришвидшити обробку заяви
          </ThemedText>
        </View>
      }
    />
  );
}

