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
import nodeResolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json';
import rollupTypescript from 'rollup-plugin-typescript2';
import replace from '@rollup/plugin-replace';
import sourcemaps from 'rollup-plugin-sourcemaps';
import { terser } from 'rollup-plugin-terser';

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
    tsconfigPath?: string;
    addUmdBuild: boolean;
    kebabCasePkgName: string;
    pkgJsonSideEffects: boolean;
    pkgJsonPeerDependencyKeys: string[];
    pkgJsonUmdGlobalDependencies?: { [key: string]: string };
  }): {
    buildPluginsDefault: Plugin[];
    buildPluginsWithNodeEnvDevelopment: Plugin[];
    buildPluginsWithNodeEnvProduction: Plugin[];
    outputPluginsDefault: OutputPlugin[];
    outputPluginsProduction: OutputPlugin[];
    treeshakeOptions: TreeshakingOptions;
    umdNameForPkg?: string;
    umdExternalDependencies?: string[];
    umdDependencyGlobals?: { [key: string]: string };
  };
}

export const createRollupConfig: CreateRollupConfig = ({
  tsconfigPath,
  addUmdBuild,
  kebabCasePkgName,
  pkgJsonSideEffects,
  pkgJsonPeerDependencyKeys,
  pkgJsonUmdGlobalDependencies,
}) => {
  const buildPluginsDefault: Plugin[] = [
    nodeResolve({ preferBuiltins: true }),
    commonjs(),
    json(),
    rollupTypescript({
      // verbosity: 3, // use to debug
      tsconfigDefaults: {
        compilerOptions: {
          target: 'ES2018',
          // types: [] eliminates global type pollution in builds
          // and ensures that the only types allowed
          // are explicitly set in tsconfig or are imported into source files
          types: [],
          // generate *.d.ts files by default
          declaration: true,
          // enforces convention that all files to be included in the build are in the src directory
          // this doesn't prevent other non-build files like *.mock.ts from being outside the src directory
          rootDir: './src',
        },
        // include rollpkg types that stub process.env.NODE_ENV and __DEV__
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
      tsconfig: tsconfigPath,
      tsconfigOverride: {
        compilerOptions: {
          // rollup requires module to be es2015 or esnext
          module: 'ESNext',
          // always generate source maps which are used by rollup to create the actual source map
          // without this rollup creates blank source maps
          // note that the tsconfig "inlineSources" option has no effect on how rollup generates source maps
          // as rollup has it's own inline sources option, "sourcemapExcludeSources" which defaults to false
          sourceMap: true,
        },
      },
      include: ['**/*.ts+(|x)', '**/*.js+(|x)'],
    }),
    sourcemaps(),
    replace({ __DEV__: "process.env.NODE_ENV !== 'production'" }),
  ];

  const buildPluginsWithNodeEnvDevelopment: Plugin[] = [
    ...buildPluginsDefault,
    replace({ 'process.env.NODE_ENV': JSON.stringify('development') }),
  ];

  const buildPluginsWithNodeEnvProduction: Plugin[] = [
    ...buildPluginsDefault,
    replace({ 'process.env.NODE_ENV': JSON.stringify('production') }),
  ];

  const outputPluginsDefault: OutputPlugin[] = [];

  const outputPluginsProduction: OutputPlugin[] = [
    terser({ format: { comments: false } }),
  ];

  const treeshakeOptions: TreeshakingOptions = {
    annotations: true,
    moduleSideEffects: pkgJsonSideEffects,
    propertyReadSideEffects: pkgJsonSideEffects,
    tryCatchDeoptimization: pkgJsonSideEffects,
    unknownGlobalSideEffects: pkgJsonSideEffects,
  };

  let umdExternalDependencies;
  let umdDependencyGlobals: { [key: string]: string } | undefined;
  let umdNameForPkg;

  if (addUmdBuild) {
    // umdExternalDependencies is an array of external module ids that rollup
    // will not include in the build
    umdExternalDependencies = pkgJsonUmdGlobalDependencies
      ? Object.keys(pkgJsonUmdGlobalDependencies)
      : pkgJsonPeerDependencyKeys;

    // umdDependencyGlobals is an object where the keys are the module ids (the umdExternalDependencies list)
    // and the values are what those modules will be available in the global scope as
    // for example { 'react-dom': 'ReactDOM' } because react-dom will be available on the window as ReactDOM
    if (pkgJsonUmdGlobalDependencies) {
      umdDependencyGlobals = pkgJsonUmdGlobalDependencies;
    } else {
      pkgJsonPeerDependencyKeys.forEach((peerDep) => {
        umdDependencyGlobals = {};
        umdDependencyGlobals[peerDep] = convertKebabCaseToPascalCase(
          convertPkgNameToKebabCase(peerDep),
        );
      });
    }
    umdNameForPkg = convertKebabCaseToPascalCase(kebabCasePkgName);
  }

  return {
    buildPluginsDefault,
    buildPluginsWithNodeEnvDevelopment,
    buildPluginsWithNodeEnvProduction,
    outputPluginsDefault,
    outputPluginsProduction,
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
    buildPluginsDefault: Plugin[];
    outputPluginsDefault: OutputPlugin[];
  }): void;
}

export const rollupWatch: RollupWatch = ({
  kebabCasePkgName,
  pkgJsonDependencyKeys,
  pkgJsonPeerDependencyKeys,
  entryFile,
  treeshakeOptions,
  buildPluginsDefault,
  outputPluginsDefault,
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
    plugins: buildPluginsDefault,
    output: {
      file: `dist/${kebabCasePkgName}.esm.js`,
      format: 'esm',
      sourcemap: true,
      plugins: outputPluginsDefault,
    },
  };

  // in watch mode only create esm build
  const watcher = watch(esmWatchOptions);

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
    umdExternalDependencies?: string[];
    treeshakeOptions: TreeshakingOptions;
    buildPluginsDefault: Plugin[];
    buildPluginsWithNodeEnvDevelopment: Plugin[];
    buildPluginsWithNodeEnvProduction: Plugin[];
    addUmdBuild: boolean;
  }): Promise<[RollupBuild, RollupBuild, RollupBuild?, RollupBuild?]>;
}

export const createBundles: CreateBundles = ({
  entryFile,
  pkgJsonDependencyKeys,
  pkgJsonPeerDependencyKeys,
  umdExternalDependencies,
  treeshakeOptions,
  buildPluginsDefault,
  buildPluginsWithNodeEnvDevelopment,
  buildPluginsWithNodeEnvProduction,
  addUmdBuild,
}) =>
  Promise.all([
    // default bundle - used for esm and cjs dev builds
    rollup({
      external: [...pkgJsonDependencyKeys, ...pkgJsonPeerDependencyKeys],
      input: entryFile,
      treeshake: treeshakeOptions,
      plugins: buildPluginsDefault,
    }),

    // cjs production build
    rollup({
      external: [...pkgJsonDependencyKeys, ...pkgJsonPeerDependencyKeys],
      input: entryFile,
      treeshake: treeshakeOptions,
      plugins: buildPluginsWithNodeEnvProduction,
    }),

    // umd development build
    addUmdBuild
      ? rollup({
          external: umdExternalDependencies,
          input: entryFile,
          treeshake: treeshakeOptions,
          plugins: buildPluginsWithNodeEnvDevelopment,
        })
      : undefined,

    // umd production build
    addUmdBuild
      ? rollup({
          external: umdExternalDependencies,
          input: entryFile,
          treeshake: treeshakeOptions,
          plugins: buildPluginsWithNodeEnvProduction,
        })
      : undefined,
  ]);
/////////////////////////////////////

/////////////////////////////////////
// write rollup bundles
interface WriteBundles {
  (input: {
    cwd: string;
    kebabCasePkgName: string;
    bundleDefault: RollupBuild;
    bundleCjsProd: RollupBuild;
    bundleUmdDev?: RollupBuild;
    bundleUmdProd?: RollupBuild;
    outputPluginsDefault: OutputPlugin[];
    outputPluginsProduction: OutputPlugin[];
    umdNameForPkg?: string;
    umdDependencyGlobals?: { [key: string]: string };
  }): Promise<
    [
      RollupOutput,
      RollupOutput,
      RollupOutput,
      void,
      RollupOutput?,
      RollupOutput?,
    ]
  >;
}

export const writeBundles: WriteBundles = ({
  cwd,
  kebabCasePkgName,
  bundleDefault,
  bundleCjsProd,
  bundleUmdDev,
  bundleUmdProd,
  outputPluginsDefault,
  outputPluginsProduction,
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
    // esm build
    bundleDefault.write({
      file: `dist/${kebabCasePkgName}.esm.js`,
      format: 'esm',
      sourcemap: true,
      sourcemapExcludeSources: false,
      plugins: outputPluginsDefault,
    }),

    // cjs development build
    bundleDefault.write({
      file: `dist/${kebabCasePkgName}.cjs.development.js`,
      format: 'cjs',
      sourcemap: true,
      sourcemapExcludeSources: false,
      plugins: outputPluginsDefault,
    }),

    // cjs production build
    bundleCjsProd.write({
      file: `dist/${kebabCasePkgName}.cjs.production.js`,
      format: 'cjs',
      sourcemap: true,
      sourcemapExcludeSources: false,
      plugins: outputPluginsProduction,
    }),

    // cjs entry file
    fs.writeFile(
      resolve(cwd, 'dist', `${kebabCasePkgName}.cjs.js`),
      cjsEntryContent,
      'utf8',
    ),

    bundleUmdDev
      ? bundleUmdDev.write({
          file: `dist/${kebabCasePkgName}.umd.development.js`,
          format: 'umd',
          name: umdNameForPkg,
          globals: umdDependencyGlobals,
          sourcemap: true,
          sourcemapExcludeSources: false,
          plugins: outputPluginsDefault,
        })
      : undefined,

    bundleUmdProd
      ? bundleUmdProd.write({
          file: `dist/${kebabCasePkgName}.umd.production.js`,
          format: 'umd',
          name: umdNameForPkg,
          globals: umdDependencyGlobals,
          sourcemap: true,
          sourcemapExcludeSources: false,
          plugins: outputPluginsProduction,
        })
      : undefined,
  ]);
};
/////////////////////////////////////
