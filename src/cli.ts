#!/usr/bin/env node

import { getPackageStats } from 'package-build-stats';

import { checkInvariantsAndGetConfiguration } from './configureRollpkg';
import {
  createRollupConfig,
  rollupWatch,
  buildBundles,
  writeBundles,
} from './rollupBuilds';
import { progressEstimator, cleanDist } from './utils';
import {
  EXIT_ON_ERROR,
  errorAsObjectWithMessage,
  logError,
  logRollpkgError,
  logTsError,
} from './errorUtils';

const rollpkg = async () => {
  /////////////////////////////////////
  // clean dist folder
  const cleanDistMessage = 'Cleaning dist folder';
  try {
    const clean = cleanDist();
    await progressEstimator(clean, cleanDistMessage, { estimate: 10 });
  } catch (error) {
    logError({
      failedAt: cleanDistMessage,
      message: errorAsObjectWithMessage(error).message,
      fullError: error,
    });
    throw EXIT_ON_ERROR;
  }
  /////////////////////////////////////

  /////////////////////////////////////
  // rollpkg invariants and configuration
  const args = process.argv.slice(2);
  const cwd = process.cwd();
  const invariantsAndConfigurationMessage = 'Checking rollpkg invariants';
  let rollpkgConfiguration;

  try {
    rollpkgConfiguration = checkInvariantsAndGetConfiguration({ args, cwd });
    await progressEstimator(
      rollpkgConfiguration,
      invariantsAndConfigurationMessage,
      { estimate: 10 },
    );
  } catch (error) {
    logRollpkgError({
      failedAt: invariantsAndConfigurationMessage,
      message: errorAsObjectWithMessage(error).message,
    });
    throw EXIT_ON_ERROR;
  }

  const {
    watchMode,
    pkgJsonName,
    pkgName,
    input,
    pkgSideEffects,
    pkgDependencies,
    pkgPeerDependencies,
  } = await rollpkgConfiguration;
  /////////////////////////////////////

  /////////////////////////////////////
  // create rollup config
  const rollupConfigurationMessage = 'Creating rollup config';
  let rollupConfiguration;

  try {
    rollupConfiguration = createRollupConfig({
      pkgName,
      pkgSideEffects,
      pkgPeerDependencies,
    });
    await progressEstimator(Promise.resolve(), rollupConfigurationMessage, {
      estimate: 0,
    });
  } catch (error) {
    logError({
      failedAt: rollupConfigurationMessage,
      message: errorAsObjectWithMessage(error).message,
      fullError: error,
    });
    throw EXIT_ON_ERROR;
  }

  const {
    pkgPeerDependencyGlobals,
    pkgUmdName,
    buildPlugins,
    prodBuildPlugins,
    outputPlugins,
    outputProdPlugins,
    treeshakeOptions,
  } = rollupConfiguration;
  /////////////////////////////////////

  /////////////////////////////////////
  // rollup watch
  if (watchMode) {
    rollupWatch({
      pkgName,
      pkgDependencies,
      pkgPeerDependencies,
      input,
      treeshakeOptions,
      buildPlugins,
      outputPlugins,
    });
    return;
  }
  /////////////////////////////////////

  /////////////////////////////////////
  // create rollup bundles
  const createRollupBundlesMessage = `Creating builds for "${pkgJsonName}" esm, cjs, umd`;
  let bundles;

  try {
    bundles = buildBundles({
      input,
      pkgDependencies,
      pkgPeerDependencies,
      treeshakeOptions,
      buildPlugins,
      prodBuildPlugins,
    });
    await progressEstimator(bundles, createRollupBundlesMessage);
  } catch (error) {
    const errorAsObject = errorAsObjectWithMessage(error);
    // rpt2 is the rollup typescript plugin
    if (errorAsObject.plugin === 'rpt2') {
      logTsError({
        failedAt: createRollupBundlesMessage,
        message: errorAsObject.message,
      });
    } else {
      logError({
        failedAt: createRollupBundlesMessage,
        message: errorAsObject.message,
        fullError: error,
      });
    }
    throw EXIT_ON_ERROR;
  }

  const [bundle, bundleProd, bundleUmd, bundleUmdProd] = await bundles;
  /////////////////////////////////////

  /////////////////////////////////////
  // write rollup bundles
  const writeRollupBundlesMessage = `Writing builds for "${pkgJsonName}" esm, cjs, umd`;
  let writtenBundles;
  try {
    writtenBundles = writeBundles({
      pkgName,
      bundle,
      bundleProd,
      bundleUmd,
      bundleUmdProd,
      outputPlugins,
      outputProdPlugins,
      pkgUmdName,
      pkgPeerDependencyGlobals,
    });
    await progressEstimator(writtenBundles, writeRollupBundlesMessage, {
      estimate: 1000,
    });
  } catch (error) {
    logError({
      failedAt: writeRollupBundlesMessage,
      message: errorAsObjectWithMessage(error).message,
      fullError: error,
    });
    throw EXIT_ON_ERROR;
  }
  /////////////////////////////////////

  /////////////////////////////////////
  // rollpkg build success!
  await progressEstimator(Promise.resolve(), 'ROLLPKG BUILD SUCCESSFUL 😁😘', {
    estimate: 0,
  });
  /////////////////////////////////////

  /////////////////////////////////////
  // calculate bundlephobia package stats
  try {
    // used to silence getPackageStats function
    const log = console.log;
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    console.log = () => {};
    const packageStatsPromise = getPackageStats(process.cwd());
    await progressEstimator(
      packageStatsPromise,
      `Calculating Bundlephobia stats for "${pkgJsonName}"`,
    );
    console.log = log;
    const packageStats = await packageStatsPromise;
    console.log(`Minified size: ${packageStats.size}`);
    console.log(`Minified and gzipped size: ${packageStats.gzip}`);
  } catch (error: unknown) {
    logError({
      failedAt: 'Calculating Bundlephobia package stats',
      message: `Bundlephobia Error: ${errorAsObjectWithMessage(error).message}`,
    });
  }
  /////////////////////////////////////
};

const exitCode = process.argv[2] === 'watch' ? 0 : 1;

rollpkg().catch((error) => {
  cleanDist().finally(() => {
    if (error === EXIT_ON_ERROR) {
      process.exit(exitCode);
    }
    throw error;
  });
});
