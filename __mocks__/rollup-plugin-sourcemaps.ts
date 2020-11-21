import { rollupPluginMockImplementation } from './helpers/rollupPluginMockImplementation';

const sourcemaps = jest.fn(
  rollupPluginMockImplementation('rollup-plugin-sourcemaps'),
);

export default sourcemaps;
