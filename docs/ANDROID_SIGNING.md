---
title: Android App Signing Configuration
updated: 2026-04-14
status: current
domain: ops
---

# Android App Signing Configuration

How the Android APK is signed in CI, and how to flip the repo from
debug-only to production-signed releases.

## What CD currently produces

`.github/workflows/cd.yml` → `build-android` job builds **two** APKs in
parallel paths:

1. **Debug APK** (`cognitive-dissonance-debug.apk`) — always built. Signed
   with the Android debug keystore baked into the SDK. Installable for
   smoke tests; **not** publishable to Play Store.

2. **Release APK** (`cognitive-dissonance-release.apk`) — only built when
   the `ANDROID_KEYSTORE_BASE64` repo secret is set. Signed with the
   production keystore decoded from that secret. Suitable for Play Store
   upload and updates of existing installs.

The release path is **gated on secret presence**. With no secrets configured,
the gating step short-circuits cleanly — no fake throwaway keystore, no
fictional release APK with a per-build signature. PRs from forks (which
can't read repo secrets) just skip the release steps.

## Generating a production keystore

If you don't have one yet:

```bash
keytool -genkey -v \
  -keystore release.keystore \
  -alias cognitive-dissonance \
  -keyalg RSA -keysize 2048 -validity 10000
```

`keytool` prompts for keystore password, key password, and identifying
details. Save **all** of them. Losing the keystore or any password means
you can never update the app on Play Store under the same identity.

Verify it locally:

```bash
keytool -list -v -keystore release.keystore
```

## Wiring the GitHub secrets

The CD workflow reads exactly **four** secrets:

| Secret name                  | Source                                           |
|------------------------------|--------------------------------------------------|
| `ANDROID_KEYSTORE_BASE64`    | `base64 -w 0 release.keystore` (the whole file)  |
| `ANDROID_KEYSTORE_PASSWORD`  | The keystore password you set in `keytool`       |
| `ANDROID_KEY_ALIAS`          | The alias (e.g. `cognitive-dissonance`)          |
| `ANDROID_KEY_PASSWORD`       | The key password you set in `keytool`            |

Encode the keystore:

```bash
# Linux:
base64 -w 0 release.keystore > keystore.b64
# macOS:
base64 -i release.keystore -o keystore.b64
```

Add each secret in **Settings → Secrets and variables → Actions → New
repository secret**.

After all four are set, the next push to `main` builds both the debug and
the release APK, verifies the release APK signature with `apksigner`, and
uploads `cognitive-dissonance-release.apk` as a 90-day workflow artifact.

## How the workflow uses the secrets

In `cd.yml` the release path runs these gated steps in order:

1. **Decode release keystore** (`if: secrets.ANDROID_KEYSTORE_BASE64 != ''`)
   — base64-decodes the secret to `android/app/release.keystore`. Sanity-checks
   the file size so a misconfigured secret fails fast.
2. **Build Release APK (signed)** — runs `./gradlew assembleRelease` with
   `ANDROID_KEYSTORE_PATH`, `ANDROID_KEYSTORE_PASSWORD`, `ANDROID_KEY_ALIAS`,
   and `ANDROID_KEY_PASSWORD` env vars in scope.
3. **Verify Release APK signature** — runs `apksigner verify --verbose` from
   the highest-version build-tools directory, so a misconfigured signing
   block fails the build before the artifact is uploaded.
4. **Upload Release APK** — 90-day retention.
5. **Cleanup keystore** — runs `if: always()` so the decoded keystore file
   never lingers on the runner, even on failure.

## How `build.gradle` reads the credentials

`android/app/build.gradle` defines a `release` signingConfig that reads the
same four credentials from env vars (preferred) or `gradle.properties` (for
local builds):

```groovy
signingConfigs {
    release {
        def storeFilePath = System.getenv('ANDROID_KEYSTORE_PATH') ?: project.findProperty('RELEASE_STORE_FILE') ?: ''
        def storePass     = System.getenv('ANDROID_KEYSTORE_PASSWORD') ?: project.findProperty('RELEASE_STORE_PASSWORD') ?: ''
        def keyAliasName  = System.getenv('ANDROID_KEY_ALIAS') ?: project.findProperty('RELEASE_KEY_ALIAS') ?: ''
        def keyPass       = System.getenv('ANDROID_KEY_PASSWORD') ?: project.findProperty('RELEASE_KEY_PASSWORD') ?: ''

        if (storeFilePath && file(storeFilePath).exists()) {
            storeFile     file(storeFilePath)
            storePassword storePass
            keyAlias      keyAliasName
            keyPassword   keyPass
        }
    }
}

buildTypes {
    release {
        if (signingConfigs.release.storeFile != null) {
            signingConfig signingConfigs.release
        }
    }
}
```

When no keystore is wired up, `signingConfigs.release.storeFile` is `null`
and the release build type falls back to the debug signing config. That
keeps `./gradlew assembleRelease` from hard-erroring during local
development on machines that don't have the production keystore.

## Local production-signed builds

If you want to build a production APK on your machine for testing the
exact artifact CD would produce:

```bash
# Either set the env vars:
export ANDROID_KEYSTORE_PATH=/abs/path/to/release.keystore
export ANDROID_KEYSTORE_PASSWORD=...
export ANDROID_KEY_ALIAS=cognitive-dissonance
export ANDROID_KEY_PASSWORD=...

# Or set them in android/app/gradle.properties (DO NOT COMMIT):
RELEASE_STORE_FILE=release.keystore
RELEASE_STORE_PASSWORD=...
RELEASE_KEY_ALIAS=cognitive-dissonance
RELEASE_KEY_PASSWORD=...

# Then build:
pnpm cap:sync:android
cd android && ./gradlew assembleRelease
```

The signed APK lands in `android/app/build/outputs/apk/release/`.

## Verifying a signed APK

```bash
# apksigner ships in Android SDK build-tools.
apksigner verify --verbose path/to/app-release.apk

# Expected:
#   Verified using v1 scheme (JAR signing): true
#   Verified using v2 scheme (APK Signature Scheme v2): true
```

## Operational rules

- **Never commit keystores.** `.gitignore` excludes `*.keystore` already.
- **Back the keystore up offline** before publishing the first release.
  Once an app is on Play Store, that keystore is the only key that can
  ship updates under the same app identity.
- **Rotate compromised secrets immediately.** A new keystore means the new
  build cannot update existing installs — users would have to uninstall
  and reinstall. Treat the keystore credentials like production database
  credentials.
- **Do not log the keystore path or env vars.** Anywhere a debug step
  might `set -x` or echo, redact deliberately.

## Troubleshooting

**Decoded keystore looks invalid (empty or too small)**
- Re-encode: `base64 -w 0 release.keystore` (Linux) or `base64 -i ... -o ...` (macOS).
- The file must be the unmodified binary, not text.

**`Keystore was tampered with, or password was incorrect`**
- `ANDROID_KEYSTORE_PASSWORD` doesn't match the password you used in
  `keytool`. Re-check; spaces and trailing newlines matter.

**`Failed to read key … from store`**
- `ANDROID_KEY_ALIAS` or `ANDROID_KEY_PASSWORD` is wrong. List aliases:
  `keytool -list -v -keystore release.keystore`.

**`apksigner verify` fails with "DOES NOT VERIFY"**
- The signing config wired but produced an unsigned APK. Usually a stale
  build cache — bump and re-run. As a last resort,
  `cd android && ./gradlew clean assembleRelease`.
