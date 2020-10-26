# Rollpkg

Zero config solution for building packages with `rollup` and `typescript` (supports `javascript` too). Rollpkg creates `esm`, `cjs` and `umd` builds and fully supports tree shaking. Rollpkg also provides sensible defaults for common configs that can be used for a complete zero config setup. Default configs are provided for `typescript`, `prettier`, `eslint`, and `jest` (the configs are setup to work with TypeScript, JavaScript, and React, use of the configs is optional).

---

## Setup `rollpkg`

**Install `rollpkg` and `typescript`:**

```
npm install --save-dev rollpkg typescript
```

**Add `main`, `umd:main`, `module`, `types`, and `sideEffects` fields to `package.json`** (and make sure `name` and `source` fields are also present). These fields let the consumers of your package know what builds are available to them. Rollpkg uses a convention over configuration approach so the field values in `package.json` must be exactly as listed below, just fill in your `<package-name>` and you’re set to go.

```
{
  "name": "<package-name>",
  "source": "src/index.ts" | "src/index.tsx",
  "main": "dist/<package-name>.cjs.js",
  "umd:main": "dist/<package-name>.umd.min.js",
  "module": "dist/<package-name>.esm.js",
  "types": "dist/<package-name>.d.ts",
  "sideEffects": false | true,
  …
}
```

> Note about `sideEffects`: most packages should set `"sideEffects": false` to fully enable tree shaking. A "side effect" is code that effects the global space when the script is run even if the `import` is never used, for example a polyfill that automatically polyfills a feature when the script is run. For more info see the [Webpack docs](https://webpack.js.org/guides/tree-shaking/#mark-the-file-as-side-effect-free) (note that `rollpkg` doesn't support an array of filenames containing side effects like Webpack).

**Add `build`, `watch` and `prepublishOnly` scripts to `package.json`:**

```
"scripts": {
  "build": "rollpkg",
  "watch": "rollpkg --watch",
  "prepublishOnly": "npm run build"
}
```

**Add a `files` array with `dist` and `src` to `package.json`** (this [lets `npm` know to include these directories](https://docs.npmjs.com/files/package.json#files) when you publish your package):

```
"files": [
  "dist",
  "src"
]
```

**Create a `tsconfig.json` file and extend the `tsconfig` provided by `rollpkg`:**

```
// tsconfig.json
{
  "extends": "rollpkg/configs/tsconfig.json"
}
```

**Add `dist` to `.gitignore`** (`rollpkg` outputs its builds into the `dist` folder, and this shouldn't be checked into version control):

```gitignore
# .gitignore file
node_modules
dist
```

**Create an `index.ts` or `index.tsx` entry file in the `src` folder:**

```
package-name
├─node_modules
├─src
│  ├─index.ts | index.tsx
│  └─additional source files
├─.gitignore
├─package.json
├─README.md
└─tsconfig.json
```

**That’s it!** Just run `npm run build` or `npm run watch` and you're good to go. No complex options to understand or insignificant decisions to make, just sensible defaults for building packages with Rollup and TypeScript. This is what you get with `rollpkg`:

- Zero config builds for ES Modules `esm`, CommonJS `cjs`, and Universal Module Definition `umd` into the `dist` folder.
- The `esm` build supports tree shaking.
- The `umd` build is minified and ready to be used in the browser from the Unpkg cdn, `<script src="https://unpkg.com/<pacakge-name>/dist/<pacakge-name>.umd.min.js"></script>`. The `umd` build is bundled with your package `dependencies`, but with your package `peerDependencies` listed as required globals.
- [Bundlephobia](https://bundlephobia.com/) package size stats for each build
- Strict mode enabled in builds
- Source maps

---

## Using default configs (optional)

Rollpkg provides sensible defaults for common configs that can be used for a complete zero config setup. Default configs are provided for `typescript`, `prettier`, `eslint`, and `jest` (the configs are setup to work with TypeScript, JavaScript, and React). Use of these configs is optional and while they include support for React, using React is not a requirement (they work just fine without React).

---

### TypeScript config

Having a `tsconfig.json` is a requirement of `rollpkg` because it uses the TypeScript compiler to compile both TypeScript and JavaScript source files. It is recommended to extend the `rollpkg` `tsconfig.json` as shown in the setup instructions and add your own options after extending it.

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

If you want to use Prettier (recommended) you can extend the config provided by `rollpkg`. There is no need to install Prettier as it is included with `rollpkg`. In `package.json` add:

```
"prettier": "rollpkg/configs/prettier.json"
```

You may also want to set up a pre-commit hook using `husky` and `lint-staged` so any changes are auto-formatted before being committed. See the [Prettier docs for Git hooks](https://prettier.io/docs/en/install.html#git-hooks).

---

### ESLint config

If you want to use ESLint (recommended) you can extend the config provided by `rollpkg`. It includes support for TypeScript, JavaScript, React, Prettier, and Jest (including the React Testing Library). The provided ESLint config mostly just extends the recommended defaults for each plugin.

There is no need to install ESLint as it is included with `rollpkg`. In `package.json` add:

> Note that the path includes `./node_modules/...`, this is because in order for ESLint to resolve `extends` it requires either a path to the config, or for the config to be published in its [own package named `eslint-config-...`](https://eslint.org/docs/developer-guide/shareable-configs). I may publish this config separately at some point, but for now it will remain a part of `rollpkg` for easy development.

```
"eslintConfig": {
  "extends": ["./node_modules/rollpkg/configs/eslint"]
}
```

---

### Jest config

<!-- TODO add `test`, `test:watch`, and `coverage` scripts to finish testing setup -->

If you want to use Jest (recommended) you can use the preset provided by `rollpkg`. There is no need to install Jest as it is included with `rollpkg`. In `package.json` add:

```
"jest": {
  "preset": "rollpkg/configs/jest"
}
```

---

## FAQ

- How do I use `rollpkg` with JavaScript?
- Can I use `browserslist` with `rollpkg`?
- Does `rollpkg` use Babel?
- How do I specify a build target other than `es5`?
- How do I use modern JavaScript features that can't be compilied to `es5` (e.g. `map`, `array.includes`, etc)?
- Why doesn't `rollpkg` create a build with separate entries for `development` and `production`?

<!--
## TODO
- answer FAQs
- development with linking and `dev` script -> link to rollpkg-examplepkg repo
-->
