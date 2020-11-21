import { rollupPluginMockImplementation } from '../helpers/rollupPluginMockImplementation';

const replace = jest.fn(
  rollupPluginMockImplementation('@rollup/plugin-replace'),
);

export default replace;
