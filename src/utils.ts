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
  readline.cursorTo(process.stdout, 0);
};

export const convertPkgNameToKebabCase = (pkgName: string): string =>
  pkgName.replace(/[@!]/g, '').replace(/\//g, '-');

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
