import chalk from 'chalk';

export const EXIT_ON_ERROR = 'EXIT_ON_ERROR';

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
  if (failedAt) console.error(chalk.red(`✗ FAILED AT: ${failedAt}`), '\n');
  if (message) console.error(message, '\n');
  if (fullError) console.error(fullError, '\n');
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
    throw Error(message);
  }
};
