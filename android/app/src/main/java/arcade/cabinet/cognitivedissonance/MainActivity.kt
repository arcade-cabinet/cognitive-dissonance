package arcade.cabinet.cognitivedissonance

import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  /**
   * Applies the AppTheme to ensure correct splash/background/status/navigation bar coloring before the activity initializes, enabling expo-splash-screen styling.
   *
   * @param savedInstanceState The saved instance state bundle, or null.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    // Set the theme to AppTheme BEFORE onCreate to support
    // coloring the background, status bar, and navigation bar.
    // This is required for expo-splash-screen.
    setTheme(R.style.AppTheme);
    super.onCreate(null)
  }

  /**
 * Provide the registered JavaScript component name used by React Native to mount the root component.
 *
 * @return The registered component name "main".
 */
  override fun getMainComponentName(): String = "main"

  /**
   * Create the ReactActivityDelegate used by this activity.
   *
   * The returned delegate is a ReactActivityDelegateWrapper that wraps a DefaultReactActivityDelegate
   * and respects the app's "new architecture" configuration.
   *
   * @return The configured ReactActivityDelegate instance.
  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
          this,
          BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
          object : DefaultReactActivityDelegate(
              this,
              mainComponentName,
              fabricEnabled
          ){})
  }

  /**
   * Aligns the back-button behavior with Android S semantics.
   *
   * On API level <= R attempts to move the task to the background; if that fails for non-root
   * activities it falls back to the default back-press handling. On API level > R delegates to
   * the default implementation.
   *
   * @see <a href="https://developer.android.com/reference/android/app/Activity#onBackPressed()">Activity.onBackPressed</a>
   */
  override fun invokeDefaultOnBackPressed() {
      if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
          if (!moveTaskToBack(false)) {
              // For non-root activities, use the default implementation to finish them.
              super.invokeDefaultOnBackPressed()
          }
          return
      }

      // Use the default back button implementation on Android S
      // because it's doing more than [Activity.moveTaskToBack] in fact.
      super.invokeDefaultOnBackPressed()
  }
}