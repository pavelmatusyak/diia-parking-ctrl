import { CameraCaptureView } from '@/components/camera/capture-view';
import { useViolationContext } from '@/context/violation-context';
import { router } from 'expo-router';

export default function ConfirmPhotoScreen() {
  const { setConfirmPhoto } = useViolationContext();

  const handleCapture = async (photo: { uri: string }) => {
    setConfirmPhoto(photo.uri);
    router.replace('/final-success');
  };

  return (
    <CameraCaptureView
      title="Зробіть повторне фото"
      subtitle="Це підтвердить, що авто досі порушує правила"
      onCapture={handleCapture}
    />
  );
}

