import { resolve } from 'path';
import {
  convertPkgNameToKebabCase,
  convertKebabCaseToPascalCase,
  fileExists,
} from '../utils';

test('converts scoped package name to kebab case', () => {
  const received = convertPkgNameToKebabCase('@scope/package-name');
  expect(received).toBe('scope-package-name');
});

test('converts kebab case to pascal case', () => {
  const received = convertKebabCaseToPascalCase('package-name');
  expect(received).toBe('PackageName');
});

test('file exists returns true when the file exists', async () => {
  const received = await fileExists(
    // use this test file for the existence test since it has to exist
    resolve(process.cwd(), 'src', '__tests__'),
    'utils.test.ts',
  );
  expect(received).toBe(true);
});

test('file exists returns false when the file does not exist', async () => {
  const received = await fileExists(
    resolve(process.cwd(), 'src', '__tests__'),
    'foo',
  );
  expect(received).toBe(false);
});
