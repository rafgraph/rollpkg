import { promises as fs } from 'fs';
import { resolve } from 'path';
import { promisify } from 'util';

export const rimraf = promisify(require('rimraf'));

let watchMode: boolean = false;
export const setWatchModeForErrorHandling = (watch: boolean) => watchMode = watch;

export const rollpkgError: (message: string) => never = (message) => {
  console.error(`Rollpkg Error: ${message}`);
  if (watchMode) {
    console.log('Rollpkg watch FAIL!')
    process.exit(0);
  } else {
    console.log('Rollpkg build FAIL!')
    process.exit(1);
  }
};

export const invariant: (allGood: boolean, message: string) => void | never = (
  allGood,
  message,
) => {
  if (!allGood) rollpkgError(message);
};

const clearConsole = () => {
  // from https://github.com/facebook/create-react-app/blob/master/packages/react-dev-utils/clearConsole.js
  process.stdout.write(
    process.platform === 'win32' ? '\x1B[2J\x1B[0f' : '\x1B[2J\x1B[3J\x1B[H'
  );
}

export const logToConsole = (toLog: any) => {
  if (watchMode) clearConsole();
  console.log(toLog);
}

export const tsError: (message: string) => void | never = async (message) => {
  if (watchMode) clearConsole();
  console.error(`TypeScript Error: ${message}`);
  if (!watchMode) {
    console.log('Rollpkg build FAIL!');
    process.exit(1);
  }
};

export const rollupError: (error: any) => void | never = (error) => {
  if (watchMode) clearConsole();
  console.error(error);
  if (!watchMode) {
    console.log('Rollpkg build FAIL!');
    process.exit(1);
  }
};

export const convertPkgNameToKebabCase = (pkgName: string) =>
  pkgName.replace(/@/g, '').replace(/\//g, '-');

export const convertKebabCaseToPascalCase = (kebabCase: string) =>
  kebabCase
    .split('-')
    .map((s) => `${s[0].toUpperCase()}${s.slice(1)}`)
    .join('');

export const fileExists = async (dirPath: string, fileName: string) => {
  try {
    const stats = await fs.stat(resolve(dirPath, fileName));
    return stats.isFile();
  } catch {
    return false;
  }
};
