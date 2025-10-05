# Firebase Emulator Development Guide

**TL;DR**: You can develop and test the entire mobile app using Firebase emulators - **no native config files needed!**

---

## ✅ What This Unlocks

With Firebase emulators, you can:

- ✅ Build all mobile features (Tasks 12-50)
- ✅ Test in iOS simulator/Android emulator
- ✅ Use web Firebase SDK (no native config files required)
- ✅ Develop 100% offline with local Firebase
- ✅ Reset data instantly for testing
- ✅ Inspect Firestore data in real-time

**Skip tasks 6-7 entirely during development!**

---

## 🚀 Quick Start

### 1. Start Firebase Emulators + Dev Server

```bash
npm run dev
```

This automatically:
- Starts Firebase emulators (Auth, Firestore, Storage)
- Seeds test data after 4 seconds
- Starts Vite dev server with emulator environment variables
- Connects to emulators at localhost:8080 (Firestore), localhost:9099 (Auth), localhost:9199 (Storage)

### 2. Build and Test Mobile App

```bash
# Build web app and sync to native platforms
npm run mobile:dev

# Test in iOS Simulator (requires Xcode)
npm run cap:open:ios
# In Xcode: Select simulator → Press ▶️

# Test in Android Emulator (requires Android Studio)
npm run cap:open:android
# In Android Studio: Select emulator → Click Run ▶
```

The mobile app will automatically connect to Firebase emulators!

---

## 🔧 How It Works

### Emulator Detection

The app automatically detects emulator mode by checking:

1. **Development environment**: `import.meta.env.DEV === true`
2. **Emulator environment variables**: `VITE_FIREBASE_*_EMULATOR_HOST` are set

When both conditions are true:
- ✅ Uses **web Firebase SDK** (works on iOS/Android via WebView)
- ✅ Connects to localhost emulators
- ✅ No native config files needed

### Code Path Selection

**File**: `src/services/firebase.capacitor.ts`

```typescript
// Development with emulators
if (shouldUseEmulators()) {
  console.log('Using Firebase Web SDK with emulators');
  return; // Web SDK handles everything
}

// Production builds
else {
  // Use native Capacitor Firebase plugins
  // Requires GoogleService-Info.plist / google-services.json
}
```

---

## 📱 Testing on Mobile Devices

### iOS Simulator

```bash
# Terminal 1: Start emulators
npm run emulator:start

# Terminal 2: Build and open iOS
npm run mobile:dev && npm run cap:open:ios
```

In Xcode:
1. Select simulator (e.g., iPhone 15 Pro)
2. Press ▶️ (Cmd+R)
3. App launches and connects to emulators

**Check Console for**: `🔧 Development mode: Using Firebase Web SDK with emulators`

### Android Emulator

```bash
# Terminal 1: Start emulators
npm run emulator:start

# Terminal 2: Build and open Android
npm run mobile:dev && npm run cap:open:android
```

In Android Studio:
1. Select emulator (e.g., Pixel 6 API 34)
2. Click Run ▶
3. App launches and connects to emulators

**Check Logcat for**: `🔧 Development mode: Using Firebase Web SDK with emulators`

---

## 🎯 Development Workflow

### Recommended Setup

**3-Terminal Workflow:**

```bash
# Terminal 1: Firebase Emulators (keep running)
npm run emulator:start

# Terminal 2: Vite Dev Server (keep running)
npm run dev:emulator

# Terminal 3: Build and sync when needed
npm run cap:sync
```

### Auto-Reload Setup

Changes to web code automatically reload in browser. For native platforms:

```bash
# Watch mode: auto-rebuild and sync on save
npm run dev:emulator

# When ready to test on mobile:
npm run cap:sync        # Sync latest build
# Then reload app in simulator/emulator
```

---

## 🗄️ Emulator Data Management

### View Data in Emulator UI

```bash
npm run emulator:ui
```

Opens at http://localhost:4000 with:
- **Firestore**: View/edit documents in real-time
- **Auth**: See registered users
- **Storage**: Browse uploaded files

### Seed Test Data

```bash
# Seed emulator with test data
npm run seed:emulator
```

Creates:
- Test user: `test@example.com` / `password123`
- Sample products, categories, orders
- Realistic inventory levels

### Reset Data

```bash
# Stop emulators (Ctrl+C)
# Clear all data
rm -rf firebase-data/

# Restart and re-seed
npm run emulator:start
# (In another terminal)
npm run seed:emulator
```

### Export/Import Data

```bash
# Export current state
npm run emulator:export

# Import saved state (includes auth, firestore, storage)
npm run emulator:import
```

---

## 🔍 Debugging

### Check Emulator Connection

In mobile app console, you should see:

```
🔧 Development mode: Using Firebase Web SDK with emulators
ℹ️  Native Firebase plugins will be used in production builds
```

### Common Issues

**Issue**: App can't connect to emulators

**Solution**: Verify environment variables are set
```bash
# Check in running app
console.log(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_HOST); // Should be 'localhost'
console.log(import.meta.env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT); // Should be '8080'
```

**Issue**: "Failed to connect to emulator"

**Solution**: Ensure emulators are running
```bash
# Check emulator status
curl http://localhost:8080  # Should return Firestore data
curl http://localhost:9099  # Should return Auth status
```

**Issue**: Changes not reflecting on mobile

**Solution**: Rebuild and sync
```bash
npm run build:prod && npm run cap:sync
# Then reload app in simulator/emulator
```

---

## 📊 Emulator Ports

| Service | Port | URL |
|---------|------|-----|
| Firestore | 8080 | http://localhost:8080 |
| Auth | 9099 | http://localhost:9099 |
| Storage | 9199 | http://localhost:9199 |
| Emulator UI | 4000 | http://localhost:4000 |

### Network Configuration

**Web Browser**: Uses `localhost` directly

**iOS Simulator**: Uses `localhost` (works transparently)

**Android Emulator**: May need `10.0.2.2` instead of `localhost`
- Emulator code already handles this automatically
- `localhost` is aliased to `10.0.2.2` on Android

---

## 🎨 What You Can Build Without Native Config

With emulators, you can complete **ALL** of these tasks:

### ✅ Tasks 12-16: Firebase Services
- Update firebase.service.ts for Capacitor
- Implement auth with emulator
- Configure Firestore operations
- Set up Storage service
- Write integration tests

### ✅ Tasks 21-24: Mobile Infrastructure
- Integrate MobileAppShell routing
- Implement back button handler
- Create pull-to-refresh hook
- Build offline indicator

### ✅ Tasks 25-34: Mobile Components
- All 10 mobile components
- DataTable, Modals, FABs, etc.
- Full component test suite

### ✅ Tasks 35-50: Mobile Pages
- Orders page with barcode scanner (mock scanner OK)
- Products page with search
- Categories pages
- All integration tests

### ✅ Tasks 51-58: Testing
- Unit tests (80%+ coverage)
- Integration tests
- E2E tests with Playwright
- Responsive viewport tests

---

## 🚢 Production Builds

When ready for production (App Store / Play Store):

### Switch to Native Firebase

1. **Download Firebase configs**:
   - `GoogleService-Info.plist` → `ios/App/App/`
   - `google-services.json` → `android/app/`

2. **Build in production mode**:
   ```bash
   npm run build:prod
   npm run cap:sync
   ```

3. **Native configs will be used automatically** (no code changes needed)

4. **Verify in logs**:
   ```
   Initializing Firebase Capacitor plugins for production...
   ✓ Firebase App configured: [DEFAULT]
   ✓ Firestore network enabled
   ```

See [NATIVE_PLATFORM_SETUP.md](NATIVE_PLATFORM_SETUP.md) for full production setup.

---

## 🎓 Benefits of Emulator Development

1. **Zero Setup**: No Firebase Console, no config downloads
2. **Fast Iteration**: Instant data reset, no network latency
3. **Offline**: Full development without internet
4. **Debugging**: Inspect all data in Emulator UI
5. **Testing**: Reproducible test scenarios with seeded data
6. **Cost**: No Firebase usage charges during development

---

## 🔗 Resources

- **Emulator Docs**: https://firebase.google.com/docs/emulator-suite
- **Capacitor Docs**: https://capacitorjs.com/docs
- **Project Scripts**: See [package.json](package.json)
- **Native Setup**: [NATIVE_PLATFORM_SETUP.md](NATIVE_PLATFORM_SETUP.md) (only needed for production)

---

## ✅ Checklist

Before starting mobile development:

- [x] Firebase emulators installed
- [x] `npm run dev` works and seeds data
- [x] iOS/Android platforms created (`ios/`, `android/`)
- [x] Mobile utilities and navigation components created
- [ ] Build mobile app: `npm run mobile:dev`
- [ ] Test in simulator: `npm run cap:open:ios` or `npm run cap:open:android`
- [ ] Verify emulator connection in app console

---

**You're ready to build!** Start implementing tasks 12-50 with full Firebase functionality via emulators. 🚀
