#!/usr/bin/env node

import { promises as fs } from 'fs';
import { resolve, join } from 'path';
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
  rollpkgError,
  invariant,
  tsError,
  rollupError,
  logToConsole,
  convertPkgNameToKebabCase,
  convertKebabCaseToPascalCase,
  fileExists,
  rimraf,
  setWatchModeForErrorHandling,
} from './utils';

const rollpkg = async () => {
  await rimraf('dist');

  const args = process.argv.slice(2);
  invariant(
    args.length === 0 || (args.length === 1 && args[0] === '--watch'),
    `rollpkg only accepts a "--watch" argument, or no arguments, received: "${args.join(
      ' ',
    )}"`,
  );

  const watchMode = args[0] === '--watch';
  setWatchModeForErrorHandling(watchMode);

  let pkgJson: PackageJson;
  try {
    const readPkgJson = (await fs.readFile(
      resolve(process.cwd(), 'package.json'),
      'utf8',
    )) as string;
    pkgJson = JSON.parse(readPkgJson);
  } catch (e) {
    rollpkgError(
      `Cannot read package.json at ${resolve(process.cwd(), 'package.json')}`,
    );
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

  try {
    await fs.readFile(resolve(process.cwd(), 'tsconfig.json'), 'utf8');
  } catch (e) {
    rollpkgError(
      `Cannot read tsconfig.json at ${resolve(process.cwd(), 'tsconfig.json')}`,
    );
  }

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

  const pkgDependencies = pkgJson.dependencies
    ? Object.keys(pkgJson.dependencies)
    : [];
  const pkgPeerDependencies = pkgJson.peerDependencies
    ? Object.keys(pkgJson.peerDependencies)
    : [];
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

  if (watchMode) {
    process.on('SIGINT', function () {
      logToConsole('Rollpkg watch END');
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
          logToConsole(event);
          break;
        case 'BUNDLE_END':
          logToConsole(event);
          break;
        case 'END':
          break;
        case 'ERROR':
          if (event.error.plugin === 'rpt2') {
            tsError(event.error.message);
          } else {
            rollupError(event.error);
          }
          break;
      }
    });
  } else {
    try {
      logToConsole('Rollpkg building...');

      const bundle = rollup({
        external: [...pkgDependencies, ...pkgPeerDependencies],
        input,
        treeshake: treeshakeOptions,
        plugins: buildPlugins,
      });

      const bundleProd = rollup({
        external: [...pkgDependencies, ...pkgPeerDependencies],
        input,
        treeshake: treeshakeOptions,
        plugins: prodBuildPlugins,
      });

      const bundleUmd = rollup({
        external: [...pkgPeerDependencies],
        input,
        treeshake: treeshakeOptions,
        plugins: buildPlugins,
      });

      const bundleUmdProd = rollup({
        external: [...pkgPeerDependencies],
        input,
        treeshake: treeshakeOptions,
        plugins: prodBuildPlugins,
      });

      const esm = (await bundle).write({
        file: `dist/${pkgName}.esm.js`,
        format: 'esm',
        sourcemap: true,
        plugins: outputPlugins,
      });

      const cjs = (await bundle).write({
        file: `dist/${pkgName}.cjs.development.js`,
        format: 'cjs',
        sourcemap: true,
        plugins: outputPlugins,
      });

      const cjsProd = (await bundleProd).write({
        file: `dist/${pkgName}.cjs.production.js`,
        format: 'cjs',
        sourcemap: true,
        plugins: outputProdPlugins,
      });

      const umd = (await bundleUmd).write({
        file: `dist/${pkgName}.umd.development.js`,
        format: 'umd',
        name: pkgUmdName,
        globals: pkgPeerDependencyGlobals,
        sourcemap: true,
        plugins: outputPlugins,
      });

      const umdProd = (await bundleUmdProd).write({
        file: `dist/${pkgName}.umd.production.js`,
        format: 'umd',
        name: pkgUmdName,
        globals: pkgPeerDependencyGlobals,
        sourcemap: true,
        plugins: outputProdPlugins,
      });

      // prettier-ignore
      const cjsEntryContent = 
`'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./${pkgName}.cjs.production.js');
} else {
  module.exports = require('./${pkgName}.cjs.development.js');
}`;
      const cjsEntryFile = fs.writeFile(
        resolve(process.cwd(), 'dist', `${pkgName}.cjs.js`),
        cjsEntryContent,
        'utf8',
      );

      await esm, cjs, cjsProd, umd, umdProd, cjsEntryFile;
      logToConsole('Rollpkg build SUCCESS!');
      logToConsole('Calculating Bundlephobia package size...');
      const results = await getPackageStats(process.cwd());
      logToConsole(results);
    } catch (e) {
      if (e.plugin === 'rpt2') {
        tsError(e.message);
      } else {
        rollupError(e);
      }
    }
    logToConsole('Rollpkg END');
  }
};

rollpkg();
