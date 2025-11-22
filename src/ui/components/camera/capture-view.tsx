import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/constants/themed-view';
import { Ionicons } from '@expo/vector-icons';
import { CameraCapturedPicture, CameraType, CameraView, useCameraPermissions } from 'expo-camera';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, StyleSheet, TouchableOpacity, View, Dimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width, height } = Dimensions.get('window');

type CameraCaptureViewProps = {
  title: string;
  subtitle?: string;
  onCapture: (photo: CameraCapturedPicture) => Promise<void> | void;
  headerAccessory?: React.ReactNode;
  footerAccessory?: React.ReactNode;
  overlayType?: 'none' | 'plate' | 'sign';
};

export function CameraCaptureView({
  title,
  subtitle,
  onCapture,
  headerAccessory,
  footerAccessory,
  overlayType = 'none'
}: CameraCaptureViewProps) {
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [isCapturing, setIsCapturing] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const insets = useSafeAreaInsets();

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
        <ActivityIndicator size="large" color="#fff" />
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
    <View style={styles.container}>
      <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing={facing}>
        {/* Dark Overlay with Cutout */}
        {overlayType !== 'none' && (
          <View style={StyleSheet.absoluteFill}>
            <View style={styles.overlayMask}>
              <View style={styles.maskTop} />
              <View style={styles.maskMiddle}>
                <View style={styles.maskSide} />
                <View style={[
                  styles.cutout,
                  overlayType === 'plate' ? styles.plateCutout : styles.signCutout
                ]}>
                  <View style={styles.cornerTL} />
                  <View style={styles.cornerTR} />
                  <View style={styles.cornerBL} />
                  <View style={styles.cornerBR} />
                </View>
                <View style={styles.maskSide} />
              </View>
              <View style={styles.maskBottom} />
            </View>
          </View>
        )}

        {/* UI Layer */}
        <View style={[styles.uiLayer, { paddingTop: insets.top, paddingBottom: insets.bottom + 20 }]}>
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <ThemedText type="title" style={styles.title}>
                {title}
              </ThemedText>
              {subtitle ? <ThemedText style={styles.subtitle}>{subtitle}</ThemedText> : null}
            </View>
            {headerAccessory}
          </View>

          <View style={styles.footer}>
            {footerAccessory}
            <View style={styles.controlsRow}>
              <TouchableOpacity
                style={styles.iconButton}
                onPress={() => setFacing((prev) => (prev === 'back' ? 'front' : 'back'))}
              >
                <Ionicons name="camera-reverse" size={28} color="#fff" />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleCapture}
                disabled={isCapturing}
                activeOpacity={0.8}
              >
                <View style={[styles.captureInner, isCapturing && styles.captureInnerDisabled]} />
              </TouchableOpacity>

              <View style={styles.iconButton} />
            </View>
          </View>
        </View>
      </CameraView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, backgroundColor: '#000' },
  infoText: { fontSize: 16, color: '#fff' },
  permissionButton: { paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#333', borderRadius: 12 },
  permissionButtonText: { color: '#fff', fontWeight: '600' },

  uiLayer: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 20,
  },
  headerContent: { flex: 1, gap: 8 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },
  subtitle: { color: '#fff', opacity: 0.9, fontSize: 16, textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 4 },

  footer: { gap: 30 },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },

  captureButton: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 4,
    borderColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureInner: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#fff',
  },
  captureInnerDisabled: { opacity: 0.5, transform: [{ scale: 0.9 }] },

  iconButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // Overlay Styles
  overlayMask: { flex: 1 },
  maskTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  maskMiddle: { flexDirection: 'row', height: 250 }, // Height depends on aspect ratio
  maskBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },
  maskSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' },

  cutout: {
    borderColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    backgroundColor: 'transparent',
    position: 'relative',
  },
  plateCutout: { width: width * 0.8, height: width * 0.8 * (1 / 3) }, // ~3:1 aspect ratio for plates
  signCutout: { width: width * 0.6, height: width * 0.6 }, // Square for signs

  // Corners
  cornerTL: { position: 'absolute', top: -2, left: -2, width: 20, height: 20, borderTopWidth: 4, borderLeftWidth: 4, borderColor: '#fff' },
  cornerTR: { position: 'absolute', top: -2, right: -2, width: 20, height: 20, borderTopWidth: 4, borderRightWidth: 4, borderColor: '#fff' },
  cornerBL: { position: 'absolute', bottom: -2, left: -2, width: 20, height: 20, borderBottomWidth: 4, borderLeftWidth: 4, borderColor: '#fff' },
  cornerBR: { position: 'absolute', bottom: -2, right: -2, width: 20, height: 20, borderBottomWidth: 4, borderRightWidth: 4, borderColor: '#fff' },
});

