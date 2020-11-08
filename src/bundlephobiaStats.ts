import { getPackageStats } from 'package-build-stats';
import { PromiseValue } from 'type-fest'; // TODO use Awaited<..> when TypeScript v4.1 is released

/////////////////////////////////////
// hack to prevent bundlephobia getPackageStats() from printing to the console
// note using partial doesn't seem to work because of constructor: type ConsoleFunctions = Partial<Console>
type ConsoleFunctions = { [key in keyof Console]?: unknown };

export const silenceConsole: () => ConsoleFunctions = () => {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  const noop = () => {};
  const consoleFunctions: ConsoleFunctions = {};
  let key: keyof Console;
  for (key in console) {
    if (typeof console[key] === 'function') {
      consoleFunctions[key] = console[key];
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore basically intentionally violating type safe code here to silence the console
      console[key] = noop;
    }
  }
  return consoleFunctions;
};

export const reinstateConsole: (consoleFunctions: ConsoleFunctions) => void = (
  consoleFunctions,
) => {
  Object.entries(consoleFunctions).forEach(([key, func]) => {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    console[key] = func;
  });
};
/////////////////////////////////////

/////////////////////////////////////
// calculate bundlephobia stats
interface CalculateBundlephobiaStats {
  (input: { cwd: string }): ReturnType<typeof getPackageStats>;
}

export const calculateBundlephobiaStats: CalculateBundlephobiaStats = async ({
  cwd,
}) => {
  const consoleFunctions = silenceConsole();

  try {
    const packageStats = await getPackageStats(cwd);
    reinstateConsole(consoleFunctions);
    return packageStats;
  } catch (error) {
    reinstateConsole(consoleFunctions);
    throw error;
  }
};
/////////////////////////////////////

/////////////////////////////////////
// print bundlephobia stats
interface PrintBundlephobiaStats {
  (packageStats: PromiseValue<ReturnType<typeof getPackageStats>>): void;
}

export const printBundlephobiaStats: PrintBundlephobiaStats = (
  packageStats,
) => {
  console.log(`\nMinified size: ${packageStats.size}`);
  console.log(`Minified and gzipped size: ${packageStats.gzip}`);
};
/////////////////////////////////////
