# Android App Signing Configuration

This document explains how to configure Android app signing for production releases.

## Current Setup (Throwaway Keystore)

**The release workflow currently generates a throwaway keystore automatically** for testing and development. These APKs:
- ✅ Can be installed on devices for testing
- ✅ Work for internal distribution
- ❌ Cannot be published to Google Play Store
- ❌ Cannot update existing app installations
- ❌ Each build uses a different signature

**This is intentional** - we're not ready for production releases yet.

## When to Configure Production Signing

Configure production signing when:
1. Ready to publish to Google Play Store
2. Need to maintain consistent signatures across builds
3. Want to enable app updates (same signature required)

Until then, the auto-generated keystores work fine for development.

## Generating a Production Keystore

If you don't have a keystore yet, create one using `keytool`:

```bash
keytool -genkey -v -keystore release.keystore -alias cognitive-dissonance \
  -keyalg RSA -keysize 2048 -validity 10000

# You'll be prompted for:
# - Keystore password (save this!)
# - Key password (save this!)
# - Your name/organization details
```

**Important**: Keep your keystore file and passwords secure! If you lose them, you cannot update your app on the Play Store.

## Configuring GitHub Secrets

1. **Encode your keystore to base64**:
   ```bash
   base64 -w 0 release.keystore > keystore.base64.txt
   ```

2. **Add GitHub Secrets**:
   
   Go to your repository → Settings → Secrets and variables → Actions → New repository secret
   
   Add these four secrets:
   
   - **KEYSTORE_BASE64**: Contents of `keystore.base64.txt`
   - **KEYSTORE_PASSWORD**: The keystore password you entered
   - **KEY_ALIAS**: Your key alias (e.g., `cognitive-dissonance`)
   - **KEY_PASSWORD**: The key password you entered

## How It Works

### Current Behavior (No Secrets)

Without GitHub secrets configured, the workflow:

1. Logs: "No signing secrets configured - generating throwaway keystore"
2. Runs `keytool -genkey` to create a temporary keystore
3. Uses throwaway credentials (keystore password: "android", alias: "cognitive-dissonance-test")
4. Runs `./gradlew assembleRelease` to build signed APKs
5. Uploads APKs as `cognitive-dissonance-{version}-{arch}.apk`
6. **Warning**: Each build has a different signature (cannot update existing installations)

### With Production Secrets Configured

When all four secrets are present, the workflow:

1. Logs: "Release signing secrets detected"
2. Decodes the base64 keystore from `KEYSTORE_BASE64`
3. Creates `android/app/release.keystore`
4. Generates `android/gradle.properties` with your signing config
5. Updates `android/app/build.gradle` to use the signing config
6. Runs `./gradlew assembleRelease` to build **production-signed** APKs
7. Uploads APKs as `cognitive-dissonance-{version}-{arch}.apk`
8. **Success**: Consistent signature, can publish to Play Store and update existing installs

## Development vs Production

### For Development (Current Setup)
- ✅ Throwaway keystores work fine
- ✅ Fast iteration, no secret management
- ✅ APKs installable via ADB or direct download
- ✅ Good for testing and internal previews

### For Production (Future)
- 🔒 Configure GitHub secrets with production keystore
- 🔒 Same signature for all builds
- 🔒 Can publish to Google Play Store
- 🔒 Users can update without reinstalling

## When You're Ready for Production

1. Generate a production keystore (see above)
2. **Back it up securely** (losing it means you can never update your app)
3. Configure the four GitHub secrets
4. Create a new release
5. APKs will be signed with your production keystore
6. Submit to Google Play Store

Until then, enjoy the simplicity of throwaway keystores! 🎮

1. **Never commit keystores to git**
   - `.gitignore` already excludes `*.keystore`
   
2. **Store keystore backups securely**
   - Keep encrypted backups in a secure location
   - Password manager for credentials
   
3. **Rotate secrets if compromised**
   - Generate a new keystore
   - Update GitHub secrets
   - Note: Existing app installs cannot be updated with a new keystore

## Verifying Signed APKs

Check if an APK is signed:

```bash
# Install apksigner (part of Android SDK build-tools)
apksigner verify --verbose app-release.apk

# Should show:
# Verified using v1 scheme (JAR signing): true
# Verified using v2 scheme (APK Signature Scheme v2): true
```

## Troubleshooting

### Build fails with "Keystore was tampered with"
- Your KEYSTORE_PASSWORD is incorrect
- Re-encode the keystore: `base64 -w 0 release.keystore`

### Build fails with "Failed to read key"
- Your KEY_PASSWORD or KEY_ALIAS is incorrect
- Verify with: `keytool -list -v -keystore release.keystore`

### APK is still unsigned after adding secrets
- Check GitHub Actions logs for keystore configuration step
- Ensure all four secrets are set (not just some)
- Verify base64 encoding has no line breaks

## Play Store Publishing

To publish signed APKs to Google Play Store:

1. Configure signing secrets (see above)
2. Create a release on GitHub (triggers workflow)
3. Download signed APK from GitHub Releases
4. Upload to Play Console
5. Or configure automated publishing with `gradle-play-publisher` plugin

## References

- [Android Developer: Sign your app](https://developer.android.com/studio/publish/app-signing)
- [Capacitor: Building for Android](https://capacitorjs.com/docs/android)
- [GitHub Actions: Encrypted secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
