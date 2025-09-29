module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup/setupTests.ts'],
  collectCoverage: false,
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/main.tsx',
    '!src/vite-env.d.ts',
    '!src/**/__tests__/**',
  ],
  // coverageThreshold: {
  //   global: {
  //     branches: 60, // Start with 60%, increase to 80%
  //     functions: 60,
  //     lines: 60,
  //     statements: 60,
  //   },
  // },
  coverageReporters: ['text', 'lcov', 'html'],
  moduleNameMapper: {
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
  testMatch: ['**/__tests__/**/*.(test|spec).[jt]s?(x)', '**/?(*.)+(spec|test).[tj]s?(x)'],
  testPathIgnorePatterns: [
    '<rootDir>/src/__tests__/performance-benchmarks.disabled/'
  ],
  // Performance optimizations
  cache: true,
  cacheDirectory: '<rootDir>/node_modules/.cache/jest',
  maxWorkers: '75%', // Use 75% of available workers for optimal performance
  
  // Optimize test execution
  testSequencer: '<rootDir>/node_modules/@jest/test-sequencer/build/index.js',
  
  // Bail after first test suite failure in CI to save time
  bail: process.env.CI ? 1 : 0
};