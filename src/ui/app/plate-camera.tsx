import { CameraCaptureView } from '@/components/camera/capture-view';
import { ThemedText } from '@/components/themed-text';
import { useViolationContext } from '@/context/violation-context';
import { router, useLocalSearchParams } from 'expo-router';
import { View, Alert, ActivityIndicator } from 'react-native';
import { uploadViolationPhoto } from '@/services/api';
import { useState } from 'react';

export default function PlateCameraScreen() {
  const { setPlatePhoto, reportId } = useViolationContext();
  const params = useLocalSearchParams();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCapture = async (photo: { uri: string }) => {
    setPlatePhoto(photo.uri);
    setIsProcessing(true);

    try {
      // Use violation ID from context (created in map-selection)
      const violationId = reportId || params.violationId as string;

      if (!violationId) {
        throw new Error('Відсутній ідентифікатор порушення');
      }

      // Step 2: Upload photo with OCR
      const photoResult = await uploadViolationPhoto(violationId, photo.uri, 'initial');

      // Check OCR results
      const ocrResults = photoResult.ocr_results;
      if (!ocrResults || !ocrResults.plate || ocrResults.confidence < 0.3) {
        Alert.alert(
          'Неможливо розпізнати номер авто',
          'Спробуйте зробити фото ще раз з кращим освітленням',
          [
            { text: 'Зробити новий знімок', onPress: () => setIsProcessing(false) }
          ]
        );
        return;
      }

      // Success - proceed to photo gallery
      router.replace('/photo-gallery');
    } catch (e: any) {
      console.error("Failed to upload photo", e);
      Alert.alert('Помилка', e.message || 'Не вдалося завантажити фото');
      setIsProcessing(false);
    }
  };

  return (
    <CameraCaptureView
      title="Фото номерного знаку"
      subtitle="Розмістіть номерний знак у рамці"
      onCapture={handleCapture}
      overlayType="plate"
      footerAccessory={
        isProcessing ? (
          <View style={{ paddingHorizontal: 20, alignItems: 'center' }}>
            <ActivityIndicator size="large" color="#fff" />
            <ThemedText style={{ color: '#fff', textAlign: 'center', marginTop: 10 }}>
              Обробка фото...
            </ThemedText>
          </View>
        ) : (
          <View style={{ paddingHorizontal: 20 }}>
            <ThemedText style={{ color: '#fff', textAlign: 'center', opacity: 0.8, fontSize: 14 }}>
              Переконайтеся, що номер чітко видно і він не забруднений
            </ThemedText>
          </View>
        )
      }
    />
  );
}

