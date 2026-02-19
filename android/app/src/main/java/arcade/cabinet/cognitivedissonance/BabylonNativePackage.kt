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
    /**
     * Supplies the native modules this package exposes to React Native; none are provided.
     *
     * @return An empty list indicating this package registers no native modules.
     */
    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return emptyList()
    }

    /**
     * Provides the view managers exported by this package to React Native.
     *
     * @param reactContext The React application context used to construct view managers.
     * @return A list containing a single `BabylonNativeViewManager` initialized with the given context.
     */
    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(BabylonNativeViewManager(reactContext))
    }
}