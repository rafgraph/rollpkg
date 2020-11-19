module.exports = {
  parser: '@typescript-eslint/parser',
  parserOptions: {
    sourceType: 'module',
    // note that eslint resolves this relative to where eslint is "run", so the tsconfig
    // this references is the tsconfig in the project root (that uses rollpkg)
    // and not the rollpkg tsconfig that is in this configs directory
    // which is good as eslint type checking should be based on the project's tsconfig
    project: './tsconfig.json',
  },
  env: {
    browser: true,
    node: true,
  },
  extends: [
    'eslint:recommended',
    'plugin:import/errors',
    'plugin:import/warnings',
    'plugin:import/typescript',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:jest/recommended',
    'plugin:jest/style',
    'plugin:jest-dom/recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:@typescript-eslint/recommended-requiring-type-checking',
    'prettier',
    'prettier/@typescript-eslint',
    'prettier/react',
  ],
  settings: {
    react: {
      // to indicate latest version
      // https://github.com/yannickcr/eslint-plugin-react/blob/b8e91a571bc6b58cc3c78e9e62e8b60ecb45e233/lib/util/version.js#L48
      version: '999.999.999',
    },
  },
  rules: {
    // see for rational https://basarat.gitbook.io/typescript/main-1/defaultisbad
    'import/no-default-export': 'error',
    '@typescript-eslint/restrict-template-expressions': 'off',
  },
  overrides: [
    {
      // required because of https://github.com/yannickcr/eslint-plugin-react/issues/2353
      // otherwise get missing prop-types error in tsx files
      files: ['**/*.tsx'],
      rules: {
        'react/prop-types': 'off',
      },
    },
  ],
  ignorePatterns: ['dist', 'node_modules'],
};
