# Rollpkg

Zero config solution for building packages with `rollup` and `typescript` (supports `javascript` too). Rollpkg also provides sensible defaults for common configs that can be used for a complete zero config setup. Default configs are provided for TypeScript, ESLint, Prettier, and Jest. The configs are setup to work with TypeScript, JavaScript, and React (use of these configs is optional).

---

## Setup `rollpkg`

```
npm install --save-dev rollpkg
```

**Add `main`, `umd:main`, `module`, `types`, and `sideEffects` fields to `package.json`** (and make sure `name` and `source` fields are also present). These fields let the consumers of your package know what builds are available to them. Rollpkg uses a convention over configuration approach so the field values in `package.json` must be exactly as listed below, just fill in your `<package-name>` and you’re set to go.

```json
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

**Add `build` and `watch` scripts to `package.json`:**

```json
…
"scripts": {
  "build": "rollpkg",
  "watch": "rollpkg --watch"
},
…
```

**Create a `tsconfig.json` file and extend the `tsconfig` provided by `rollpkg`:**

<!-- TODO CAN THIS BE OPTIONAL?? If rollpkg has an internal tsconfig, does the user need to extend it if they don't add any additional options? Is installation of typescript a requirement? -->

```json
// tsconfig.json
{
  "extends": "rollpkg/configs/tsconfig.json"
}
```

**That’s it!** No complex options to understand or insignificant decisions to make, just sensible defaults for building packages with Rollup and TypeScript. This is what you get with `rollpkg`:

- Zero config builds for ES Modules `esm`, CommonJS `cjs`, and Universal Module Definition `umd` into the `dist` folder.
- The `esm` build supports tree shaking.
- The `umd` build is minified and ready to be used in the browser from the Unpkg cdn, `<script src="https://unpkg.com/<pacakge-name>/dist/<pacakge-name>.umd.min.js"></script>`. The `umd` build is bundled with your package `dependencies`, but with your package `peerDependencies` listed as required globals.
- [Bundlephobia](https://bundlephobia.com/) package size stats for each build
- Strict mode enabled in builds
- Source maps

---

## Using default configs (optional)

Rollpkg provides sensible defaults for common configs that can be used for a complete zero config setup. Default configs are provided for TypeScript, ESLint, Prettier, and Jest (the configs are setup to work with TypeScript, JavaScript, and React). Use of these configs is optional and while they include support for React, using React is not a requirement (they work just fine without React).

### TypeScript config

Having a `tsconfig.json` is a requirement of `rollpkg` because it uses the TypeScript compiler to compile both TypeScript and JavaScript source files. You can extend the `rollpkg` `tsconfig.json` as shown in the setup instructions or create your own. Note that it is highly recommended to extend the `tsconfig.json` provided by `rollpkg` and add your own options after extending it. There is no need to install TypeScript as it is included with `rollpkg`.

```json
// tsconfig.json
{
  "extends": "rollpkg/configs/tsconfig.json"
}
```

### ESLint config

If you want to use ESLint (recommended) you can extend the config provided by `rollpkg`. It includes support for TypeScript, JavaScript, React (including the React Testing Library), Prettier, and Jest (note you do not need to use all/any of these to use the provided ESLint config). The provided ESLint config mostly just extends the recommended defaults for each plugin.

There is no need to install ESLint as it is included with `rollpkg`. In `package.json` add:

```json
"eslintConfig": {
  "extends": ["rollpkg/configs/eslint"]
}
```

### Prettier config

If you want to use Prettier (recommended) you can extend the config provided by `rollpkg`. There is no need to install Prettier as it is included with `rollpkg`. In `package.json` add:

```json
"prettier": "rollpkg/configs/prettier"
```

You may also want to set up a pre-commit hook using `husky` and `lint-staged` so any changes are auto-formatted before being committed. See the [Prettier docs for Git hooks](https://prettier.io/docs/en/install.html#git-hooks).

### Jest config

If you want to use Jest (recommended) you can use the preset provided by `rollpkg`. There is no need to install Jest as it is included with `rollpkg`. In `package.json` add:

```json
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
- `files` array in `package.json` with `src` and `dist` for publishing
- development with linking and `dev` script -> link to npm-package-dev repo
-->