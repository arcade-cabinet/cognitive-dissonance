package arcade.cabinet.cognitivedissonance

import android.app.Application
import android.content.res.Configuration

import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.ReactPackage
import com.facebook.react.ReactHost
import com.facebook.react.common.ReleaseLevel
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint

import expo.modules.ApplicationLifecycleDispatcher
import expo.modules.ExpoReactHostFactory

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    ExpoReactHostFactory.getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          // Register Babylon Native view manager
          add(BabylonNativePackage())
        }
    )
  }

  /**
   * Performs application startup: configures React Native release level, initializes React Native, and notifies Expo lifecycle.
   *
   * Sets DefaultNewArchitectureEntryPoint.releaseLevel from BuildConfig.REACT_NATIVE_RELEASE_LEVEL (falls back to ReleaseLevel.STABLE on invalid value), calls loadReactNative(this), and forwards the creation event to ApplicationLifecycleDispatcher.
   */
  override fun onCreate() {
    super.onCreate()
    DefaultNewArchitectureEntryPoint.releaseLevel = try {
      ReleaseLevel.valueOf(BuildConfig.REACT_NATIVE_RELEASE_LEVEL.uppercase())
    } catch (e: IllegalArgumentException) {
      ReleaseLevel.STABLE
    }
    loadReactNative(this)
    ApplicationLifecycleDispatcher.onApplicationCreate(this)
  }

  /**
   * Handles runtime configuration changes and propagates the new configuration to registered lifecycle listeners.
   *
   * @param newConfig The updated device configuration (locale, screen size, orientation, etc.).
   */
  override fun onConfigurationChanged(newConfig: Configuration) {
    super.onConfigurationChanged(newConfig)
    ApplicationLifecycleDispatcher.onConfigurationChanged(this, newConfig)
  }
}