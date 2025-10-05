# Native Platform Setup Guide

This guide helps you complete the manual setup steps for iOS and Android platforms.

## ✅ Current Status

**Completed:**
- ✓ Capacitor core packages installed (v7.4.3)
- ✓ Firebase Capacitor plugins installed (v7.3.1)
- ✓ iOS platform created (`ios/` directory)
- ✓ Android platform created (`android/` directory)
- ✓ npm scripts configured

**Pending:**
- ⏳ iOS CocoaPods dependencies installation
- ⏳ Firebase configuration files
- ⏳ App icons and splash screens
- ⏳ Camera permissions configuration

---

## 🔧 Step 1: Fix CocoaPods UTF-8 Issue (iOS)

### Problem
CocoaPods is failing with: `Unicode Normalization not appropriate for ASCII-8BIT`

### Solution Option A: Set Environment Variable (Temporary)
```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
cd ios/App
pod install
```

### Solution Option B: Add to Shell Profile (Permanent)
Add to `~/.zshrc` or `~/.bash_profile`:
```bash
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
```

Then reload:
```bash
source ~/.zshrc  # or source ~/.bash_profile
cd ios/App
pod install
```

### Solution Option C: Open in Xcode (Easiest)
Xcode will automatically handle CocoaPods:
```bash
npm run cap:open:ios
```
Then in Xcode: **File → Packages → Update to Latest Package Versions**

---

## 📱 Step 2: Configure Firebase for iOS

### 2.1 Download Configuration File

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: **sacred-sutra-tools** (or your Firebase project name)
3. Click the gear icon ⚙️ → **Project Settings**
4. Scroll to **Your apps** section
5. Click **Add app** → **iOS**
6. Register app with:
   - **Apple bundle ID**: `com.sacredsutra.tools`
   - **App nickname**: `Sacred Sutra Tools iOS` (optional)
   - **App Store ID**: Leave blank for now
7. Click **Register app**
8. **Download** `GoogleService-Info.plist`

### 2.2 Add to Xcode Project

```bash
# Open iOS project
npm run cap:open:ios
```

In Xcode:
1. Drag `GoogleService-Info.plist` into the `App/App` folder in the navigator
2. **IMPORTANT**: Check "Copy items if needed"
3. **IMPORTANT**: Ensure "App" target is selected
4. Click **Finish**

### 2.3 Verify Installation

The file should be located at:
```
ios/App/App/GoogleService-Info.plist
```

⚠️ **DO NOT commit this file to Git** (already in .gitignore)

---

## 🤖 Step 3: Configure Firebase for Android

### 3.1 Download Configuration File

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Same project as above
3. Click **Add app** → **Android**
4. Register app with:
   - **Android package name**: `com.sacredsutra.tools`
   - **App nickname**: `Sacred Sutra Tools Android` (optional)
   - **Debug signing certificate SHA-1**: Leave blank for now
5. Click **Register app**
6. **Download** `google-services.json`

### 3.2 Add to Android Project

```bash
# Copy file to Android project
cp ~/Downloads/google-services.json android/app/google-services.json
```

### 3.3 Configure Gradle Files

**File**: `android/build.gradle` (Root level)

Add to `dependencies` block:
```gradle
buildscript {
    dependencies {
        // ... existing dependencies
        classpath 'com.google.gms:google-services:4.4.2'  // Add this line
    }
}
```

**File**: `android/app/build.gradle` (App level)

Add at the **bottom** of the file:
```gradle
apply plugin: 'com.google.gms.google-services'
```

### 3.4 Verify Installation

```bash
# Open Android project
npm run cap:open:android
```

In Android Studio:
1. Click **File → Sync Project with Gradle Files**
2. Wait for sync to complete
3. Verify no errors in Build output

⚠️ **DO NOT commit this file to Git** (already in .gitignore)

---

## 🎨 Step 4: Configure App Icons and Splash Screens

### 4.1 Create App Icon

Create a **1024x1024px** PNG image with:
- **Brand color**: #2196f3 (Material UI primary blue)
- **Design**: Your app logo/icon
- **Format**: PNG with transparency
- **No padding**: Icon should fill the entire canvas

Save as: `resources/icon.png`

### 4.2 Create Splash Screen

Create a **2732x2732px** PNG image with:
- **Background**: #2196f3 or white
- **Logo**: Centered, approximately 800x800px
- **Format**: PNG

Save as: `resources/splash.png`

### 4.3 Generate Platform Assets

```bash
# Install Capacitor Assets tool
npm install -D @capacitor/assets

# Generate all platform-specific icons and splash screens
npx capacitor-assets generate --iconBackgroundColor '#2196f3' --iconBackgroundColorDark '#1976d2' --splashBackgroundColor '#2196f3' --splashBackgroundColorDark '#1976d2'
```

This automatically creates:
- iOS: `ios/App/App/Assets.xcassets/AppIcon.appiconset/*`
- Android: `android/app/src/main/res/mipmap-*/ic_launcher.png`
- Splash screens for both platforms

### 4.4 Configure Splash Screen in Capacitor

**File**: `capacitor.config.ts`

```typescript
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sacredsutra.tools',
  appName: 'Sacred Sutra Tools',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#2196f3',
      showSpinner: true,
      spinnerColor: '#ffffff'
    }
  }
};

export default config;
```

---

## 📸 Step 5: Configure Camera Permissions

### 5.1 iOS Permissions

**File**: `ios/App/App/Info.plist`

Add before the closing `</dict>` tag:

```xml
<key>NSCameraUsageDescription</key>
<string>Required for barcode scanning to quickly find and complete orders</string>
```

### 5.2 Android Permissions

**File**: `android/app/src/main/AndroidManifest.xml`

Add after the opening `<manifest>` tag:

```xml
<uses-permission android:name="android.permission.CAMERA" />
<uses-feature android:name="android.hardware.camera" android:required="false" />
```

---

## 🧪 Step 6: Test Native Builds

### iOS Build Test

```bash
# Sync latest changes
npm run cap:build:ios

# Open in Xcode
npm run cap:open:ios
```

In Xcode:
1. Select a simulator (e.g., iPhone 15 Pro)
2. Click the Play button (▶️) or press Cmd+R
3. App should launch in simulator

### Android Build Test

```bash
# Sync latest changes
npm run cap:build:android

# Open in Android Studio
npm run cap:open:android
```

In Android Studio:
1. Click **Run → Select Device**
2. Choose an emulator or connected device
3. Click the Run button (▶) or press Ctrl+R
4. App should launch on device/emulator

---

## 🔍 Verification Checklist

Before proceeding to development:

- [ ] CocoaPods installed successfully (iOS)
- [ ] `GoogleService-Info.plist` in `ios/App/App/`
- [ ] `google-services.json` in `android/app/`
- [ ] google-services plugin added to Gradle
- [ ] App icons generated and visible in Xcode/Android Studio
- [ ] Splash screen configured in `capacitor.config.ts`
- [ ] Camera permission strings added (iOS Info.plist, Android Manifest)
- [ ] iOS app builds and runs in simulator
- [ ] Android app builds and runs in emulator

---

## 🆘 Troubleshooting

### iOS: "Command PhaseScriptExecution failed"
```bash
cd ios/App
pod deintegrate
pod install
```

### Android: "SDK location not found"
Create `android/local.properties`:
```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk
```

### Android: Gradle version error
**File**: `android/gradle/wrapper/gradle-wrapper.properties`
```properties
distributionUrl=https\://services.gradle.org/distributions/gradle-8.5-all.zip
```

### Firebase not initializing
1. Clean build folders: Xcode → Product → Clean Build Folder
2. Android Studio → Build → Clean Project
3. Verify config files are in correct locations
4. Check Firebase console shows both apps registered

---

## 📚 Next Steps

Once all verification checks pass:

1. ✅ **Tasks 3-9 Complete** - Native platforms fully configured
2. ➡️ **Tasks 12-16** - Update Firebase services to use Capacitor plugins
3. ➡️ **Tasks 21-24** - Complete mobile infrastructure
4. ➡️ **Tasks 25-34** - Build mobile component library
5. ➡️ **Tasks 35-50** - Implement mobile pages
6. ➡️ **Tasks 51-58** - Write comprehensive tests
7. ➡️ **Tasks 59-66** - Deploy to App Store and Play Store

---

## 📞 Support Resources

- **Capacitor Docs**: https://capacitorjs.com/docs
- **Firebase iOS Setup**: https://firebase.google.com/docs/ios/setup
- **Firebase Android Setup**: https://firebase.google.com/docs/android/setup
- **CocoaPods Troubleshooting**: https://guides.cocoapods.org/using/troubleshooting
- **Gradle Issues**: https://docs.gradle.org/current/userguide/troubleshooting.html

---

**You're all set!** 🎉 Once these manual steps are complete, the mobile app will be ready for feature development.
