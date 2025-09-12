// Critical test configuration for core functionality validation
module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/setupTests.ts'],
  collectCoverage: false,
  testTimeout: 15000,
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
  
  // Focus on critical functionality: auth, core services, state management
  testMatch: [
    '**/store/slices/**/*.test.[tj]s?(x)',
    '**/services/**/auth.service.test.[tj]s?(x)',
    '**/services/**/product.service.test.[tj]s?(x)',
    '**/services/**/costPrice.service.test.[tj]s?(x)',
    '**/services/**/pdfConsolidation.service.test.[tj]s?(x)',
    '**/pages/home/services/**/*.test.[tj]s?(x)',
    '**/components/**/ProtectedRoute.test.[tj]s?(x)'
  ],
  
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest/critical',
  maxWorkers: '50%', // Use half available workers for faster execution
  verbose: false
};