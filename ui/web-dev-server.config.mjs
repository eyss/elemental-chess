import plugins from './web-dev.plugins.mjs';

const rootDir =
  process.env.ENV === 'holodev' ? `dist-${process.env.HC_PORT}` : 'dist';

export default {
  watch: true,
  rootDir,
  appIndex: 'index.html',
  open: true,
  plugins,
};
