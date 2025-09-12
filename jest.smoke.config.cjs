// Smoke test configuration for fast deployment validation
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/setupTests.ts'],
  collectCoverage: false,
  testTimeout: 10000, // Faster timeout for smoke tests
  moduleNameMapping: {
    '^.+\\.(css|less|scss)$': 'identity-obj-proxy',
  },
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(@firebase|firebase|other-es-module-package)/)'
  ],
  testEnvironmentOptions: {
    customExportConditions: ['node', 'node-addons'],
  },
  moduleFileExtensions: ['js', 'jsx', 'ts', 'tsx', 'json', 'node'],
  
  // Only run smoke tests - basic app functionality
  testMatch: [
    '**/__tests__/App.test.tsx',
    '**/__tests__/smoke.test.tsx',
    '**/__tests__/**/smoke.test.[tj]s?(x)'
  ],
  
  // Optimize for speed
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/smoke',
  verbose: false,
  silent: false
};