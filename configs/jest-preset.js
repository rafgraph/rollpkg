const { jsWithTs: tsjPreset } = require('ts-jest/presets');

module.exports = {
  globals: {
    'ts-jest': {
      diagnostics: {
        // TS151001 is a suggestion to set esModuleInterop to true
        // regardless of if it is actually causing an issue, so not useful
        ignoreCodes: [151001],
      },
    },
  },
  rootDir: 'src',
  // use ts-jest to transform all test files so they are fully typed checked
  transform: tsjPreset.transform,
  testEnvironment: 'jsdom',
  verbose: true,
  // automatically clear mock calls and instances before every test,
  // equivalent to calling jest.clearAllMocks() before each test
  clearMocks: true,
  collectCoverage: true,
  // coverage reporter 'text' outputs the coverage to the command line,
  // while 'lcov' generates an lcov report in the coverage directory
  coverageReporters: ['text', 'lcov'],
  // so the coverage report includes all files, including untested files
  collectCoverageFrom: ['./src/**.*'],
};
