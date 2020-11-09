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
  (inputs: {
    pkgName: string;
    pkgSideEffects: boolean;
    pkgPeerDependencies: string[];
  }): {
    pkgPeerDependencyGlobals: { [key: string]: string };
    pkgUmdName: string;
    buildPlugins: Plugin[];
    prodBuildPlugins: Plugin[];
    outputPlugins: OutputPlugin[];
    outputProdPlugins: OutputPlugin[];
    treeshakeOptions: TreeshakingOptions;
  };
}

export const createRollupConfig: CreateRollupConfig = ({
  pkgName,
  pkgSideEffects,
  pkgPeerDependencies,
}) => {
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

  if (pkgSideEffects === false)
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
    moduleSideEffects: pkgSideEffects,
    propertyReadSideEffects: pkgSideEffects,
    tryCatchDeoptimization: pkgSideEffects,
    unknownGlobalSideEffects: pkgSideEffects,
  };

  return {
    pkgPeerDependencyGlobals,
    pkgUmdName,
    buildPlugins,
    prodBuildPlugins,
    outputPlugins,
    outputProdPlugins,
    treeshakeOptions,
  };
};
/////////////////////////////////////

/////////////////////////////////////
// rollup watch
interface RollupWatch {
  (input: {
    pkgName: string;
    pkgDependencies: string[];
    pkgPeerDependencies: string[];
    input: string;
    treeshakeOptions: TreeshakingOptions;
    buildPlugins: Plugin[];
    outputPlugins: OutputPlugin[];
  }): void;
}

export const rollupWatch: RollupWatch = ({
  pkgName,
  pkgDependencies,
  pkgPeerDependencies,
  input,
  treeshakeOptions,
  buildPlugins,
  outputPlugins,
}) => {
  process.on('SIGINT', function () {
    clearLine();
    console.log('ROLLPKG WATCH END 👀👋', '\n');
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
interface BuildBundles {
  (input: {
    input: string;
    pkgDependencies: string[];
    pkgPeerDependencies: string[];
    treeshakeOptions: TreeshakingOptions;
    buildPlugins: Plugin[];
    prodBuildPlugins: Plugin[];
  }): Promise<[RollupBuild, RollupBuild, RollupBuild, RollupBuild]>;
}

export const buildBundles: BuildBundles = ({
  input,
  pkgDependencies,
  pkgPeerDependencies,
  treeshakeOptions,
  buildPlugins,
  prodBuildPlugins,
}) =>
  Promise.all([
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
/////////////////////////////////////

/////////////////////////////////////
// write rollup bundles
interface WriteBundles {
  (input: {
    pkgName: string;
    bundle: RollupBuild;
    bundleProd: RollupBuild;
    bundleUmd: RollupBuild;
    bundleUmdProd: RollupBuild;
    outputPlugins: OutputPlugin[];
    outputProdPlugins: OutputPlugin[];
    pkgUmdName: string;
    pkgPeerDependencyGlobals: { [key: string]: string };
  }): Promise<
    [RollupOutput, RollupOutput, RollupOutput, RollupOutput, RollupOutput, void]
  >;
}

export const writeBundles: WriteBundles = ({
  pkgName,
  bundle,
  bundleProd,
  bundleUmd,
  bundleUmdProd,
  outputPlugins,
  outputProdPlugins,
  pkgUmdName,
  pkgPeerDependencyGlobals,
}) => {
  // prettier-ignore
  const cjsEntryContent = 
`'use strict';

if (process.env.NODE_ENV === 'production') {
  module.exports = require('./${pkgName}.cjs.production.js');
} else {
  module.exports = require('./${pkgName}.cjs.development.js');
}`;

  return Promise.all([
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
};
/////////////////////////////////////
