# Mobile App Deployment Guide

This guide covers the complete deployment process for Sacred Sutra Tools mobile applications on iOS App Store and Google Play Store.

## Overview

Sacred Sutra Tools mobile apps are built using Capacitor 7, providing native iOS and Android applications with a shared React codebase. The deployment process includes building, signing, testing, and publishing to app stores.

## Prerequisites

### Development Environment
- **Node.js**: 20.x or later
- **npm**: 11.x or later  
- **Capacitor CLI**: 7.x
- **Git**: For version control

### iOS Requirements
- **macOS**: Required for iOS builds
- **Xcode**: 15.4 or later
- **iOS Deployment Target**: 13.0+
- **Apple Developer Account**: $99/year
- **CocoaPods**: For iOS dependencies

### Android Requirements
- **Java**: JDK 17
- **Android Studio**: Latest stable version
- **Android SDK**: API level 34 (target), API level 23+ (minimum)
- **Google Play Developer Account**: $25 one-time fee

## Project Configuration

### Package Versions
```json
{
  "name": "sacred-sutra-tools",
  "version": "9.11.3",
  "dependencies": {
    "@capacitor/android": "^7.4.3",
    "@capacitor/ios": "^7.4.3",
    "@capacitor/core": "^7.4.3"
  }
}
```

### Build Commands
```bash
# Web build for mobile
npm run build:mobile

# Sync to native projects
npm run cap:sync

# Open native IDEs
npm run cap:open:ios
npm run cap:open:android

# Development workflow
npm run mobile:dev
```

## CI/CD Pipeline

### GitHub Actions Workflows

#### 1. Mobile CI (`mobile-ci.yml`)
**Triggers:**
- Pull requests affecting mobile code
- Pushes to master branch
- Manual workflow dispatch

**Jobs:**
- Setup and dependency installation
- Web asset building for mobile
- Android APK build (debug)
- iOS simulator build
- Automated testing

**Artifacts:**
- Debug APK for testing
- Web build assets
- Test results and build logs

#### 2. Mobile Release (`mobile-release.yml`)
**Triggers:**
- Git tags (v*.*.*)
- Manual workflow dispatch with version input

**Jobs:**
- Production web asset building
- Signed Android AAB/APK creation
- Signed iOS IPA creation
- GitHub release creation

**Artifacts:**
- Production AAB for Play Store
- Production APK for direct distribution
- Signed IPA for App Store
- Release notes and metadata

### Secrets Configuration

#### Required GitHub Secrets

**Environment Files:**
```bash
ENV_FILE                    # Development environment variables
ENV_FILE_PRODUCTION        # Production environment variables
```

**Android Signing:**
```bash
ANDROID_KEYSTORE_BASE64    # Base64 encoded keystore file
ANDROID_KEYSTORE_PASSWORD  # Keystore password
ANDROID_KEY_ALIAS         # Key alias name
ANDROID_KEY_PASSWORD      # Key password
```

**iOS Signing:**
```bash
IOS_CERTIFICATE_BASE64         # Base64 encoded .p12 certificate
IOS_CERTIFICATE_PASSWORD       # Certificate password
IOS_PROVISIONING_PROFILE_BASE64 # Base64 encoded provisioning profile
```

### Environment Setup
```bash
# Create Android keystore
keytool -genkey -v -keystore android-release-key.keystore -alias sacred-sutra-tools -keyalg RSA -keysize 2048 -validity 10000

# Convert to base64 for GitHub secrets
base64 -i android-release-key.keystore | pbcopy

# iOS certificate export from Keychain Access
# Export as .p12 with password, then convert to base64
base64 -i certificate.p12 | pbcopy
```

## Platform-Specific Deployment

### iOS App Store Deployment

#### 1. Xcode Project Configuration
```bash
# Project settings in ios/App/App.xcodeproj/project.pbxproj
MARKETING_VERSION = 9.11.3
CURRENT_PROJECT_VERSION = 2
IPHONEOS_DEPLOYMENT_TARGET = 13.0
PRODUCT_BUNDLE_IDENTIFIER = com.sacredsutra.tools
```

#### 2. App Store Connect Setup
- Create app record with bundle identifier
- Configure app information and pricing
- Upload app icons and screenshots
- Set up App Store metadata
- Configure TestFlight for beta testing

#### 3. Build and Upload Process
```bash
# Local development build
npm run cap:build:ios
cd ios/App
xcodebuild archive -workspace App.xcworkspace -scheme App -archivePath App.xcarchive

# Export IPA
xcodebuild -exportArchive -archivePath App.xcarchive -exportPath ./export -exportOptionsPlist ExportOptions.plist

# Upload to App Store Connect
xcrun altool --upload-app --file "App.ipa" --username "$APPLE_ID" --password "$APP_SPECIFIC_PASSWORD"
```

#### 4. App Store Review
- Submit for review through App Store Connect
- Respond to review feedback if needed
- Release manually or automatically upon approval

### Google Play Store Deployment

#### 1. Android Project Configuration
```gradle
// android/app/build.gradle
android {
    namespace "com.sacredsutra.tools"
    compileSdk 35
    defaultConfig {
        applicationId "com.sacredsutra.tools"
        minSdkVersion 23
        targetSdkVersion 35
        versionCode 2
        versionName "9.11.3"
    }
}
```

#### 2. Google Play Console Setup
- Create app record with package name
- Configure store listing information
- Upload app icons and screenshots
- Set up content rating
- Configure pricing and distribution

#### 3. Build and Upload Process
```bash
# Local development build
npm run cap:build:android
cd android

# Build signed AAB
./gradlew bundleRelease

# Build signed APK (for testing)
./gradlew assembleRelease

# Upload to Play Console (manual or via CI/CD)
```

#### 4. Release Management
- Use internal testing for team validation
- Promote to closed testing (alpha/beta)
- Staged rollout to production (5% → 20% → 50% → 100%)

## Testing Strategy

### Development Testing
```bash
# Run on device/simulator
npx cap run ios
npx cap run android

# Live reload for rapid development
npx cap run ios --livereload
npx cap run android --livereload
```

### Automated Testing
```bash
# Unit tests
npm run test:ci

# E2E tests (if configured)
npm run test:e2e:mobile

# Build verification
npm run lint && npm run type-check
```

### Manual Testing Checklist

#### Core Functionality
- [ ] PDF upload and processing
- [ ] Barcode scanning
- [ ] Inventory management
- [ ] Order analytics
- [ ] Offline functionality
- [ ] Data synchronization

#### Platform-Specific Features
- [ ] iOS: Safe area handling, dark mode
- [ ] Android: Back button, adaptive icons
- [ ] Push notifications
- [ ] App lifecycle management
- [ ] Memory management under stress

#### Device Testing Matrix
**iOS:**
- iPhone SE (2022) - iOS 15
- iPhone 13 - iOS 16  
- iPhone 15 Pro - iOS 17
- iPad Air - iPadOS 16

**Android:**
- Samsung Galaxy A52 - Android 11
- Google Pixel 6 - Android 12
- OnePlus 9 - Android 13
- Samsung Galaxy Tab S8 - Android 12

## Monitoring and Analytics

### Crash Reporting
```typescript
// Firebase Crashlytics integration
import { FirebaseCrashlytics } from '@capacitor-firebase/crashlytics';

// Log non-fatal errors
await FirebaseCrashlytics.recordException({
  message: 'PDF processing failed',
  stack: error.stack,
});
```

### Performance Monitoring
```typescript
// Firebase Performance monitoring
import { FirebasePerformance } from '@capacitor-firebase/performance';

// Track custom metrics
const trace = await FirebasePerformance.startTrace({ traceName: 'pdf_processing' });
// ... process PDF
await FirebasePerformance.stopTrace({ traceName: 'pdf_processing' });
```

### App Store Metrics
- **iOS**: App Store Connect Analytics
- **Android**: Google Play Console Statistics
- **Cross-platform**: Firebase Analytics

## Troubleshooting

### Common iOS Issues

#### Build Errors
```bash
# Clean build folder
cd ios/App
xcodebuild clean

# Update CocoaPods
pod install --repo-update

# Reset Capacitor sync
npx cap sync ios --force
```

#### Code Signing Issues
- Verify certificate validity in Keychain Access
- Check provisioning profile device list
- Ensure bundle identifier matches App Store Connect

### Common Android Issues

#### Gradle Build Errors
```bash
# Clean project
cd android
./gradlew clean

# Reset Gradle cache
./gradlew --stop
rm -rf ~/.gradle/caches
```

#### Signing Issues
- Verify keystore path and passwords
- Check key alias exists in keystore
- Ensure build.gradle signing configuration

### Performance Issues
- Monitor memory usage during PDF processing
- Optimize image sizes and compression
- Use lazy loading for large data sets
- Implement proper caching strategies

## Release Process

### Version Management
1. Update version in `package.json`
2. Create git tag: `git tag v9.11.3`
3. Push tag to trigger release workflow
4. Monitor CI/CD pipeline execution
5. Download and test release artifacts

### App Store Submission
1. **iOS**: Upload IPA to App Store Connect
2. **Android**: Upload AAB to Play Console
3. Fill out platform-specific metadata
4. Submit for review
5. Monitor review status and respond to feedback

### Post-Release Monitoring
- Monitor crash rates and user feedback
- Track download and engagement metrics
- Prepare hotfix process for critical issues
- Plan next release based on user feedback

## Security Considerations

### Code Obfuscation
```bash
# Android ProGuard configuration
# Already configured in android/app/proguard-rules.pro

# iOS: Xcode build settings
# SWIFT_COMPILATION_MODE = "wholemodule"
# ENABLE_BITCODE = NO (for Capacitor compatibility)
```

### Data Protection
- All sensitive data encrypted at rest
- Network communications use HTTPS/TLS
- Biometric authentication for app access
- Secure storage for user credentials

### API Security
- Firebase security rules properly configured
- Rate limiting on cloud functions
- Input validation and sanitization
- Regular security audits and updates

## Support and Maintenance

### User Support
- **Email**: support@sacredsutra.tools
- **Documentation**: In-app help and tutorials
- **FAQ**: Common issues and solutions
- **Community**: GitHub discussions for feature requests

### Maintenance Schedule
- **Weekly**: Monitor app store reviews and crash reports
- **Monthly**: Update dependencies and security patches
- **Quarterly**: Major feature releases and platform updates
- **Annually**: Review and update certificates and signing keys

### Backup and Recovery
- Source code: GitHub with protected main branch
- Signing certificates: Secure backup in encrypted storage
- App Store metadata: Version controlled in repository
- Build artifacts: Retained for 90 days in CI/CD system

## Future Enhancements

### Planned Features
- Push notifications for inventory alerts
- Apple Watch companion app
- Android wear OS support
- Multi-language localization
- Advanced analytics and reporting

### Technical Roadmap
- Migrate to Capacitor 8 when stable
- Implement code push for instant updates
- Add automated screenshot generation
- Enhance offline capabilities
- Improve accessibility features

---

For questions or issues with mobile deployment, please contact the development team or create an issue in the GitHub repository.