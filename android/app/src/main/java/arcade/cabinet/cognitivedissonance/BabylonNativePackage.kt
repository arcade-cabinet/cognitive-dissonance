/**
 * BabylonNativePackage.kt
 * CognitiveDissonance
 *
 * React Native package for Babylon Native view manager
 */

package arcade.cabinet.cognitivedissonance

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class BabylonNativePackage : ReactPackage {
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(BabylonNativeViewManager(reactContext))
    }
}
