/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['@testing-library/jest-native/extend-expect'],
  moduleNameMapper: {
    '@react-native-async-storage/async-storage':
      require.resolve('@react-native-async-storage/async-storage/jest/async-storage-mock'),
    // expo-location is not yet installed (added via npx expo install in Phase 8).
    // Map to an empty module so tests that mock it can still run.
    '^expo-location$': '<rootDir>/__mocks__/expo-location.js',
    // react-native-maps is not yet installed (Phase 8).
    '^react-native-maps$': '<rootDir>/__mocks__/react-native-maps.js',
  },
  testMatch: [
    '**/__tests__/**/*.test.(ts|tsx)',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/ios/', '/android/', '/\\.claude/'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg)',
  ],
  collectCoverageFrom: [
    'app/**/*.{ts,tsx}',
    'components/**/*.{ts,tsx}',
    '!app/**/_layout.tsx',
    '!**/node_modules/**',
    '!**/.claude/**',
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      // Functions threshold is lower than the others because stub/placeholder
      // screens (signin-*, verify, tab stubs) are counted but not yet tested.
      // As each screen is built out with TDD this will rise naturally past 70%.
      functions: 60,
      lines: 70,
      statements: 70,
    },
  },
};
