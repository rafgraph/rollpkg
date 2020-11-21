import { rollupPluginMockImplementation } from '../helpers/rollupPluginMockImplementation';

const commonjs = jest.fn(
  rollupPluginMockImplementation('@rollup/plugin-commonjs'),
);

export default commonjs;
