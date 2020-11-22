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
import sourcemaps from 'rollup-plugin-sourcemaps';
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
    pkgJsonUmdGlobalDependencies?: { [key: string]: string };
  }): {
    esmBuildPlugins: Plugin[];
    devBuildPlugins: Plugin[];
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
  pkgJsonUmdGlobalDependencies,
}) => {
  const buildPlugins: Plugin[] = [
    resolveRollup(),
    commonjs(),
    json(),
    rollupTypescript({
      // verbosity: 3, // use to debug
      tsconfigOverride: {
        compilerOptions: {
          // types: [] eliminates global type pollution in builds
          // and ensures that the only types allowed
          // are explicitly set in tsconfig or are imported into source files
          types: [],
          // rollup requires module to be es2015 or esnext
          module: 'esnext',
          // always generate *.d.ts files
          declaration: true,
          // always generate source maps which are used by rollup to create the actual source map
          // without this rollup creates blank source maps
          // note that the tsconfig "inlineSources" option has no effect on how rollup generates source maps
          // as rollup has it's own inline sources option, "sourcemapExcludeSources" which defaults to false
          sourceMap: true,
          // enforces convention that all files to be included in the build are in the src directory
          // this doesn't prevent other non-build files like *.mock.ts from being outside the src directory
          rootDir: './src',
        },
        // include the src directory and rollpkg types that stub process.env.NODE_ENV and __DEV__
        // so they can be used without polluting the global type space with all node types etc
        include: ['src', './node_modules/rollpkg/configs/types'],
        // exclude tests, mocks and snapshots
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
    sourcemaps(),
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

  const esmBuildPlugins = buildPlugins;

  const devBuildPlugins: Plugin[] = [
    ...buildPlugins,
    replace({ 'process.env.NODE_ENV': JSON.stringify('development') }),
  ];

  const prodBuildPlugins: Plugin[] = [
    ...buildPlugins,
    replace({ 'process.env.NODE_ENV': JSON.stringify('production') }),
  ];

  const outputPlugins: OutputPlugin[] = [];

  const outputProdPlugins: OutputPlugin[] = [
    terser({ format: { comments: false } }),
  ];

  const treeshakeOptions: TreeshakingOptions = {
    annotations: true,
    moduleSideEffects: pkgJsonSideEffects,
    propertyReadSideEffects: pkgJsonSideEffects,
    tryCatchDeoptimization: pkgJsonSideEffects,
    unknownGlobalSideEffects: pkgJsonSideEffects,
  };

  // umdExternalDependencies is an array of external module ids that rollup
  // will not in include in the build
  const umdExternalDependencies = pkgJsonUmdGlobalDependencies
    ? Object.keys(pkgJsonUmdGlobalDependencies)
    : pkgJsonPeerDependencyKeys;

  // umdDependencyGlobals is an object where the keys are the module ids (the umdExternalDependencies list)
  // and the values are what those modules will be available in the global scope as
  // for example { 'react-dom': 'ReactDOM' } because react-dom will be available on the window as ReactDOM
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
  const umdNameForPkg = convertKebabCaseToPascalCase(kebabCasePkgName);

  return {
    esmBuildPlugins,
    devBuildPlugins,
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
    esmBuildPlugins: Plugin[];
    devBuildPlugins: Plugin[];
    outputPlugins: OutputPlugin[];
  }): void;
}

export const rollupWatch: RollupWatch = ({
  kebabCasePkgName,
  pkgJsonDependencyKeys,
  pkgJsonPeerDependencyKeys,
  entryFile,
  treeshakeOptions,
  esmBuildPlugins,
  devBuildPlugins,
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

  const esmWatchOptions: RollupWatchOptions = {
    external: [...pkgJsonDependencyKeys, ...pkgJsonPeerDependencyKeys],
    input: entryFile,
    treeshake: treeshakeOptions,
    plugins: esmBuildPlugins,
    output: {
      file: `dist/${kebabCasePkgName}.esm.js`,
      format: 'esm',
      sourcemap: true,
      plugins: outputPlugins,
    },
  };

  const cjsDevWatchOptions: RollupWatchOptions = {
    external: [...pkgJsonDependencyKeys, ...pkgJsonPeerDependencyKeys],
    input: entryFile,
    treeshake: treeshakeOptions,
    plugins: devBuildPlugins,
    output: {
      file: `dist/${kebabCasePkgName}.cjs.js`,
      format: 'cjs',
      sourcemap: true,
      plugins: outputPlugins,
    },
  };

  // in watch mode only create esm and cjs dev builds
  const watcher = watch([esmWatchOptions, cjsDevWatchOptions]);

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
    esmBuildPlugins: Plugin[];
    devBuildPlugins: Plugin[];
    prodBuildPlugins: Plugin[];
  }): Promise<
    [RollupBuild, RollupBuild, RollupBuild, RollupBuild, RollupBuild]
  >;
}

export const createBundles: CreateBundles = ({
  entryFile,
  pkgJsonDependencyKeys,
  pkgJsonPeerDependencyKeys,
  umdExternalDependencies,
  treeshakeOptions,
  esmBuildPlugins,
  devBuildPlugins,
  prodBuildPlugins,
}) =>
  Promise.all([
    // esm build
    rollup({
      external: [...pkgJsonDependencyKeys, ...pkgJsonPeerDependencyKeys],
      input: entryFile,
      treeshake: treeshakeOptions,
      plugins: esmBuildPlugins,
    }),

    // cjs development build
    rollup({
      external: [...pkgJsonDependencyKeys, ...pkgJsonPeerDependencyKeys],
      input: entryFile,
      treeshake: treeshakeOptions,
      plugins: devBuildPlugins,
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
      plugins: devBuildPlugins,
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
    cwd: string;
    kebabCasePkgName: string;
    bundleEsm: RollupBuild;
    bundleCjsDev: RollupBuild;
    bundleCjsProd: RollupBuild;
    bundleUmdDev: RollupBuild;
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
  cwd,
  kebabCasePkgName,
  bundleEsm,
  bundleCjsDev,
  bundleCjsProd,
  bundleUmdDev,
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
}
`;

  return Promise.all([
    bundleEsm.write({
      file: `dist/${kebabCasePkgName}.esm.js`,
      format: 'esm',
      sourcemap: true,
      sourcemapExcludeSources: false,
      plugins: outputPlugins,
    }),

    bundleCjsDev.write({
      file: `dist/${kebabCasePkgName}.cjs.development.js`,
      format: 'cjs',
      sourcemap: true,
      sourcemapExcludeSources: false,
      plugins: outputPlugins,
    }),

    bundleCjsProd.write({
      file: `dist/${kebabCasePkgName}.cjs.production.js`,
      format: 'cjs',
      compact: true,
      sourcemap: true,
      sourcemapExcludeSources: false,
      plugins: outputProdPlugins,
    }),

    bundleUmdDev.write({
      file: `dist/${kebabCasePkgName}.umd.development.js`,
      format: 'umd',
      name: umdNameForPkg,
      globals: umdDependencyGlobals,
      sourcemap: true,
      sourcemapExcludeSources: false,
      plugins: outputPlugins,
    }),

    bundleUmdProd.write({
      file: `dist/${kebabCasePkgName}.umd.production.js`,
      format: 'umd',
      compact: true,
      name: umdNameForPkg,
      globals: umdDependencyGlobals,
      sourcemap: true,
      sourcemapExcludeSources: false,
      plugins: outputProdPlugins,
    }),

    fs.writeFile(
      resolve(cwd, 'dist', `${kebabCasePkgName}.cjs.js`),
      cjsEntryContent,
      'utf8',
    ),
  ]);
};
/////////////////////////////////////
