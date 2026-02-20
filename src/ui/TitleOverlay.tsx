import type React from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { Animated, Platform, StyleSheet, View } from 'react-native';

/**
 * TitleOverlay — Semi-translucent fullscreen overlay with "COGNITIVE DISSONANCE" title.
 *
 * User flow: On load, the overlay covers the 3D scene. After a brief pause,
 * it fades out to reveal the platter with AI orb underneath.
 * The onFadeComplete callback signals GameBootstrap to start the garage-door
 * sequence (slit opens, PLAY/CONTINUE keys emerge).
 *
 * Cross-platform: Uses React Native Animated API. On web, position: 'fixed'
 * overlays the raw canvas element. On native, absolute positioning within
 * the Reactylon view hierarchy.
 */

interface TitleOverlayProps {
  /** Called when the fade-out animation completes */
  onFadeComplete: () => void;
  /** Delay before fade starts (ms). Default: 2000 */
  fadeDelay?: number;
  /** Fade duration (ms). Default: 1500 */
  fadeDuration?: number;
}

export const TitleOverlay: React.FC<TitleOverlayProps> = ({
  onFadeComplete,
  fadeDelay = 2000,
  fadeDuration = 1500,
}) => {
  const opacity = useRef(new Animated.Value(1)).current;
  const hasCompleted = useRef(false);

  const handleFadeComplete = useCallback(() => {
    if (!hasCompleted.current) {
      hasCompleted.current = true;
      onFadeComplete();
    }
  }, [onFadeComplete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(opacity, {
        toValue: 0,
        duration: fadeDuration,
        useNativeDriver: Platform.OS !== 'web',
      }).start(({ finished }) => {
        if (finished) {
          handleFadeComplete();
        }
      });
    }, fadeDelay);

    return () => clearTimeout(timer);
  }, [opacity, fadeDelay, fadeDuration, handleFadeComplete]);

  return (
    <Animated.View style={[styles.overlay, { opacity, pointerEvents: 'none' }]}>
      <View style={styles.titleContainer}>
        <Animated.Text style={[styles.titleLine, { opacity }]}>COGNITIVE</Animated.Text>
        <Animated.Text style={[styles.titleLine, { opacity }]}>DISSONANCE</Animated.Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    // On web, 'fixed' positioning overlays the raw canvas element.
    // React Native Web supports 'fixed' at runtime; cast to satisfy RN types.
    position: (Platform.OS === 'web' ? 'fixed' : 'absolute') as 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    alignItems: 'center',
  },
  titleLine: {
    color: '#e0e0e0',
    fontSize: 64,
    fontWeight: '700',
    fontFamily: Platform.OS === 'web' ? "'Courier New', monospace" : 'monospace',
    letterSpacing: 8,
    lineHeight: 80,
    textAlign: 'center',
  },
});
