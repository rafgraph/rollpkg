const { jsWithTs: tsjPreset } = require('ts-jest/presets');

module.exports = {
  // use ts-jest to transform all test files so they are fully typed checked
  transform: tsjPreset.transform,
  testEnvironment: 'jsdom',
  verbose: true,
  // automatically clear mock calls and instances before every test,
  // equivalent to calling jest.clearAllMocks() before each test
  clearMocks: true,
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/coverage/',
    '<rootDir>/demo/',
  ],
  collectCoverage: true,
  // coverage reporter 'text' outputs the coverage to the command line,
  // while 'lcov' generates an lcov report in the coverage directory
  coverageReporters: ['text', 'lcov'],
  // so the coverage report includes all files, including untested files
  collectCoverageFrom: ['<rootDir>/src/**.*'],
  // adds type ahead capability when filtering tests in watch mode
  // see https://github.com/jest-community/jest-watch-typeahead
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname',
  ],
  globals: {
    'ts-jest': {
      diagnostics: {
        // TS151001 is a suggestion to set esModuleInterop to true
        // regardless of if it is actually causing an issue, so not useful
        ignoreCodes: [151001],
      },
    },
  },
};
