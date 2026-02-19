//
//  BabylonNativeViewManager.swift
//  CognitiveDissonance
//
//  Babylon Native View Manager for iOS
//  Bridges MTKView → Babylon Native Engine (Metal)
//
//  This is a STUB implementation. Full implementation requires:
//  1. Babylon Native iOS framework integration (Metal backend)
//  2. MTKView setup with Metal device and command queue
//  3. Babylon Native engine initialization with Metal surface
//  4. Engine reference bridging to JavaScript via RCTEventEmitter
//
//  See design.md "Babylon Native Integration Architecture" for full spec.
//

import Foundation
import UIKit
import React

@objc(BabylonNativeViewManager)
class BabylonNativeViewManager: RCTViewManager {
  
  /// Provides the UIView used by this view manager.
  /// - Returns: A placeholder UIView with a black background containing a centered white label that indicates Babylon Native is not implemented; used as a fallback until a Metal (MTKView) / Babylon Native integration is provided.
  override func view() -> UIView! {
    // TODO: Replace with MTKView + Babylon Native Metal engine
    // For now, return a placeholder view with error message
    let placeholderView = UIView()
    placeholderView.backgroundColor = UIColor.black
    
    let label = UILabel()
    label.text = "Babylon Native not implemented\nFalling back to screen mode"
    label.textColor = UIColor.white
    label.textAlignment = .center
    label.numberOfLines = 0
    label.translatesAutoresizingMaskIntoConstraints = false
    
    placeholderView.addSubview(label)
    
    NSLayoutConstraint.activate([
      label.centerXAnchor.constraint(equalTo: placeholderView.centerXAnchor),
      label.centerYAnchor.constraint(equalTo: placeholderView.centerYAnchor),
      label.leadingAnchor.constraint(equalTo: placeholderView.leadingAnchor, constant: 20),
      label.trailingAnchor.constraint(equalTo: placeholderView.trailingAnchor, constant: -20)
    ])
    
    return placeholderView
  }
  
  /// Indicates that this view manager must be initialized on the main thread.
  /// - Returns: `true` if the module requires initialization on the main thread, `false` otherwise.
  override static func requiresMainQueueSetup() -> Bool {
    return true
  }
}

// MARK: - Full Implementation Outline
//
// 1. Import Babylon Native framework:
//    import BabylonNative
//
// 2. Create MTKView with Metal device:
//    let metalDevice = MTLCreateSystemDefaultDevice()
//    let mtkView = MTKView(frame: .zero, device: metalDevice)
//    mtkView.colorPixelFormat = .bgra8Unorm
//    mtkView.depthStencilPixelFormat = .depth32Float_stencil8
//
// 3. Initialize Babylon Native engine:
//    let engine = BabylonNative.Engine(metalView: mtkView)
//
// 4. Bridge engine reference to JS:
//    let engineId = UUID().uuidString
//    // Store engine in global registry keyed by engineId
//    // Send onEngineReady event with engineId
//
// 5. Implement render loop:
//    mtkView.delegate = self
//    func draw(in view: MTKView) {
//      engine.renderFrame()
//    }
//
// See Babylon Native iOS samples for reference implementation:
// https://github.com/BabylonJS/BabylonNative/tree/master/Apps/Playground/iOS