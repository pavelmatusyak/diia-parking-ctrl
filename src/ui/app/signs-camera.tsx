import { CameraCaptureView } from '@/components/camera/capture-view';
import { useViolationContext } from '@/context/violation-context';
import { router } from 'expo-router';
import { uploadViolationPhoto } from '@/services/api';

export default function SignsCameraScreen() {
  const { addSignPhoto, reportId } = useViolationContext();

  const handleCapture = async (photo: { uri: string }) => {
    addSignPhoto(photo.uri);

    // Upload sign photo
    if (reportId) {
      try {
        await uploadViolationPhoto(reportId, photo.uri, 'context');
      } catch (e) {
        console.error('Failed to upload sign photo', e);
      }
    }

    router.push('/photo-gallery');
  };

  return (
    <CameraCaptureView
      title="Фото знаку"
      subtitle="Сфотографуйте знак, що забороняє паркування"
      onCapture={handleCapture}
      overlayType="sign"
    />
  );
}

