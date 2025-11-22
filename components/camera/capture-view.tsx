import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { CameraCapturedPicture, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View } from 'react-native';

type CameraCaptureViewProps = {
  title: string;
  subtitle?: string;
  onCapture: (photo: CameraCapturedPicture) => Promise<void> | void;
  headerAccessory?: React.ReactNode;
  footerAccessory?: React.ReactNode;
};

export function CameraCaptureView({ title, subtitle, onCapture, headerAccessory, footerAccessory }: CameraCaptureViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);

  useEffect(() => {
    if (!permission) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const handleCapture = useCallback(async () => {
    if (!cameraRef.current || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      await onCapture(photo);
    } catch (error) {
      console.error('Camera capture error', error);
    } finally {
      setIsCapturing(false);
    }
  }, [isCapturing, onCapture]);

  if (!permission) {
    return (
      <ThemedView style={styles.centered}>
        <ActivityIndicator />
        <ThemedText style={styles.infoText}>Ініціалізація камери…</ThemedText>
      </ThemedView>
    );
  }

  if (!permission.granted) {
    return (
      <ThemedView style={styles.centered}>
        <ThemedText style={styles.infoText}>Потрібен доступ до камери</ThemedText>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <ThemedText style={styles.permissionButtonText}>Надати доступ</ThemedText>
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing}>
        <View style={styles.overlay}>
          <View style={styles.header}>
            <View style={styles.headerTextBlock}>
              <ThemedText type="title" style={styles.title}>
                {title}
              </ThemedText>
              {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
            </View>
            {headerAccessory}
          </View>

          <View style={styles.footer}>
            {footerAccessory}
            <View style={styles.captureRow}>
              <TouchableOpacity style={styles.switchButton} onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}>
                <ThemedText style={styles.switchText}>↺</ThemedText>
              </TouchableOpacity>
              <TouchableOpacity style={styles.captureButton} onPress={handleCapture} disabled={isCapturing}>
                <View style={[styles.captureInner, isCapturing && styles.captureInnerDisabled]} />
              </TouchableOpacity>
              <View style={styles.switchButton} />
            </View>
          </View>
        </View>
      </CameraView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  infoText: {
    fontSize: 16,
  },
  permissionButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#000',
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  headerTextBlock: {
    flex: 1,
    gap: 8,
  },
  title: {
    color: '#fff',
  },
  subtitle: {
    color: '#fff',
    opacity: 0.85,
  },
  footer: {
    gap: 20,
  },
  captureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  captureButton: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 4,
    borderColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#fff',
  },
  captureInnerDisabled: {
    opacity: 0.5,
  },
  switchButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  switchText: {
    color: '#fff',
    fontSize: 24,
  },
});

