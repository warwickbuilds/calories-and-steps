import { CameraView, useCameraPermissions, type CameraType } from 'expo-camera';
import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { RefreshCcw, Timer, X } from 'lucide-react-native';
import { useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Circle, Line } from 'react-native-svg';

import { Button, Text } from '@/components/ui';
import { POSES, type Pose } from '@/db/body';
import { useCheckIns } from '@/hooks/data';
import { captureStore } from '@/lib/captureStore';
import { photoUri } from '@/lib/photos';
import { layout, space } from '@/theme/tokens';

// The camera is always dark, whatever the app theme, so it uses fixed overlay colours.
const OVERLAY = { text: '#FFFFFF', guide: 'rgba(255,255,255,0.55)', scrim: 'rgba(0,0,0,0.45)' };
const TIMERS = [0, 3, 10] as const;

const isPose = (v: unknown): v is Pose => POSES.some((p) => p.value === v);

/**
 * Full-screen camera for one progress photo. Shows the last photo of the same
 * pose as a faint ghost so shots line up, plus head and feet guide lines.
 */
export default function CameraScreen() {
  const params = useLocalSearchParams<{ pose?: string }>();
  const pose: Pose = isPose(params.pose) ? params.pose : 'front';
  const poseLabel = POSES.find((p) => p.value === pose)!.label;
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [timer, setTimer] = useState<(typeof TIMERS)[number]>(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const camera = useRef<CameraView>(null);
  const checkIns = useCheckIns();
  const ghost = checkIns.find((c) => c.photos[pose])?.photos[pose]?.path ?? null;

  const capture = async () => {
    if (!camera.current || busy) return;
    setBusy(true);
    try {
      const pic = await camera.current.takePictureAsync({ quality: 0.9, shutterSound: false });
      if (pic?.uri) {
        captureStore.set(pose, pic.uri);
        router.back();
      }
    } finally {
      setBusy(false);
    }
  };

  // Clear a running countdown if the screen closes.
  const tick = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => () => {
    if (tick.current) clearInterval(tick.current);
  }, []);

  const startTimer = () => {
    let left: number = timer;
    setCountdown(left);
    tick.current = setInterval(() => {
      left -= 1;
      if (left > 0) {
        setCountdown(left);
        return;
      }
      if (tick.current) clearInterval(tick.current);
      tick.current = null;
      setCountdown(null);
      void capture();
    }, 1000);
  };

  if (!permission) return <View style={styles.black} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={[styles.black, styles.center]}>
        <Text variant="title" color={OVERLAY.text} style={styles.centerText}>
          Camera access is needed for progress photos
        </Text>
        <Text variant="body" color={OVERLAY.guide} style={styles.centerText}>
          Photos stay on your phone.
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
      <CameraView ref={camera} style={StyleSheet.absoluteFill} facing={facing} mirror={false} />
      {ghost ? (
        <Image
          source={{ uri: photoUri(ghost) }}
          style={[StyleSheet.absoluteFill, styles.ghost]}
          contentFit="cover"
          accessibilityIgnoresInvertColors
        />
      ) : null}
      <Guides />
      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topBar}>
          <RoundButton label="Close camera" onPress={() => router.back()}>
            <X size={22} strokeWidth={1.8} color={OVERLAY.text} />
          </RoundButton>
          <View style={styles.poseLabel}>
            <Text variant="bodyStrong" color={OVERLAY.text}>
              {poseLabel}
            </Text>
            <Text variant="caption" color={OVERLAY.guide}>
              {ghost ? 'Line up with your last photo' : 'Head on the top line, feet on the bottom'}
            </Text>
          </View>
          <RoundButton
            label={`Timer ${timer === 0 ? 'off' : `${timer} seconds`}`}
            onPress={() => setTimer(TIMERS[(TIMERS.indexOf(timer) + 1) % TIMERS.length])}>
            <Timer size={20} strokeWidth={1.8} color={OVERLAY.text} />
            {timer > 0 ? (
              <Text variant="caption" color={OVERLAY.text} style={styles.timerBadge}>
                {timer}s
              </Text>
            ) : null}
          </RoundButton>
        </View>

        {countdown != null ? (
          <Text variant="bigMetric" color={OVERLAY.text} style={styles.countdown}>
            {countdown}
          </Text>
        ) : null}

        <View style={styles.bottomBar}>
          <View style={styles.side} />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`Take ${poseLabel.toLowerCase()} photo`}
            disabled={busy || countdown != null}
            onPress={() => (timer > 0 ? startTimer() : capture())}
            style={({ pressed }) => [styles.shutter, { opacity: pressed || busy ? 0.6 : 1 }]}>
            <View style={styles.shutterInner} />
          </Pressable>
          <View style={styles.side}>
            <RoundButton
              label="Switch camera"
              onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}>
              <RefreshCcw size={20} strokeWidth={1.8} color={OVERLAY.text} />
            </RoundButton>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

function RoundButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: React.ReactNode;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} style={styles.round}>
      {children}
    </Pressable>
  );
}

/** Head and feet lines plus a centre line, as a light framing guide. */
function Guides() {
  const [size, setSize] = useState({ w: 0, h: 0 });
  const { w, h } = size;
  return (
    <View
      style={StyleSheet.absoluteFill}
      pointerEvents="none"
      onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}>
      {w > 0 ? (
        <Svg width={w} height={h}>
          <Line x1={w * 0.2} x2={w * 0.8} y1={h * 0.14} y2={h * 0.14} stroke={OVERLAY.guide} strokeWidth={1.5} strokeDasharray="6 6" />
          <Circle cx={w / 2} cy={h * 0.19} r={w * 0.07} stroke={OVERLAY.guide} strokeWidth={1.5} fill="none" />
          <Line x1={w / 2} x2={w / 2} y1={h * 0.27} y2={h * 0.86} stroke={OVERLAY.guide} strokeWidth={1} strokeDasharray="2 8" />
          <Line x1={w * 0.2} x2={w * 0.8} y1={h * 0.86} y2={h * 0.86} stroke={OVERLAY.guide} strokeWidth={1.5} strokeDasharray="6 6" />
        </Svg>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  black: { flex: 1, backgroundColor: '#000' },
  center: { alignItems: 'center', justifyContent: 'center', padding: layout.screenPadding, gap: space[3] },
  centerText: { textAlign: 'center' },
  permissionButtons: { alignSelf: 'stretch', gap: space[2], marginTop: space[4] },
  ghost: { opacity: 0.3 },
  overlay: { flex: 1, justifyContent: 'space-between' },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[4],
    paddingTop: space[2],
  },
  poseLabel: { alignItems: 'center', flex: 1, paddingHorizontal: space[2] },
  round: {
    width: layout.minTap,
    height: layout.minTap,
    borderRadius: layout.minTap / 2,
    backgroundColor: OVERLAY.scrim,
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerBadge: { position: 'absolute', bottom: -14 },
  countdown: { alignSelf: 'center', fontSize: 96, lineHeight: 104 },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: space[7],
    paddingBottom: space[6],
  },
  side: { width: 72, alignItems: 'center' },
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
