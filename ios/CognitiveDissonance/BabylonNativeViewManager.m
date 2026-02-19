//
//  BabylonNativeViewManager.m
//  CognitiveDissonance
//
//  Objective-C bridge for BabylonNativeViewManager Swift class
//  Required for React Native module registration
//

#import <React/RCTViewManager.h>

@interface RCT_EXTERN_MODULE(BabylonNativeViewManager, RCTViewManager)

// Export props
RCT_EXPORT_VIEW_PROPERTY(onEngineReady, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(antialias, BOOL)
RCT_EXPORT_VIEW_PROPERTY(stencil, BOOL)

@end
