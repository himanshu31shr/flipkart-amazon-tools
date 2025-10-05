import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.sacredsutra.tools',
  appName: 'Sacred Sutra Tools',
  webDir: 'dist',
  server: {
    // Use HTTP instead of HTTPS for development to allow emulator connections
    hostname: 'localhost',
    androidScheme: 'http'
  }
};

export default config;
