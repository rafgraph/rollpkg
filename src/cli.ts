#!/usr/bin/env node

import { resolve } from 'path';
import * as fs from 'fs-extra';
import {
  rollup,
  watch,
  Plugin,
  OutputPlugin,
  TreeshakingOptions,
  RollupWatchOptions,
} from 'rollup';
import resolveRollup from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import rollupTypescript from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import invariantPlugin from 'rollup-plugin-invariant';
import { terser } from 'rollup-plugin-terser';
// babel only used to add /*#__PURE__*/ annotations for function calls using babel-plugin-annotate-pure-calls
import babel from '@rollup/plugin-babel';
import { DEFAULT_EXTENSIONS } from '@babel/core';
import { getPackageStats } from 'package-build-stats';
import { PackageJson } from 'type-fest';

import {
  progressEstimator,
  cleanDist,
  errorAsObjectWithMessage,
  logError,
  logRollpkgError,
  logTsError,
  EXIT_ON_ERROR,
  invariant,
  convertPkgNameToKebabCase,
  convertKebabCaseToPascalCase,
  fileExists,
  clearConsole,
  clearLine,
} from './utils';

const rollpkg = async () => {
  /////////////////////////////////////
  // clean dist
  const cleanDistMessage = 'Clean dist folder';
  try {
    const clean = cleanDist();
    await progressEstimator(clean, cleanDistMessage);
  } catch (error) {
    logError({
      failedAt: cleanDistMessage,
      message: errorAsObjectWithMessage(error).message,
      fullError: error,
    });
    throw EXIT_ON_ERROR;
  }

  /////////////////////////////////////
  // rollpkg invariants and configuration
  console.log('Checking rollpkg mode...');

  const args = process.argv.slice(2);
  invariant(
    args.length === 1 && (args[0] === 'build' || args[0] === 'watch'),
    `rollpkg requires a "build" or "watch" command with no arguments, received: "${args.join(
      ' ',
    )}"`,
  );

  const watchMode = args[0] === 'watch';

  console.log('Checking package.json...');

  let pkgJson: PackageJson;
  try {
    const readPkgJson = await fs.readFile(
      resolve(process.cwd(), 'package.json'),
      'utf8',
    );
    pkgJson = JSON.parse(readPkgJson) as PackageJson;
  } catch (e) {
    logRollpkgError({
      message: `Cannot read package.json at ${resolve(
        process.cwd(),
        'package.json',
      )}`,
    });
    throw EXIT_ON_ERROR;
  }
  invariant(
    typeof pkgJson.name === 'string',
    `"name" field is required in package.json and needs to be a string, value found: ${pkgJson.name}`,
  );
  // type cast as string because previous invariant check makes this code
  // unreachable if pkgJson.name is not a string, which TS doesn't understand
  const pkgName = convertPkgNameToKebabCase(pkgJson.name as string);

  const mainShouldBe = `dist/${pkgName}.cjs.js`;
  const moduleShouldBe = `dist/${pkgName}.esm.js`;
  const typesShouldBe = `dist/index.d.ts`;
  invariant(
    pkgJson.main === mainShouldBe,
    `The value of "main" in package.json needs to be "${mainShouldBe}", value found: "${pkgJson.main}"`,
  );
  invariant(
    pkgJson.module === moduleShouldBe,
    `The value of "module" in package.json needs to be "${moduleShouldBe}", value found: "${pkgJson.module}"`,
  );
  invariant(
    pkgJson.types === typesShouldBe,
    `The value of "types" in package.json needs to be "${typesShouldBe}", value found: "${pkgJson.types}"`,
  );
  invariant(
    typeof pkgJson.sideEffects === 'boolean',
    `"sideEffects" field is required in package.json and needs to be a boolean, value found: ${pkgJson.sideEffects}`,
  );
  // type cast as boolean because previous invariant check makes this code
  // unreachable if pkgJson.name is not a string, which TS doesn't understand
  const pkgSideEffects = pkgJson.sideEffects as boolean;

  console.log('Checking for tsconfig...');

  try {
    await fs.readFile(resolve(process.cwd(), 'tsconfig.json'), 'utf8');
  } catch (e) {
    logRollpkgError({
      message: `Cannot read tsconfig.json at ${resolve(
        process.cwd(),
        'tsconfig.json',
      )}`,
    });
    throw EXIT_ON_ERROR;
  }

  console.log('Checking for index.ts or index.tsx entry file...');

  const srcDir = resolve(process.cwd(), 'src');
  const indexTsExists = await fileExists(srcDir, 'index.ts');
  const indexTsxExists = await fileExists(srcDir, 'index.tsx');

  invariant(
    !(indexTsExists && indexTsxExists),
    `Cannot have both index.ts and index.tsx files in ${srcDir}`,
  );
  invariant(
    indexTsExists || indexTsxExists,
    `Cannot find index.ts or index.tsx entry file in ${srcDir}`,
  );

  const input = resolve(srcDir, indexTsExists ? 'index.ts' : 'index.tsx');

  console.log('Creating up rollup config...');

  const pkgDependencies = pkgJson.dependencies
    ? Object.keys(pkgJson.dependencies)
    : [];
  const pkgPeerDependencies = pkgJson.peerDependencies
    ? Object.keys(pkgJson.peerDependencies)
    : [];

  /////////////////////////////////////
  // create rollup config

  const pkgPeerDependencyGlobals: { [key: string]: string } = {};
  pkgPeerDependencies.forEach((peerDep) => {
    pkgPeerDependencyGlobals[peerDep] = convertKebabCaseToPascalCase(
      convertPkgNameToKebabCase(peerDep),
    );
  });
  const pkgUmdName = convertKebabCaseToPascalCase(pkgName);

  const buildPlugins: Plugin[] = [
    resolveRollup(),
    commonjs(),
    json(),
    rollupTypescript({
      // verbosity: 3, // use to debug
      tsconfigOverride: {
        compilerOptions: {
          types: [],
          rootDir: './src',
        },
        include: ['src', './node_modules/rollpkg/configs/types'],
        exclude: [
          '**/__tests__',
          '**/__mocks__',
          '**/__snapshots__',
          '**/*.test.*',
          '**/*.spec.*',
          '**/*.mock.*',
        ],
      },
      include: ['**/*.ts+(|x)', '**/*.js+(|x)'],
    }),
    replace({ __DEV__: "process.env.NODE_ENV !== 'production'" }),
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore invariantPlugin is missing name, this isn't causing an actual error AFAIK, remove when pr is released: https://github.com/apollographql/invariant-packages/pull/45
    invariantPlugin(),
  ];

  if (pkgSideEffects === false)
    buildPlugins.push(
      babel({
        babelHelpers: 'bundled',
        extensions: [...DEFAULT_EXTENSIONS, '.ts', '.tsx'],
        plugins: ['annotate-pure-calls'],
      }),
    );

  const prodBuildPlugins: Plugin[] = [
    ...buildPlugins,
    replace({ 'process.env.NODE_ENV': JSON.stringify('production') }),
  ];

  const outputPlugins: OutputPlugin[] = [];

  const outputProdPlugins: OutputPlugin[] = [terser()];

  const treeshakeOptions: TreeshakingOptions = {
    annotations: true,
    moduleSideEffects: pkgSideEffects,
    propertyReadSideEffects: pkgSideEffects,
    tryCatchDeoptimization: pkgSideEffects,
    unknownGlobalSideEffects: pkgSideEffects,
  };

  /////////////////////////////////////
  // create and write rollup builds

  if (watchMode) {
    process.on('SIGINT', function () {
      clearLine();
      console.log('\nRollpkg watch END');
      process.exit(0);
    });

    const watchOptions: RollupWatchOptions = {
      external: [...pkgDependencies, ...pkgPeerDependencies],
      input,
      treeshake: treeshakeOptions,
      plugins: buildPlugins,
      output: [
        {
          file: `dist/${pkgName}.esm.js`,
          format: 'esm',
          sourcemap: true,
          plugins: outputPlugins,
        },
        {
          file: `dist/${pkgName}.cjs.js`,
          format: 'cjs',
          sourcemap: true,
          plugins: outputPlugins,
        },
      ],
    };

    const watcher = watch(watchOptions);

    watcher.on('event', (event) => {
      switch (event.code) {
        case 'START':
          break;
        case 'BUNDLE_START':
          clearConsole();
          console.log('Rollpkg building...');
          break;
        case 'BUNDLE_END':
          clearConsole();
          console.log('Rollpkg build successful!');
          console.log('\nWatching for changes...');
          break;
        case 'END':
          break;
        case 'ERROR':
          clearConsole();
          if (event.error.plugin === 'rpt2') {
            logTsError({ message: event.error.message });
          } else {
            logError({ fullError: event.error });
          }
          console.log('\nWatching for changes...');
          break;
      }
    });
  } else {
    try {
      const buildBundles = Promise.all([
        // esm and cjs development builds
        rollup({
          external: [...pkgDependencies, ...pkgPeerDependencies],
          input,
          treeshake: treeshakeOptions,
          plugins: buildPlugins,
        }),

        // cjs production build
        rollup({
          external: [...pkgDependencies, ...pkgPeerDependencies],
          input,
          treeshake: treeshakeOptions,
          plugins: prodBuildPlugins,
        }),

        // umd development build
        rollup({
          external: [...pkgPeerDependencies],
          input,
          treeshake: treeshakeOptions,
          plugins: buildPlugins,
        }),

        // umd production build
        rollup({
          external: [...pkgPeerDependencies],
          input,
          treeshake: treeshakeOptions,
          plugins: prodBuildPlugins,
        }),
      ]);

      await progressEstimator(
        buildBundles,
        `Creating builds for "${pkgJson.name}": esm, cjs, umd`,
        { estimate: 5000 },
      );

      const [bundle, bundleProd, bundleUmd, bundleUmdProd] = await buildBundles;

      // prettier-ignore
      const cjsEntryContent = 
`'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./${pkgName}.cjs.production.js');
} else {
  module.exports = require('./${pkgName}.cjs.development.js');
}`;

      const writeBuilds = Promise.all([
        bundle.write({
          file: `dist/${pkgName}.esm.js`,
          format: 'esm',
          sourcemap: true,
          plugins: outputPlugins,
        }),

        bundle.write({
          file: `dist/${pkgName}.cjs.development.js`,
          format: 'cjs',
          sourcemap: true,
          plugins: outputPlugins,
        }),

        bundleProd.write({
          file: `dist/${pkgName}.cjs.production.js`,
          format: 'cjs',
          sourcemap: true,
          plugins: outputProdPlugins,
        }),

        bundleUmd.write({
          file: `dist/${pkgName}.umd.development.js`,
          format: 'umd',
          name: pkgUmdName,
          globals: pkgPeerDependencyGlobals,
          sourcemap: true,
          plugins: outputPlugins,
        }),

        bundleUmdProd.write({
          file: `dist/${pkgName}.umd.production.js`,
          format: 'umd',
          name: pkgUmdName,
          globals: pkgPeerDependencyGlobals,
          sourcemap: true,
          plugins: outputProdPlugins,
        }),
        fs.writeFile(
          resolve(process.cwd(), 'dist', `${pkgName}.cjs.js`),
          cjsEntryContent,
          'utf8',
        ),
      ]);
      await progressEstimator(
        writeBuilds,
        `Writing builds for "${pkgJson.name}": esm, cjs, umd`,
        { estimate: 1000 },
      );

      /////////////////////////////////////
      // previous way of creating builds

      //       const bundle = rollup({
      //         external: [...pkgDependencies, ...pkgPeerDependencies],
      //         input,
      //         treeshake: treeshakeOptions,
      //         plugins: buildPlugins,
      //       });

      //       const bundleProd = rollup({
      //         external: [...pkgDependencies, ...pkgPeerDependencies],
      //         input,
      //         treeshake: treeshakeOptions,
      //         plugins: prodBuildPlugins,
      //       });

      //       const bundleUmd = rollup({
      //         external: [...pkgPeerDependencies],
      //         input,
      //         treeshake: treeshakeOptions,
      //         plugins: buildPlugins,
      //       });

      //       const bundleUmdProd = rollup({
      //         external: [...pkgPeerDependencies],
      //         input,
      //         treeshake: treeshakeOptions,
      //         plugins: prodBuildPlugins,
      //       });

      //       const esm = (await bundle).write({
      //         file: `dist/${pkgName}.esm.js`,
      //         format: 'esm',
      //         sourcemap: true,
      //         plugins: outputPlugins,
      //       });

      //       const cjs = (await bundle).write({
      //         file: `dist/${pkgName}.cjs.development.js`,
      //         format: 'cjs',
      //         sourcemap: true,
      //         plugins: outputPlugins,
      //       });

      //       const cjsProd = (await bundleProd).write({
      //         file: `dist/${pkgName}.cjs.production.js`,
      //         format: 'cjs',
      //         sourcemap: true,
      //         plugins: outputProdPlugins,
      //       });

      //       const umd = (await bundleUmd).write({
      //         file: `dist/${pkgName}.umd.development.js`,
      //         format: 'umd',
      //         name: pkgUmdName,
      //         globals: pkgPeerDependencyGlobals,
      //         sourcemap: true,
      //         plugins: outputPlugins,
      //       });

      //       const umdProd = (await bundleUmdProd).write({
      //         file: `dist/${pkgName}.umd.production.js`,
      //         format: 'umd',
      //         name: pkgUmdName,
      //         globals: pkgPeerDependencyGlobals,
      //         sourcemap: true,
      //         plugins: outputProdPlugins,
      //       });

      //       // prettier-ignore
      //       const cjsEntryContent =
      // `'use strict';

      // if (process.env.NODE_ENV === 'production') {
      //   module.exports = require('./${pkgName}.cjs.production.js');
      // } else {
      //   module.exports = require('./${pkgName}.cjs.development.js');
      // }`;

      //       const cjsEntryFile = fs.writeFile(
      //         resolve(process.cwd(), 'dist', `${pkgName}.cjs.js`),
      //         cjsEntryContent,
      //         'utf8',
      //       );

      //       // eslint-disable-next-line @typescript-eslint/no-floating-promises
      //       await esm, cjs, cjsProd, umd, umdProd, cjsEntryFile;
      /////////////////////////////////////
    } catch (error) {
      const errorAsObject = errorAsObjectWithMessage(error);
      if (errorAsObject.plugin === 'rpt2') {
        logTsError({ message: errorAsObject.message });
      } else {
        logError({
          failedAt: 'Writing builds for ...',
          fullError: error,
        });
      }
      throw EXIT_ON_ERROR;
    }

    await progressEstimator(Promise.resolve(), 'ROLLPKG BUILD SUCCESS 😁😘', {
      estimate: 0,
    });

    try {
      // used to silence getPackageStats function
      const log = console.log;
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      console.log = () => {};
      const packageStatsPromise = getPackageStats(process.cwd());
      await progressEstimator(
        packageStatsPromise,
        `Calculating Bundlephobia stats for "${pkgJson.name}"`,
      );
      console.log = log;
      const packageStats = await packageStatsPromise;
      console.log(`Minified size: ${packageStats.size}`);
      console.log(`Minified and gzipped size: ${packageStats.gzip}`);
    } catch (error: unknown) {
      logError({
        failedAt: 'Calculate Bundlephobia package stats',
        fullError: errorAsObjectWithMessage(error).message,
      });
    }
  }
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
