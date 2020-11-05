# Rollpkg

Zero config solution for building packages with `rollup` and `typescript` (supports `javascript` too). Rollpkg creates `esm`, `cjs` and `umd` builds for development and production and fully supports tree shaking. Rollpkg also provides sensible defaults for common configs that can be used for a complete zero config setup. Default configs are provided for `typescript`, `prettier`, `eslint`, and `jest` (the configs are setup to work with TypeScript, JavaScript, and React, use of these configs is optional).

---

For an example package see `rollpkg-example-package`: [package repo](TODO), and [built and published code](TODO).

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

```
npm install --save-dev rollpkg typescript
```

#### Add `main`, `module`, `types`, and `sideEffects` fields to `package.json`
Rollpkg uses a convention over configuration approach, so the field values in `package.json` need to be exactly as listed below, just fill in your `<package-name>` and you’re good to go. Note that for scoped packages where `"name": "@scope/<package-name>"`, use `<scope-package-name>` for the `main` and `module` fields.

```
{
  "name": "<package-name>",
  "main": "dist/<package-name>.cjs.js",
  "module": "dist/<package-name>.esm.js",
  "types": "dist/index.d.ts",
  "sideEffects": false | true,
  …
}
```

> Note about `sideEffects`: most packages should set `"sideEffects": false` to fully enable tree shaking. A side effect is code that effects the global space when the script is run even if the `import` is never used, for example a polyfill that automatically polyfills a feature when the script is run would set `sideEffects: true`. For more info see the [Webpack docs](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free) (note that `rollpkg` doesn't support an array of filenames containing side effects like Webpack).

#### Add `build`, `watch` and `prepublishOnly` scripts to `package.json`

```
"scripts": {
  "build": "rollpkg",
  "watch": "rollpkg --watch",
  "prepublishOnly": "npm run build"
}
```

#### Add a `files` array with `dist` and `src` to `package.json`
This [lets `npm` know to include these directories](https://docs.npmjs.com/cli/v7/configuring-npm/package-json#files) when you publish your package.

```
"files": [
  "dist",
  "src"
]
```

#### Create a `tsconfig.json` file and extend the `tsconfig` provided by `rollpkg`

```
// tsconfig.json
{
  "extends": "rollpkg/configs/tsconfig.json"
}
```

#### Add `dist` to `.gitignore`
Rollpkg outputs the builds into the `dist` folder, and this shouldn't be checked into version control.

```gitignore
# .gitignore file
node_modules
dist
```

#### Create an `index.ts` or `index.tsx` entry file in the `src` folder
This entry file is required by `rollpkg` and it is the only file that has to be TypeScript, the rest of your source files can be JavaScript if you'd like. Note that you can write your entire code in `index.ts` or `index.tsx` if you only need one file.

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
#### While developing use the `build` and `watch` scripts
```
npm run build
# OR
npm run watch
```

#### Publish when ready
```
npm version patch | minor | major
npm publish
```

#### That’s it!
No complex options to understand or insignificant decisions to make, just sensible defaults for building packages with Rollup and TypeScript. This is what you get with `rollpkg`:

- Zero config builds for ES Modules `esm`, CommonJS `cjs`, and Universal Module Definition `umd` into the `dist` folder.
- The `esm` build supports tree shaking and is ready to be used in development and production by modern bundlers (e.g. Webpack).
- The `cjs` build comes with both development and production versions, and will automatically select the appropriate version when it's used.
- The `umd` build comes with both development and production versions and is ready to be used directly in the browser from the Unpkg cdn. The `umd` build is bundled with your package `dependencies`, but with your package `peerDependencies` listed as required globals.
  - In development use: `<script src="https://unpkg.com/<pacakge-name>/dist/<pacakge-name>.umd.development.js"></script>`.
  - In production use: `<script src="https://unpkg.com/<pacakge-name>/dist/<pacakge-name>.umd.production.js"></script>`.
- Builds are created using the TypeScript compiler (not Babel) so they are fully type checked.
- Production builds are minified and any code that is gated by `if (process.env.NODE_ENV !== 'production') { ... }` is removed. Also, if using an `invariant` library, `invariant(condition, message)` will automatically be transformed into `invariant(condition)` in production builds.
- [Bundlephobia](https://bundlephobia.com/) package size stats for each build
- Strict mode enabled in builds
- Source maps
- For more info see the [Build details](#build-details) section

---

### Fully setup example `package.json`

This includes the optional [`rollpkg` default configs](#using-default-configs-optional) and is setup to use [`npm link` for development](#package-development-with-npm-link).

```json
{
  "name": "<package-name>",
  "main": "dist/<package-name>.cjs.js",
  "module": "dist/<package-name>.esm.js",
  "types": "dist/index.d.ts",
  "sideEffects": false,
  "scripts": {
    "dev": "npm link && npm run watch && npm unlink -g",
    "build": "rollpkg",
    "watch": "rollpkg --watch",
    "prepublishOnly": "npm run build",
    "test": "jest",
    "test:watch": "jest --watchAll",
    "coverage": "npx live-server coverage/lcov-report"
  },
  "files": ["dist", "src"],
  "devDependencies": {
    "rollpkg": "^0.1.0",
    "typescript": "^4.0.3"
  },
  "prettier": "rollpkg/configs/prettier.json",
  "eslintConfig": {
    "extends": ["./node_modules/rollpkg/configs/eslint"]
  },
  "jest": {
    "preset": "rollpkg/configs/jest"
  }
}
```

---

## Using default configs (optional)

Rollpkg provides sensible defaults for common configs that can be used for a complete zero config setup. Default configs are provided for `typescript`, `prettier`, `eslint`, and `jest` (the configs are setup to work with TypeScript, JavaScript, and React). Use of these configs is optional and while they include support for React, using React is not a requirement (they work just fine without React).

---

### TypeScript config

Having a `tsconfig.json` is a requirement of `rollpkg` because it uses the TypeScript compiler to compile both TypeScript and JavaScript source files. It is recommended to extend the [`rollpkg` `tsconfig.json`](https://github.com/rafgraph/rollpkg/blob/main/configs/tsconfig.json) as shown in the setup instructions and add your own options after extending it (note that extending the `rollpkg` `tsconfig.json` is recommended but is not a requirement, you can use your own `tsconfig.json` if you want).

```
// tsconfig.json
{
  "extends": "rollpkg/configs/tsconfig.json",
  "lib": ["ESNext"]
  // etc...
}
```

---

### Prettier config

If you want to use Prettier (recommended) you can extend the [config provided by `rollpkg`](https://github.com/rafgraph/rollpkg/blob/main/configs/prettier.json). There is no need to install Prettier as it is included with `rollpkg`. In `package.json` add:

```
"prettier": "rollpkg/configs/prettier.json"
```

You may also want to set up a pre-commit hook using `husky` and `lint-staged` so any changes are auto-formatted before being committed. See the [Prettier docs for Git hooks](https://prettier.io/docs/en/install.html#git-hooks).

---

### ESLint config

If you want to use ESLint (recommended) you can extend the [config provided by `rollpkg`](https://github.com/rafgraph/rollpkg/blob/main/configs/eslint.js). It includes support for TypeScript, JavaScript, React, Prettier, and Jest (including the React Testing Library). The provided ESLint config mostly just extends the recommended defaults for each plugin. There is no need to install ESLint or specific plugins as they are included with `rollpkg`. In `package.json` add:

> Note that the path includes `./node_modules/...`, this is because in order for ESLint to resolve `extends` it requires either a path to the config, or for the config to be published in its [own package named `eslint-config-...`](https://eslint.org/docs/developer-guide/shareable-configs). I may publish this config separately at some point, but for now it will remain a part of `rollpkg` for easy development.

```
"eslintConfig": {
  "extends": ["./node_modules/rollpkg/configs/eslint"]
}
```

---

### Jest config

If you want to use Jest (recommended) you can use the [preset provided by `rollpkg`](TODO). There is no need to install Jest as it is included with `rollpkg`. In `package.json` add:

```
"jest": {
  "preset": "rollpkg/configs/jest"
}
```

It is also recommended to add `test`, `test:watch` and `coverage` scripts to `package.json` (the `coverage` script will open the coverage report in your browser). The Rollpkg Jest config will automatically generate a code coverage report when Jest is run and save it in the `coverage` folder, which shouldn't be checked into version control, so it is also recommended to add `coverage` to `.gitignore`.

```
"scripts": {
  ...
  "test": "jest",
  "test:watch": "jest --watchAll",
  "coverage": "npx live-server coverage/lcov-report"
}
```

```gitignore
# .gitignore
node_modules
dist
coverage
```

---

## Package development with `npm link`

One way to develop packages is to use the package in a live demo app as you're developing it. Using `rollpkg --watch` with [`npm link`](https://docs.npmjs.com/cli/v7/commands/npm-link) allows you to see live changes in your demo app as you make changes to your package code. Running `npm link` in the package directory will link the package to global `node_modules`, and then running `npm link <package-name>` in the demo app directory will link the package from global `node_modules` to your demo app. A good way to set this up is to add a `dev` script to `package.json` (note that `npm unlink -g` removes link from global `node_modules` after you're done with the `watch` script):

> For a real world example of how to do this see the example package and corresponding demo app: [rollpkg-example-package](TODO) and [rollpkg-example-package-demo](TODO)

```
"scripts": {
  "dev": "npm link && npm run watch && npm unlink -g",
  "build": "rollpkg",
  "watch": "rollpkg --watch",
  ...
}
```

---

## Build details

TODO

#### `rollpkg` output files

- `<package-name>.esm.js`
- `<package-name>.cjs.js`
- `<package-name>.cjs.development.js`
- `<package-name>.cjs.production.js`
- `<package-name>.umd.development.js`
- `<package-name>.umd.production.js`

---

## Rollpkg's approach to TypeScript global type pollution

- TODO
- Rollpkg allows the global space to have access to all the types defined in `node_modules/@types`, but when `rollpkg` builds it restricts the types to what's defined in the `target` and `lib` fields in `tsconfig.json` (as well as anything that is explicitly imported in your code).

---

## FAQ

- **Does `rollpkg` really have zero configuration options?**
  - Yup, other than `--watch` there are no configuration options. Rollpkg uses a convention over configuration approach, if you are using `rollpkg` then you are using the convention and there are zero build decisions to worry about, just focus on writing your code, isn't that liberating?
- **What if I need to do X and Rollpkg doesn't support it?**
  - Open an issue and explain why X should be part of the convention.
- **How do I use `rollpkg` with JavaScript?**
  - The only file that needs to be TypeScript is the entry file `src/index.ts`, the rest of your files can written in JavaScript. This is because Rollpkg uses the TypeScript complier to compile both TypeScript and JavaScript files.
- **Does `rollpkg` use Babel?**
  - No, `rollpkg` uses the TypeScript compiler to translate both TS and JS code to `es5`, this avoids the [limitations of using TypeScript with Babel](https://kulshekhar.github.io/ts-jest/user/babel7-or-ts) which means your code is fully type checked all the way through the build process. Also, by not using Babel the `tsconfig.json` becomes the single source of truth for how your code is compiled and eliminates the complexity and confusion caused by having both a `tsconfig.json` and a `babel.config.json`.
- **Can I use a `browserslist` with `rollpkg`?**
  - No, and that's a good thing when creating a package. A `browserslist` is incredibly useful when creating an app that's run in the browser. The `browserslist` lets your build system (e.g. Create React App, Gatsby, Next.js, Webpack with Babel, etc) know what browsers to support, but when creating a package that is meant to be used in a variety of apps with different browser requirements it can cause compatibility issues.
- **Can I specify a build target other than `es5`?**
  - Yes, but it is not recommended for compatibility reasons as you don't know who is going to use your package. See this [explanation from Rollup](https://github.com/rollup/rollup/wiki/pkg.module#wait-it-just-means-import-and-export--not-other-future-javascript-features) for why ESModules should be transpiled to `es5`. If you're sure you want to change the build target then set the `tsconfig.json` [`target`](https://www.typescriptlang.org/tsconfig#target) field to your desired target. Rollpkg uses the TypeScript compiler for compiling your code, and the TypeScript compiler uses your `tsconfig.json` to determine the target that it's compiled for.

---

### Prior art

- [Create React App](https://github.com/facebook/create-react-app)
- [Microbundle](https://github.com/developit/microbundle)
- [TSdx](https://tsdx.io/)
