import { resolve } from 'path';
import * as fs from 'fs-extra';
import {
  rollup,
  watch,
  Plugin,
  OutputPlugin,
  TreeshakingOptions,
  RollupWatchOptions,
  RollupBuild,
  RollupOutput,
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

import {
  clearLine,
  clearConsole,
  convertPkgNameToKebabCase,
  convertKebabCaseToPascalCase,
} from './utils';
import { logTsError, logError } from './errorUtils';

/////////////////////////////////////
// create rollup config
interface CreateRollupConfig {
  (input: {
    kebabCasePkgName: string;
    pkgJsonSideEffects: boolean;
    pkgJsonPeerDependencyKeys: string[];
    pkgJsonUmdName?: string;
    pkgJsonUmdGlobalDependencies?: { [key: string]: string };
  }): {
    buildPlugins: Plugin[];
    prodBuildPlugins: Plugin[];
    outputPlugins: OutputPlugin[];
    outputProdPlugins: OutputPlugin[];
    treeshakeOptions: TreeshakingOptions;
    umdNameForPkg: string;
    umdExternalDependencies: string[];
    umdDependencyGlobals: { [key: string]: string };
  };
}

export const createRollupConfig: CreateRollupConfig = ({
  kebabCasePkgName,
  pkgJsonSideEffects,
  pkgJsonPeerDependencyKeys,
  pkgJsonUmdName,
  pkgJsonUmdGlobalDependencies,
}) => {
  const umdExternalDependencies = pkgJsonUmdGlobalDependencies
    ? Object.keys(pkgJsonUmdGlobalDependencies)
    : pkgJsonPeerDependencyKeys;
  let umdDependencyGlobals: { [key: string]: string };
  if (pkgJsonUmdGlobalDependencies) {
    umdDependencyGlobals = pkgJsonUmdGlobalDependencies;
  } else {
    umdDependencyGlobals = {};
    pkgJsonPeerDependencyKeys.forEach((peerDep) => {
      umdDependencyGlobals[peerDep] = convertKebabCaseToPascalCase(
        convertPkgNameToKebabCase(peerDep),
      );
    });
  }
  const umdNameForPkg =
    pkgJsonUmdName || convertKebabCaseToPascalCase(kebabCasePkgName);

  const buildPlugins: Plugin[] = [
    resolveRollup(),
    commonjs(),
    json(),
    rollupTypescript({
      // verbosity: 3, // use to debug
      tsconfigOverride: {
        compilerOptions: {
          types: [],
          declaration: true,
          sourceMap: true,
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

  if (pkgJsonSideEffects === false)
    buildPlugins.push(
      babel({
        babelHelpers: 'bundled',
        extensions: [...DEFAULT_EXTENSIONS, '.ts', '.tsx'],
        plugins: ['annotate-pure-calls'],
        skipPreflightCheck: true,
        configFile: false,
        babelrc: false,
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
    moduleSideEffects: pkgJsonSideEffects,
    propertyReadSideEffects: pkgJsonSideEffects,
    tryCatchDeoptimization: pkgJsonSideEffects,
    unknownGlobalSideEffects: pkgJsonSideEffects,
  };

  return {
    buildPlugins,
    prodBuildPlugins,
    outputPlugins,
    outputProdPlugins,
    treeshakeOptions,
    umdNameForPkg,
    umdExternalDependencies,
    umdDependencyGlobals,
  };
};
/////////////////////////////////////

/////////////////////////////////////
// rollup watch
interface RollupWatch {
  (input: {
    kebabCasePkgName: string;
    pkgJsonDependencyKeys: string[];
    pkgJsonPeerDependencyKeys: string[];
    entryFile: string;
    treeshakeOptions: TreeshakingOptions;
    buildPlugins: Plugin[];
    outputPlugins: OutputPlugin[];
  }): void;
}

export const rollupWatch: RollupWatch = ({
  kebabCasePkgName,
  pkgJsonDependencyKeys,
  pkgJsonPeerDependencyKeys,
  entryFile,
  treeshakeOptions,
  buildPlugins,
  outputPlugins,
}) => {
  // exit 0 from watch mode on ctrl-c (SIGINT) etc so can chain npm scripts: rollpkg watch && ...
  // the ... will run after rollpkg watch only if it exits 0
  const exitWatch = () => {
    clearLine();
    console.log('ROLLPKG WATCH END 👀👋', '\n');
    process.exit(0);
  };
  process.on('SIGINT', exitWatch);
  process.on('SIGTERM', exitWatch);
  process.on('SIGBREAK', exitWatch);

  // in watch mode only create esm and cjs dev builds
  const watchOptions: RollupWatchOptions = {
    external: [...pkgJsonDependencyKeys, ...pkgJsonPeerDependencyKeys],
    input: entryFile,
    treeshake: treeshakeOptions,
    plugins: buildPlugins,
    output: [
      {
        file: `dist/${kebabCasePkgName}.esm.js`,
        format: 'esm',
        sourcemap: true,
        plugins: outputPlugins,
      },
      {
        file: `dist/${kebabCasePkgName}.cjs.js`,
        format: 'cjs',
        sourcemap: true,
        plugins: outputPlugins,
      },
    ],
  };

  const watcher = watch(watchOptions);

  const earth = ['🌎', '🌏', '🌍'];
  let currentEarth = 2;
  const rotateEarth = () => {
    if (currentEarth === 2) currentEarth = 0;
    else {
      currentEarth = currentEarth + 1;
    }
    return earth[currentEarth];
  };

  watcher.on('event', (event) => {
    switch (event.code) {
      case 'START':
        break;
      case 'BUNDLE_START':
        clearConsole();
        console.log(`${rotateEarth()} Rollpkg building...`, '\n');
        break;
      case 'BUNDLE_END':
        clearConsole();
        console.log(`${earth[currentEarth]} Rollpkg build successful!`, '\n');
        console.log('Watching for changes...', '\n');
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
        console.log('Watching for changes...', '\n');
        break;
    }
  });
};
/////////////////////////////////////

/////////////////////////////////////
// create rollup bundles
interface CreateBundles {
  (input: {
    entryFile: string;
    pkgJsonDependencyKeys: string[];
    pkgJsonPeerDependencyKeys: string[];
    umdExternalDependencies: string[];
    treeshakeOptions: TreeshakingOptions;
    buildPlugins: Plugin[];
    prodBuildPlugins: Plugin[];
  }): Promise<[RollupBuild, RollupBuild, RollupBuild, RollupBuild]>;
}

export const createBundles: CreateBundles = ({
  entryFile,
  pkgJsonDependencyKeys,
  pkgJsonPeerDependencyKeys,
  umdExternalDependencies,
  treeshakeOptions,
  buildPlugins,
  prodBuildPlugins,
}) =>
  Promise.all([
    // esm and cjs development builds
    rollup({
      external: [...pkgJsonDependencyKeys, ...pkgJsonPeerDependencyKeys],
      input: entryFile,
      treeshake: treeshakeOptions,
      plugins: buildPlugins,
    }),

    // cjs production build
    rollup({
      external: [...pkgJsonDependencyKeys, ...pkgJsonPeerDependencyKeys],
      input: entryFile,
      treeshake: treeshakeOptions,
      plugins: prodBuildPlugins,
    }),

    // umd development build
    rollup({
      external: umdExternalDependencies,
      input: entryFile,
      treeshake: treeshakeOptions,
      plugins: buildPlugins,
    }),

    // umd production build
    rollup({
      external: umdExternalDependencies,
      input: entryFile,
      treeshake: treeshakeOptions,
      plugins: prodBuildPlugins,
    }),
  ]);
/////////////////////////////////////

/////////////////////////////////////
// write rollup bundles
interface WriteBundles {
  (input: {
    kebabCasePkgName: string;
    bundle: RollupBuild;
    bundleProd: RollupBuild;
    bundleUmd: RollupBuild;
    bundleUmdProd: RollupBuild;
    outputPlugins: OutputPlugin[];
    outputProdPlugins: OutputPlugin[];
    umdNameForPkg: string;
    umdDependencyGlobals: { [key: string]: string };
  }): Promise<
    [RollupOutput, RollupOutput, RollupOutput, RollupOutput, RollupOutput, void]
  >;
}

export const writeBundles: WriteBundles = ({
  kebabCasePkgName,
  bundle,
  bundleProd,
  bundleUmd,
  bundleUmdProd,
  outputPlugins,
  outputProdPlugins,
  umdNameForPkg,
  umdDependencyGlobals,
}) => {
  // prettier-ignore
  const cjsEntryContent = 
`'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./${kebabCasePkgName}.cjs.production.js');
} else {
  module.exports = require('./${kebabCasePkgName}.cjs.development.js');
}`;

  return Promise.all([
    bundle.write({
      file: `dist/${kebabCasePkgName}.esm.js`,
      format: 'esm',
      sourcemap: true,
      plugins: outputPlugins,
    }),

    bundle.write({
      file: `dist/${kebabCasePkgName}.cjs.development.js`,
      format: 'cjs',
      sourcemap: true,
      plugins: outputPlugins,
    }),

    bundleProd.write({
      file: `dist/${kebabCasePkgName}.cjs.production.js`,
      format: 'cjs',
      sourcemap: true,
      plugins: outputProdPlugins,
    }),

    bundleUmd.write({
      file: `dist/${kebabCasePkgName}.umd.development.js`,
      format: 'umd',
      name: umdNameForPkg,
      globals: umdDependencyGlobals,
      sourcemap: true,
      plugins: outputPlugins,
    }),

    bundleUmdProd.write({
      file: `dist/${kebabCasePkgName}.umd.production.js`,
      format: 'umd',
      name: umdNameForPkg,
      globals: umdDependencyGlobals,
      sourcemap: true,
      plugins: outputProdPlugins,
    }),

    fs.writeFile(
      resolve(process.cwd(), 'dist', `${kebabCasePkgName}.cjs.js`),
      cjsEntryContent,
      'utf8',
    ),
  ]);
};
/////////////////////////////////////
