'use strict';
const path = require('path');
const blacklist = require('metro-config/src/defaults/blacklist');
const escape = require('escape-string-regexp');

const packageRoot = path.resolve(__dirname, '..');

const aliasedModules = ['react', 'react-native'];

module.exports = {
  projectRoot: __dirname,
  watchFolders: [packageRoot],
  resolver: {
    blacklistRE: blacklist(
      aliasedModules.map(
        (m) =>
          new RegExp(`^${escape(path.join(packageRoot, 'node_modules', m))}\\/.*$`),
      ),
    ),
    extraNodeModules: Object.fromEntries(
      aliasedModules.map((module) => [
        module,
        path.join(__dirname, 'node_modules', module),
      ]),
    ),
  },
  transformer: {
    getTransformOptions: async () => ({
      transform: {
        experimentalImportSupport: false,
        inlineRequires: false,
      },
    }),
  },
};
