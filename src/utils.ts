import * as fs from 'fs-extra';
import { resolve } from 'path';
import * as readline from 'readline';
import createProgressEstimator from 'progress-estimator';
import cliSpinners from 'cli-spinners';

export const progressEstimator = createProgressEstimator({
  storagePath: resolve(__dirname, '.progress-estimator'),
  spinner: cliSpinners.earth,
});

export const cleanDist: () => Promise<void> = () => fs.emptyDir('./dist');

export const clearConsole: () => void = () => {
  // from https://github.com/facebook/create-react-app/blob/master/packages/react-dev-utils/clearConsole.js
  process.stdout.write(
    process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H',
  );
};

export const clearLine: () => void = () => {
  readline.clearLine(process.stdout, 0);
};

export const EXIT_ON_ERROR = 'EXPORT_ON_ERROR';

export const errorAsObjectWithMessage: (
  error: unknown,
) => { [key: string]: unknown } = (error) => {
  if (typeof error === 'object' && error !== null) {
    return error as { [key: string]: unknown };
  }
  return { message: error };
};

export const logError: (error: {
  failedAt?: string;
  message?: unknown;
  fullError?: unknown;
}) => void = ({ failedAt, message, fullError }) => {
  if (failedAt) console.error(`✗ FAILED: ${failedAt}`);
  if (message) console.error(message);
  if (fullError) console.error(fullError);
};

export const logTsError: (error: {
  failedAt?: string;
  message: unknown;
}) => void = ({ failedAt, message }) => {
  logError({
    failedAt,
    message: `TypeScript Error: ${message}`,
  });
};

export const logRollpkgError: (error: {
  failedAt?: string;
  message: unknown;
}) => void = ({ failedAt, message }) => {
  logError({
    failedAt,
    message: `Rollpkg Error: ${message}`,
  });
};

export const invariant: (allGood: boolean, message: string) => void | never = (
  allGood,
  message,
) => {
  if (!allGood) {
    logRollpkgError({
      message,
    });
    throw EXIT_ON_ERROR;
  }
};

export const convertPkgNameToKebabCase = (pkgName: string): string =>
  pkgName.replace(/@/g, '').replace(/\//g, '-');

export const convertKebabCaseToPascalCase = (kebabCase: string): string =>
  kebabCase
    .split('-')
    .map((s) => `${s[0].toUpperCase()}${s.slice(1)}`)
    .join('');

export const fileExists = async (
  dirPath: string,
  fileName: string,
): Promise<boolean> => {
  try {
    const stats = await fs.stat(resolve(dirPath, fileName));
    return stats.isFile();
  } catch {
    return false;
  }
};
