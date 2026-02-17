export {};

declare global {
  interface Window {
    visualViewport?: VisualViewport;
    // Legacy support for older browsers
    webkitAudioContext: typeof AudioContext;
  }

  interface VisualViewport extends EventTarget {
    getWindowSegments?: () => DOMRect[];
  }

  interface Navigator {
    devicePosture?: {
      type: 'folded' | 'continuous';
    };
    msMaxTouchPoints?: number;
  }
}
