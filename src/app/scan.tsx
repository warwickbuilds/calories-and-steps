import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { router, useLocalSearchParams } from 'expo-router';
import { X } from 'lucide-react-native';
import { useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Text } from '@/components/ui';
import { isBarcode } from '@/lib/openFoodFacts';
import { layout, space } from '@/theme/tokens';

// The camera is always dark, whatever the app theme.
const OVERLAY = { text: '#FFFFFF', guide: 'rgba(255,255,255,0.7)', scrim: 'rgba(0,0,0,0.45)' };

/**
 * Full-screen camera with two jobs: scanning a barcode, or taking a photo of
 * a nutrition label. Either way it hands over to the product screen.
 */
export default function ScanScreen() {
  const params = useLocalSearchParams<{ meal?: string; day?: string; mode?: string; barcode?: string }>();
  const [mode, setMode] = useState<'barcode' | 'label'>(params.mode === 'label' ? 'label' : 'barcode');
  const [permission, requestPermission] = useCameraPermissions();
  const [busy, setBusy] = useState(false);
  const done = useRef(false);
  const camera = useRef<CameraView>(null);
  const pass = { meal: params.meal ?? '', day: params.day ?? '' };

  const onScanned = (r: BarcodeScanningResult) => {
    if (done.current || !isBarcode(r.data)) return;
    done.current = true;
    router.replace({ pathname: '/product', params: { ...pass, barcode: r.data } });
  };

  const takeLabel = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const pic = await camera.current.takePictureAsync({ quality: 0.9, shutterSound: false });
      if (pic?.uri) {
        router.replace({
          pathname: '/product',
          params: { ...pass, photo: pic.uri, width: String(pic.width), ...(params.barcode ? { barcode: params.barcode } : {}) },
        });
      }
    } finally {
      setBusy(false);
    }
  };

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.black, styles.center]}>
        <Text variant="title" color={OVERLAY.text} style={styles.centerText}>
          Camera access is needed to scan barcodes and labels
        </Text>
        <Text variant="body" color={OVERLAY.guide} style={styles.centerText}>
          Nothing is recorded. Label photos are sent to your AI provider to be read, then discarded.
        </Text>
        <View style={styles.permissionButtons}>
          {permission.canAskAgain ? (
            <Button label="Allow camera" onPress={requestPermission} />
          ) : (
            <Button label="Open settings" onPress={() => Linking.openSettings()} />
          )}
          <Button variant="ghost" label="Not now" onPress={() => router.back()} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.black}>
      <CameraView
        ref={camera}
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ['ean13', 'ean8', 'upc_a', 'upc_e'] }}
        onBarcodeScanned={mode === 'barcode' ? onScanned : undefined}
      />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close camera"
            onPress={() => router.back()}
            style={styles.round}>
            <X size={22} strokeWidth={1.8} color={OVERLAY.text} />
          </Pressable>
          <View style={styles.title}>
            <Text variant="bodyStrong" color={OVERLAY.text}>
              {mode === 'barcode' ? 'Scan a barcode' : 'Photograph the nutrition label'}
            </Text>
            <Text variant="caption" color={OVERLAY.guide}>
              {mode === 'barcode'
                ? 'Hold the barcode inside the box'
                : params.barcode
                  ? 'Not in Open Food Facts, so AI will read the label'
                  : 'Fill the frame with the nutrition table'}
            </Text>
          </View>
          <View style={styles.round} />
        </View>

        <View style={[styles.frame, mode === 'barcode' ? styles.frameBarcode : styles.frameLabel]} pointerEvents="none" />

        <View style={styles.bottom}>
          {mode === 'label' ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Take label photo"
              disabled={busy}
              onPress={takeLabel}
              style={({ pressed }) => [styles.shutter, { opacity: pressed || busy ? 0.6 : 1 }]}>
              <View style={styles.shutterInner} />
            </Pressable>
          ) : (
            <Pressable
              accessibilityRole="button"
              onPress={() => setMode('label')}
              style={({ pressed }) => [styles.switch, { opacity: pressed ? 0.7 : 1 }]}>
              <Text variant="bodyMedium" color={OVERLAY.text}>
                No barcode? Photograph the label
              </Text>
            </Pressable>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  center: { justifyContent: 'center', padding: space[6], gap: space[3] },
  centerText: { textAlign: 'center' },
  permissionButtons: { gap: space[2], marginTop: space[4] },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: space[4], gap: space[3] },
  title: { flex: 1, alignItems: 'center', gap: 2 },
  round: {
    width: layout.minTap,
    height: layout.minTap,
    borderRadius: layout.minTap / 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: OVERLAY.scrim,
  },
  frame: { alignSelf: 'center', borderWidth: 2, borderColor: OVERLAY.guide, borderRadius: 16 },
  frameBarcode: { width: '80%', height: 160 },
  frameLabel: { width: '86%', height: '58%' },
  bottom: { alignItems: 'center', paddingBottom: space[6] },
  switch: {
    minHeight: layout.minTap,
    paddingHorizontal: space[5],
    borderRadius: 999,
    justifyContent: 'center',
    backgroundColor: OVERLAY.scrim,
  },
  shutter: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 4,
    borderColor: OVERLAY.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: { width: 60, height: 60, borderRadius: 30, backgroundColor: OVERLAY.text },
});
