import chalk from 'chalk';
import {
  errorAsObjectWithMessage,
  logError,
  logTsError,
  logRollpkgError,
  invariant,
} from '../errorUtils';

describe('errorAsObjectWithMessage', () => {
  test('returns the same object when it is passed an error object', () => {
    const error = Error('test error');
    const received = errorAsObjectWithMessage(error);
    expect(received).toBe(error);
  });

  test('returns an object with the error message when passed just an error message', () => {
    const errorMessage = 'test error';
    const received = errorAsObjectWithMessage(errorMessage);
    expect(received.message).toBe(errorMessage);
  });
});

describe('error loggers', () => {
  const consoleError = console.error;

  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = consoleError;
  });

  test('logError logs failedAt', () => {
    logError({ failedAt: 'some specified place' });

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      chalk.red('✗ FAILED AT: some specified place'),
      '\n',
    );
  });

  test('logError logs message', () => {
    logError({ message: 'test error message' });

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith('test error message', '\n');
  });

  test('logError logs fullError', () => {
    let fullError: unknown;
    try {
      const e = new Error('test error');
      throw e;
    } catch (error) {
      fullError = error;
    }
    logError({ fullError });

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(fullError, '\n');
  });

  test('logError logs failedAt, message, and fullError', () => {
    let fullError: unknown;
    try {
      const e = new Error('test error');
      throw e;
    } catch (error) {
      fullError = error;
    }
    logError({
      failedAt: 'some specified place',
      message: 'test error message',
      fullError,
    });

    expect(console.error).toHaveBeenCalledTimes(3);
    expect(console.error).toHaveBeenNthCalledWith(
      1,
      chalk.red('✗ FAILED AT: some specified place'),
      '\n',
    );
    expect(console.error).toHaveBeenNthCalledWith(
      2,
      'test error message',
      '\n',
    );
    expect(console.error).toHaveBeenNthCalledWith(3, fullError, '\n');
  });

  test('logTsError logs TypeScript error message', () => {
    logTsError({ message: 'test TypeScript error' });

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      'TypeScript Error: test TypeScript error',
      '\n',
    );
  });

  test('logTsError logs failedAt and TS error message', () => {
    logTsError({
      failedAt: 'some specified place',
      message: 'test TypeScript error',
    });

    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenNthCalledWith(
      1,
      chalk.red('✗ FAILED AT: some specified place'),
      '\n',
    );
    expect(console.error).toHaveBeenNthCalledWith(
      2,
      'TypeScript Error: test TypeScript error',
      '\n',
    );
  });

  test('logRollpkgError logs Rollpkg error message', () => {
    logRollpkgError({ message: 'test Rollpkg error' });

    expect(console.error).toHaveBeenCalledTimes(1);
    expect(console.error).toHaveBeenCalledWith(
      'Rollpkg Error: test Rollpkg error',
      '\n',
    );
  });

  test('logRollpkgError logs failedAt and Rollpkg error message', () => {
    logRollpkgError({
      failedAt: 'some specified place',
      message: 'test Rollpkg error',
    });

    expect(console.error).toHaveBeenCalledTimes(2);
    expect(console.error).toHaveBeenNthCalledWith(
      1,
      chalk.red('✗ FAILED AT: some specified place'),
      '\n',
    );
    expect(console.error).toHaveBeenNthCalledWith(
      2,
      'Rollpkg Error: test Rollpkg error',
      '\n',
    );
  });
});

describe('invariant', () => {
  test('does not throw when allGood is true', () => {
    expect(() => {
      invariant(true, 'some invariant message');
    }).not.toThrow();
  });

  test('throws error when allGood is false', () => {
    expect(() => {
      invariant(false, 'some invariant message');
    }).toThrowErrorMatchingInlineSnapshot(`"some invariant message"`);
  });
});
