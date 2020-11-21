import { rollupPluginMockImplementation } from '../helpers/rollupPluginMockImplementation';

const babel = jest.fn(rollupPluginMockImplementation('@rollup/plugin-babel'));

export default babel;
