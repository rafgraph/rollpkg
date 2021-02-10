# Rollpkg

🌎 Zero-config build tool to create packages with [Rollup](https://rollupjs.org/) and [TypeScript](https://www.typescriptlang.org/) (supports JavaScript too).

🌏 Rollpkg creates `esm`, `cjs` and `umd` builds for development and production, and fully supports tree shaking.

🌍 Default configs are provided for TypeScript, Prettier, ESLint, and Jest for a complete zero decision setup.

---

![gif of rollpkg in action](https://user-images.githubusercontent.com/11911299/100155245-ebad0180-2e74-11eb-86bc-71da0ba95866.gif)

---

**For an example package see `rollpkg-example-package`: [package repo](https://github.com/rafgraph/rollpkg-example-package), and [built and published code](https://unpkg.com/browse/rollpkg-example-package/).**

---

[Setup](#setup-rollpkg) ⚡️ [`package.json`](#fully-setup-example-packagejson) ⚡️ [Build options](#build-options-and-info) ⚡️ [Default configs](#using-default-configs-optional) ⚡️ [🚫 TS type pollution](#rollpkgs-approach-to-typescripts-global-type-pollution) ⚡️ [FAQ](#faq) ⚡️ [Compare to TSdx](#rollpkg-compared-to-tsdx)

---

## Setup `rollpkg`

#### Prerequisites

Initialize with `git` and `npm`. Note that the docs use `npm`, but it works just as well with `yarn`.

```
mkdir <package-name>
cd <package-name>
git init
npm init
```

#### Install `rollpkg` and `typescript`

TypeScript is a `peerDependency` of Rollpkg, and Rollpkg will use the version of TS that you install for its builds.

```
npm install --save-dev rollpkg typescript
```

#### Add `main`, `module`, `types`, and `sideEffects` fields to `package.json`

Rollpkg uses a convention over configuration approach, so the values in `package.json` need to be exactly as listed below, just fill in your `<package-name>` and you’re good to go. Note that for scoped packages where `"name": "@scope/<package-name>"`, use `<scope-package-name>` for the `main` and `module` fields.

```
{
  "name": "<package-name>",
  ...
  "main": "dist/<package-name>.cjs.js",
  "module": "dist/<package-name>.esm.js",
  "types": "dist/index.d.ts",
  "sideEffects": false | true,
  ...
}
```

> Note about `sideEffects`: most packages should set `"sideEffects": false` to fully enable tree shaking. A side effect is code that effects the global space when the script is run even if the `import` is never used, for example a polyfill that automatically polyfills a feature when the script is run would set `sideEffects: true`. For more info see the [Webpack docs](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free) (note that Rollpkg doesn't support an array of filenames containing side effects like Webpack).

#### Add `build`, `watch` and `prepublishOnly` scripts to `package.json`

```
"scripts": {
  "build": "rollpkg build",
  "watch": "rollpkg watch",
  "prepublishOnly": "npm run build"
}
```

#### Create a `tsconfig.json` file

It is recommended to extend the Rollpkg `tsconfig` and add your own options after extending it (however extending the Rollpkg `tsconfig` is not a requirement).

```
// tsconfig.json
{
  "extends": "rollpkg/configs/tsconfig.json"
}
```

> Note: you can specify a custom path or name for your `tsconfig` using the `--tsconfig` command line option.

#### Create an `index.ts` or `index.tsx` entry file in the `src` folder

This entry file is required by Rollpkg and it is the only file that has to be TypeScript (the rest of your source files can be JavaScript if you'd like). Note that you can write your entire code in `index.ts` or `index.tsx` if you only need one file.

```
package-name
├─node_modules
├─src
│  ├─index.ts | index.tsx
│  └─additional source files
├─.gitignore
├─package-lock.json
├─package.json
├─README.md
└─tsconfig.json
```

#### Add `dist` to `.gitignore`

Rollpkg creates a `dist` folder for the build files, and this shouldn't be checked into version control.

```gitignore
# .gitignore file
node_modules
dist
```

#### Add a `files` array with `dist` to `package.json`

This [lets `npm` know to include the `dist` folder](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#files) when you publish your package.

```
"files": [
  "dist"
]
```

#### Publish when ready

```
npm version patch | minor | major
npm publish
```

#### That’s it!

No complex options to understand or insignificant decisions to make, just a sensible convention for building packages with Rollup and TypeScript. This is what you get with Rollpkg:

- ES Modules `esm` and CommonJS `cjs` builds into the `dist` folder (`umd` builds can be added with the `--addUmdBuild` cli option).
- Code compiled using the TypeScript compiler (not Babel) so it is fully type checked during the build process.
- The `esm` build supports tree shaking and is ready to be used in development and production by modern bundlers (e.g. Webpack).
- The `cjs` build comes with both development and production versions, and will automatically select the appropriate version when it's used.
- Production builds are minified and any code that is gated by `if (process.env.NODE_ENV !== 'production') {...}` or `if (__DEV__) {...}` is removed.
- [Bundlephobia](https://bundlephobia.com/) package size stats for each build
- Generated `*.d.ts` type files
- Source maps
- See the [Build options and info](#build-options-and-info) section for more details

---

### Fully setup example `package.json`

This includes the optional [Rollpkg default configs](#using-default-configs-optional). Also see [`rollpkg-example-package`](https://github.com/rafgraph/rollpkg-example-package) for a fully set up example package.

```json
{
  "name": "<package-name>",
  "version": "0.0.0",
  "description": "Some awesome package",
  "main": "dist/<package-name>.cjs.js",
  "module": "dist/<package-name>.esm.js",
  "types": "dist/index.d.ts",
  "sideEffects": false,
  "scripts": {
    "build": "rollpkg build",
    "watch": "rollpkg watch",
    "prepublishOnly": "npm run lint && npm test && npm run build",
    "lint": "eslint src",
    "test": "jest",
    "test:watch": "jest --watchAll",
    "coverage": "npx live-server coverage/lcov-report"
  },
  "files": ["dist"],
  "devDependencies": {
    "rollpkg": "^0.4.0",
    "typescript": "^4.1.4"
  },
  "prettier": "rollpkg/configs/prettier.json",
  "eslintConfig": {
    "extends": ["./node_modules/rollpkg/configs/eslint"]
  },
  "jest": {
    "preset": "rollpkg"
  }
}
```

---

## Build options and info

Rollpkg uses the TypeScript compiler to transform your code to `ES2018` (default) and Rollup to create `esm`, `cjs` and `umd` builds. The TypeScript compiler uses your `tsconfig.json` with a few added defaults to prevent [global type pollution](#rollpkgs-approach-to-typescripts-global-type-pollution), create source maps, and generate `*.d.ts` type files.

- [`rollpkg build`](#rollpkg-build) creates `esm`, `cjs` and `umd` builds for both development and production.
- [`rollpkg watch`](#rollpkg-watch) is lightning quick and always exits `0` so you can chain npm scripts.
- Setting [`sideEffects: false`](#sideeffects-boolean) in `package.json` fully enables tree shaking.
- Production builds are minified and [dev mode code is removed](#dev-mode-code).
- You can [set the target ECMAScript version (`ES5`, `ES2018`, etc)](#setting-target-ecmascript-version-in-tsconfig) in your `tsconfig` if needed. The Rollpkg default is `ES2018`.
- Source maps are created for each build with your source code included so there is no need to publish your `src` folder to `npm`.

---

### `rollpkg build`

#### Options

- `rollpkg build`
  - For most use cases no options are needed, just run the `rollpkg build` command. It creates `esm` and `cjs` builds with source maps and `*.d.ts` type files.
- `rollpkg build --tsconfig ./path/to/tsconfig.build.json`
  - You can specify a custom path or name for your `tsconfig` if needed. By default Rollpkg will look in the root of your project for a `tsconfig.json` file.
- `rollpkg build --addUmdBuild`
  - By default `rollpkg build` only creates `esm` and `cjs` builds, use this option to also create `umd` builds.
- `rollpkg build --noStats`
  - By default `rollpkg build` will calculate Bundlephobia stats after each build, use this option skip the stats calculation.

#### ES Modules `esm` build

- **`<package-name>.esm.js`**
- The `esm` build is ready to be used by modern bundlers (e.g. Webpack) for both development and production and fully supports tree shaking. When creating production builds the bundler will minify the code and remove any code that is gated by `process.env.NODE_ENV !== 'production'`.

#### CommonJS `cjs` build

- **`<package-name>.cjs.js`**
  - The `cjs` entry file that selects the development or production `cjs` build based on `process.env.NODE_ENV`, you can view what this file looks like [here](https://unpkg.com/browse/rollpkg-example-package/dist/rollpkg-example-package.cjs.js).
- **`<package-name>.cjs.development.js`**
- **`<package-name>.cjs.production.js`**
- The `cjs` build creates separate versions for development and production, as well as an entry file that selects the appropriate version.

#### Universal Module Definition `umd` build

<!-- prettier-ignore -->
- Use the `--addUmdBuild` cli option to create `umd` builds.
- **`<package-name>.umd.development.js`**
- **`<package-name>.umd.production.js`**
- The `umd` builds are ready to be used directly in the browser from the Unpkg CDN, just add the script to `index.html`:
  ```html
  <!-- in development use -->
  <script src="https://unpkg.com/<pacakge-name>/dist/<pacakge-name>.umd.development.js"></script>

  <!-- in production use -->
  <script src="https://unpkg.com/<pacakge-name>/dist/<pacakge-name>.umd.production.js"></script>
  ```
- Your package will be available on the `window` as the PascalCase version of your `<package-name>`. For example, if your package name is `rollpkg-example-package`, then it will be available on the `window` as `RollpkgExamplePackage`.
- The `umd` build is bundled with your package `dependencies` included, but with your package `peerDependencies` listed as external globals, which are assumed to be available on the `window` as the PascalCase version of their `<package-name>`. For example, if your package has `react` as a peer dependency, then Rollpkg assumes it will be available on the `window` as `React`, which is true if [React is also loaded from the CDN](https://reactjs.org/docs/cdn-links.html).
- You can control the external globals that your `umd` build depends on and what they will be available on the `window` as by adding a `umdGlobalDependencies` object to your `package.json`. The object needs to be in the form of `{ "package-name": "GlobalName" }`, for example `"umdGlobalDependencies": { "react-dom": "ReactDOM" }`. If `umdGlobalDependencies` is specified in your `package.json`, then Rollpkg will use that instead of the `peerDependencies` list for external globals.

---

### `rollpkg watch`

- Watches for file changes and rebuilds when changes are detected.
- Only creates the `esm` build so rebuilds are lightning quick.
- Use `ctrl c` to exit watch mode.
- Watch mode always exits `0` (non-error state) so you can chain commands in npm scripts, for example `rollpkg watch && npm run ...` (if watch mode didn't exit `0`, then `npm run ...` would never run).

---

### `sideEffects: boolean`

- Most packages should set `"sideEffects": false` to fully enable tree shaking. A side effect is code that effects the global space when the script is run even if the `import` is never used, for example a polyfill that automatically polyfills a feature when the script is run would set `sideEffects: true`. For more info see the [Webpack docs](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free) (note that Rollpkg doesn't support an array of filenames containing side effects like Webpack).
- Setting `sideEffects: false` enables the following tree shaking optimizations:
  - Rollup's more forceful [treeshake options](https://rollupjs.org/guide/en/#treeshake) are enabled with `moduleSideEffects`, `propertyReadSideEffects`, `tryCatchDeoptimization`, and `unknownGlobalSideEffects` all set to `false` (note that tree shaking is still enabled with `sideEffects: true`, just a milder version of it is used).

---

### Dev mode code

Dev mode code is code that will only run in development and will be removed from production builds. You can use `process.env.NODE_ENV` or `__DEV__` to gate dev mode code and Rollpkg will remove it from production builds:

```js
if (process.env.NODE_ENV !== 'production') {
  // dev mode code here
}

if (__DEV__) {
  // dev mode code here
}
```

Note that `__DEV__` is shorthand for `process.env.NODE_ENV !== 'production'` and Rollpkg will transform `__DEV__` into `process.env.NODE_ENV !== 'production'` before proceeding to create development and production builds.

---

### Setting target ECMAScript version in `tsconfig`

> Note that for most projects [extending the Rollpkg `tsconfig`](#typescript-config) is all that's required and you can ignore this section.

The Rollpkg default is to compile your code to `ES2018` which is supported by all modern browsers. If you need to support legacy browsers, then you probably want to compile your code to `ES5`.

To control how your code is compiled and what JS APIs are available at runtime use the [`target`](https://www.typescriptlang.org/tsconfig#target) and [`lib`](https://www.typescriptlang.org/tsconfig#lib) options in your `tsconfig`. The `target` option specifies the ECMAScript version that your code is compiled to (`ES5`, `ES2018`, etc). The `lib` option specifies the JS APIs that will be available at runtime, which is needed for using JS APIs that can't be compiled to the specified `target`. For example, `array.includes` and the `Promise` API cannot be compiled to `ES5` but you may find it necessary to use them in your code (note that all JS APIs in your code will need to be available in the browser, either supported natively or provided by a polyfill).

For example, let's say your `target` is `ES5` and need to use the `Promise` API, your `tsconfig.json` would look like this:

> Note that when using the `lib` option you need to specify _all_ available JS APIs, including the base `ES5` APIs and `DOM` APIs.

```json
// example tsconfig.json to use ES5 and the Promise API
{
  "extends": "rollpkg/configs/tsconfig.json",
  "compilerOptions": {
    "target": "ES5",
    "lib": ["DOM", "ES5", "ES2015.Promise"]
  }
}
```

---

## Using default configs (optional)

Rollpkg provides sensible defaults for common configs that can be used for a complete zero decision setup. You can also add you own overrides to the defaults if needed. Default configs are provided for [TypeScript](#typescript-config), [Prettier](#prettier-config), [ESLint](#eslint-config), and [Jest](#jest-config) (the configs are setup to work with TypeScript, JavaScript, and React). Use of these configs is optional and while they include support for React, using React is not a requirement (they work just fine without React).

---

### TypeScript config

It is recommended to extend the [Rollpkg `tsconfig`](https://github.com/rafgraph/rollpkg/blob/main/configs/tsconfig.json) and add your own options after extending it (however extending the Rollpkg `tsconfig` is not a requirement).

```
// tsconfig.json
{
  "extends": "rollpkg/configs/tsconfig.json",
  // add your own options, etc...
}
```

---

### Prettier config

If you want to use [Prettier](https://prettier.io/) (recommended) you can extend the [config provided by Rollpkg](https://github.com/rafgraph/rollpkg/blob/main/configs/prettier.json). There is no need to install Prettier as it is included with Rollpkg (alternatively if you need to use a specific version of Prettier, you can install it and that version will be used). In `package.json` add:

```
"prettier": "rollpkg/configs/prettier.json"
```

You may also want to set up a pre-commit hook using [`pre-commit`](https://github.com/observing/pre-commit) or [`husky`](https://github.com/typicode/husky), and [`lint-staged`](https://github.com/okonet/lint-staged) so any changes are auto-formatted before being committed. See the [`rollpkg-example-package`](https://github.com/rafgraph/rollpkg-example-package) for an example pre-commit hook setup, as well as the [Prettier docs for Git hooks](https://prettier.io/docs/en/precommit.html).

---

### ESLint config

If you want to use [ESLint](https://eslint.org/) (recommended) you can extend the [config provided by Rollpkg](https://github.com/rafgraph/rollpkg/blob/main/configs/eslint.js). It includes support for TypeScript, JavaScript, React, Prettier, and Jest. The provided ESLint config mostly just extends the recommended defaults for each plugin. There is no need to install ESLint or specific plugins as they are included with Rollpkg (alternatively if you need to use a specific version of ESLint or plugin, you can install it and that version will be used). In `package.json` add:

> Note that the path includes `./node_modules/...`, this is because in order for ESLint to resolve `extends` it requires either a path to the config, or for the config to be published in its [own package named `eslint-config-...`](https://eslint.org/docs/developer-guide/shareable-configs), which may happen at some point, but for now it will remain a part of Rollpkg for easy development.

```
"eslintConfig": {
  "extends": ["./node_modules/rollpkg/configs/eslint"]
}
```

It is also recommended to add a `lint` script to `package.json` (the `eslint src` command tells ESLint to lint the `src` folder). As well as add `npm run lint` to the `prepublishOnly` script so your code is linted before publishing.

```
"scripts": {
  ...
  "prepublishOnly": "npm run lint && npm test && npm run build",
  "lint": "eslint src"
}
```

---

### Jest config

If you want to use [Jest](https://jestjs.io/) (recommended) you can use the [preset provided by Rollpkg](https://github.com/rafgraph/rollpkg/blob/main/configs/jest-preset.js). The preset uses [`ts-jest`](https://github.com/kulshekhar/ts-jest) for a seamless and fully typed checked TypeScript testing experience. There is no need to install Jest as it is included with Rollpkg (alternatively if you need to use a specific version of Jest, you can install it and that version will be used). In `package.json` add:

```
"jest": {
  "preset": "rollpkg"
}
```

It is also recommended to add `test`, `test:watch` and `coverage` scripts to `package.json` (the `coverage` script will open the coverage report in your browser). As well as add `npm test` to the `prepublishOnly` script so tests are run before publishing.

```
"scripts": {
  ...
  "prepublishOnly": "npm run lint && npm test && npm run build",
  "lint": "eslint src",
  "test": "jest",
  "test:watch": "jest --watchAll",
  "coverage": "npx live-server coverage/lcov-report"
}
```

The Rollpkg Jest config will automatically generate a code coverage report when Jest is run and save it in the `coverage` folder, which shouldn't be checked into version control, so also add `coverage` to `.gitignore`.

```gitignore
# .gitignore
node_modules
dist
coverage
```

---

## Rollpkg's approach to TypeScript's global type pollution

TypeScript's default behavior is to include all of the types in your `node_modules/@types` folder as part of the global scope. This allows you to use things like `process.env.NODE_ENV` and Jest's `test(...)` or `expect(...)` without causing a type error. However, it also adds a significant amount of global type pollution that you might not realize is there. This pollution can make it seem like you are writing type safe code that safely compiles to your `target` ECMAScript version, but in reality you are using APIs that won't be available at runtime. For example, your `node_modules/@types` folder probably includes `node`'s types (they are required by Jest and others), so the TypeScript compiler thinks your code will have access to all of Node's APIs at runtime. If your compilation `target` is set to `ES5`, using APIs like `array.includes`, `Map`, `Set` or `Promise` won't produce a TypeScript error despite the fact that none of these can be compiled to `ES5` 🤦‍♀️ (the TypeScript compiler assumes your code will have access to these APIs at runtime).

TypeScript does provide a [`types`](https://www.typescriptlang.org/tsconfig#types) compiler option for you to explicitly specify which packages are included in the global scope (note that these will be in addition to any `import`s in your code, for example if you `import * as React from 'react'` then `react`'s types will always be included). However, failing to include types that are needed in development but won't be available at runtime (e.g. Node's `process.env.NODE_ENV` and Jest's `test`) will cause a TypeScript error in development 🤦‍♂️ Also you can only specify entire packages so it is not possible to only include the `process.env` type but exclude the rest of Node's types.

Ideally [TypeScript would allow overrides](https://github.com/microsoft/TypeScript/issues/33407) based on file types like ESLint does, but until that happens the most widely used solution is multiple `tsconfig`s (e.g. `tsconfig.build.json`, `tsconfig.test.json`, etc) that include or exclude specific files and types (or alternatively ignoring the issue and accepting the global type pollution). Note that VS Code (and other editors) can only use one `tsconfig.json` per file tree section to provide type feedback in the UI, so when using multiple `tsconfig`s it is typical to have a `tsconfig.json` file that doesn't restrict global types or files so you can benefit from UI based type feedback without unwanted type errors in the UI. That is, even with multiple `tsconfig`s, global type pollution is unavoidable in the editor UI.

#### So how does Rollpkg handle global type pollution?

- Rollpkg takes a balanced approach - it eliminates global type pollution when building, but allows it when editing.
- The [Rollpkg `tsconfig`](https://github.com/rafgraph/rollpkg/blob/main/configs/tsconfig.json) that you can extend in your `tsconfig.json` doesn't restrict the types available in the global scope to provide a smooth editor experience (VS Code uses your `tsconfig.json` for type checking).
- When you run `rollpkg build` or `rollpkg watch` only files that are part of the build are type checked, and `node_modules/@types` that are not imported are excluded to prevent global type pollution (your `tsconfig.json` is used for the build, but with a `types: []` override). Also, `process.env.NODE_ENV` is stubbed so it won't cause an error before it is transformed during the build process.
- Note that you may see a TypeScript error when running `rollpkg build` or `rollpkg watch` that doesn't show up in your editor or when running `npx tsc` (which uses your `tsconfig.json`). This usually happens because you are using a JS API that is not included in your `tsconfig.json`'s `lib` option, but is included in the global scope via `node_modules/@types` (e.g. `array.includes`, `Promise`, etc). The solution is to explicitly add this JS API to your `tsconfig.json`'s `lib` option so Rollpkg will include it in the build process. For how to do this see the [setting target ECMAScript version](#setting-target-ecmascript-version-in-tsconfig) section.

---

## FAQ

- **Does Rollpkg create separate builds for development and production?**
  - Yes, and the production builds are fully optimized. See the [`rollpkg build`](#rollpkg-build) section for details.
- **Does Rollpkg remove dev mode code from production builds?**
  - Yes, see the [Dev mode code](#dev-mode-code) section.
- **Does Rollpkg prevent global type pollution in my builds?**
  - Yes, see [Rollpkg's approach to TypeScript's global type pollution](#rollpkgs-approach-to-typescripts-global-type-pollution).
- **Can I change the ECMAScript version used in the builds?**
  - Yes, see [setting target ECMAScript version](#setting-target-ecmascript-version-in-tsconfig).
- **How do I use Rollpkg with JavaScript?**
  - The only file that needs to be TypeScript is the entry file `src/index.ts`, the rest of your files can written in JavaScript. This is because Rollpkg uses the TypeScript complier to compile both TypeScript and JavaScript files.
- **Does Rollpkg use Babel?**
  - No, Rollpkg uses the TypeScript compiler to translate both TS and JS code to `ES2018` (or your target ECMAScript version), this avoids the [limitations of using TypeScript with Babel](https://kulshekhar.github.io/ts-jest/user/babel7-or-ts) which means your code is fully type checked all the way through the build process. Also, by not using Babel the `tsconfig.json` becomes the single source of truth for how your code is compiled and eliminates the complexity and confusion caused by having both a `tsconfig.json` and a `babel.config.json`.
- **Can I use the new React JSX runtime?**
  - Not yet, and it's probably a good idea not to for compatibility reasons. If you were to use the [new JSX runtime](https://reactjs.org/blog/2020/09/22/introducing-the-new-jsx-transform.html) in your package it would mean that your package can only be used in apps with a React version that supports the new JSX runtime, which significantly limits compatibility. There are also some complexity issues around supporting the JSX runtime in Rollpkg. The new React JSX transform allows you to avoid importing React in files that use JSX, however, the JSX runtime is not part of React's UMD build. This means that the Rollpkg UMD build still needs to use the `React.createElement(...)` API regardless, which makes the build process more complex.

### Rollpkg compared to TSdx

> Some background: I started [creating](https://www.npmjs.com/package/react-router-hash-link) [npm](https://www.npmjs.com/package/detect-it) [packages](https://www.npmjs.com/package/fscreen) in 2016, and I've mostly used my own build setup. Recently I started looking for a build tool that would provide a convention over configuration approach to reduce the number of decisions I needed to make. I used [Microbundle](https://github.com/developit/microbundle) for a bit, and experimented with [TSdx](https://tsdx.io), but neither was a good fit, so I created Rollpkg (this is essentially the origin story behind all of my open source projects, I just want the thing to exist so I can use it in another project 😆).

Without taking anything away from TSdx (I think it's generally a solid tool that gets a lot of things right), here are some areas where Rollpkg takes a different approach (as of TSdx v0.14.1):

- **TypeScript compiler _vs_ Babel**
  - Rollpkg uses the TypeScript compiler.
  - TSdx uses Babel.
  - With Rollpkg the builds are full typed checked, with TSdx they are not.
- **TypeScript global type pollution: eliminating it _vs_ building in a polluted type space**
  - Rollpkg addresses the [TypeScript global type pollution issue](#rollpkgs-approach-to-typescripts-global-type-pollution) and eliminates it when building.
  - TSdx doesn't address the issue so its builds are created in a polluted global type space which can lead to uncaught type errors.
- **TypeScript as a `peerDependency` _vs_ regular `dependency`**
  - Rollpkg has TypeScript as a `peerDependency` and will use whatever version you have installed to compile your code.
  - TSdx has TypeScript as a regular `dependency` and will only use the TS version that it comes with.
  - With Rollpkg you can upgrade to the newest TypeScript version as soon as it is released (or use pre-release versions), but with TSdx you have to wait for TSdx to upgrade it's TypeScript dependency (as of TSdx v0.14.1 it is still using TypeScript v3).
- **ESLint and Jest configs: extended _vs_ controlled**
  - Rollpkg provides default ESLint and Jest configs that you can extend and add additional overrides to if needed.
  - TSdx keeps its default ESLint and Jest configs internal and will merge any external configs with its own.
  - There are two advantages to the Rollpkg extend and override approach: the configs can be used by your IDE/editor for an enhanced dev experience, and you have full control over the configs (if you need it). With the Rollpkg ESLint and Jest configs extended, your IDE/editor can integrate them into the dev experience. For example, the VS Code ESLint plugin can use the settings in the Rollpkg ESLint config to provide linting feedback in the editor UI, and the same goes for using the settings in the Rollpkg Jest config to run tests in your IDE/editor instead of the command line, both of which are not possible with TSdx's controlled configs. Also, if you need to fully turn off something that's included in a default config, you can without having to abandon the default config all together, which is not possible with TSdx's config merging approach.
- **`tsconfig.json`: extend a default config _vs_ static setup**
  - Rollpkg provides a default `tsconfig` that you can extend and add overrides to if needed.
  - TSdx generates a `tsconfig.json` for you when you create a new project and writes the configuration to that file.
  - With the Rollpkg default config approach, if the recommend `tsconfig` options change, all you have to do is upgrade Rollpkg to use the latest best practices/convention, while with TSdx you're on your own to manage/update your `tsconfig` in each project.
  - Note that with Rollpkg, extending the default `tsconfig` is recommended but not required, so you're free to fully manage your `tsconfig` if you want.
- **UMD builds: `peerDependencies` _vs_ all `dependencies` as required globals**
  - Rollpkg includes your package's `dependencies` as part of the UMD build and leaves only your `peerDependencies` as required globals.
  - TSdx leaves both your `dependencies` and `peerDependencies` as required globals in the UMD build.
  - For example, if your package has React as a `peerDependency` plus some regular `dependencies`, Rollpkg will bundle the regular `dependencies` as part of the UMD build and only `React` will be required to be available on the `window`. Compared to TSdx which will require `React` plus all of your `dependencies` to be available on the `window` (some of which may not have an available UMD build that can be loaded from a CDN in a `<script>` tag).
- **Package size stats: [Bundlephobia](https://bundlephobia.com) stats included _vs_ [Size Limit](https://github.com/ai/size-limit) stats config setup**
  - Rollpkg calculates Bundlephobia package stats locally after each `rollpkg build`.
  - TSdx will setup Size Limit in your `package.json` when you create a new project (adds a Size Limit config, npm script, and `size-limit` as a dependency), but doesn't include any package size stats as part of the `tsdx build` command.
- **Watch mode exit `0` _vs_ non-`0`**
  - `rollpkg watch` always exits `0`, including when you use `ctrl c` to exit watch mode, so you can chain npm scripts.
  - `tsdx watch` exits non-`0`.
  - To preform some dev cleanup after you're done watching, with Rollpkg you can do `npm run devSetup && rollpkg watch && npm run devCleanup`, but with TSdx if you do `npm run devSetup && tsdx watch && npm run devCleanup` the `npm run devCleanup` command will never run.

---

### Prior art

- [Create React App](https://github.com/facebook/create-react-app)
- [Microbundle](https://github.com/developit/microbundle)
- [TSdx](https://tsdx.io/)
