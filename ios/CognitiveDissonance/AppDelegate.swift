internal import Expo
import React
import ReactAppDependencyProvider

@main
class AppDelegate: ExpoAppDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

  /// Configures and starts the app and its React Native bridge, creating and storing a React Native delegate and factory, wiring the dependency provider, and (on iOS/tvOS) creating the main window and starting the React Native app with module name "main".
  /// - Parameters:
  ///   - application: The singleton app object.
  ///   - launchOptions: A dictionary indicating the reason the app was launched, if any.
  /// - Returns: `true` if the app finished launching and handoff to the superclass succeeded, `false` otherwise.
  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  /// Handles requests to open a URL by delegating first to the superclass and then to React Native's linking manager.
  /// - Parameters:
  ///   - app: The application instance requesting the URL open.
  ///   - url: The URL to be opened.
  ///   - options: A dictionary of options that specify the manner in which the URL is opened.
  /// - Returns: `true` if either the superclass or `RCTLinkingManager` handled the URL, `false` otherwise.
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  /// Routes continuation of a user activity to the React Native linking manager and the superclass, returning whether the activity was handled.
  /// - Returns: `true` if either the superclass or `RCTLinkingManager` handled the activity, `false` otherwise.
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
}

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  /// Provides the URL of the JavaScript bundle that the React Native bridge should load.
  /// - Parameter bridge: The `RCTBridge` requesting its bundle URL.
  /// - Returns: The `URL` of the JavaScript bundle to load, or `nil` if no bundle URL is available.

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  /// Provides the URL to the JavaScript bundle that the React Native bridge should load.
  /// In DEBUG builds this returns the development server URL for the virtual Metro entry
  /// ".expo/.virtual-metro-entry"; in release builds this returns the bundled "main.jsbundle"
  /// resource from the main bundle.
  /// - Returns: The URL of the JavaScript bundle to load, or `nil` if no bundle URL is available.
  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}