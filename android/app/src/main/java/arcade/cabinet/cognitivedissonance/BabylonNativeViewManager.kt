/**
 * BabylonNativeViewManager.kt
 * CognitiveDissonance
 *
 * Babylon Native View Manager for Android
 * Bridges SurfaceView → Babylon Native Engine (Vulkan/GLES)
 *
 * This is a STUB implementation. Full implementation requires:
 * 1. Babylon Native Android library integration (Vulkan/GLES backend)
 * 2. SurfaceView setup with EGL context
 * 3. Babylon Native engine initialization with native surface
 * 4. Engine reference bridging to JavaScript via ReactContextBaseJavaModule
 *
 * See design.md "Babylon Native Integration Architecture" for full spec.
 */

package arcade.cabinet.cognitivedissonance

import android.graphics.Color
import android.view.Gravity
import android.view.View
import android.widget.TextView
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp

class BabylonNativeViewManager(
    private val reactContext: ReactApplicationContext
) : SimpleViewManager<View>() {

    override fun getName() = "BabylonNativeView"

    override fun createViewInstance(reactContext: ThemedReactContext): View {
        // TODO: Replace with SurfaceView + Babylon Native Vulkan/GLES engine
        // For now, return a placeholder view with error message
        val textView = TextView(reactContext)
        textView.text = "Babylon Native not implemented\nFalling back to screen mode"
        textView.setTextColor(Color.WHITE)
        textView.setBackgroundColor(Color.BLACK)
        textView.gravity = Gravity.CENTER
        textView.textSize = 16f
        return textView
    }

    @ReactProp(name = "antialias")
    fun setAntialias(view: View, antialias: Boolean) {
        // TODO: Configure MSAA on SurfaceView
    }

    @ReactProp(name = "stencil")
    fun setStencil(view: View, stencil: Boolean) {
        // TODO: Configure stencil buffer on EGL context
    }
}

// MARK: - Full Implementation Outline
//
// 1. Import Babylon Native library:
//    import com.babylonjs.BabylonNative
//
// 2. Create SurfaceView with EGL context:
//    val surfaceView = SurfaceView(reactContext)
//    val eglContext = EGL14.eglCreateContext(...)
//    surfaceView.holder.addCallback(object : SurfaceHolder.Callback {
//      override fun surfaceCreated(holder: SurfaceHolder) {
//        // Initialize Babylon Native engine with native surface
//      }
//    })
//
// 3. Initialize Babylon Native engine:
//    val engine = BabylonNative.Engine(surfaceView.holder.surface)
//
// 4. Bridge engine reference to JS:
//    val engineId = UUID.randomUUID().toString()
//    // Store engine in global registry keyed by engineId
//    // Send onEngineReady event with engineId via RCTEventEmitter
//
// 5. Implement render loop:
//    val renderThread = Thread {
//      while (running) {
//        engine.renderFrame()
//      }
//    }
//    renderThread.start()
//
// See Babylon Native Android samples for reference implementation:
// https://github.com/BabylonJS/BabylonNative/tree/master/Apps/Playground/Android
