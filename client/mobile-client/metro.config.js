const { getDefaultConfig } = require('expo/metro-config');

<<<<<<< HEAD
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch only the workspace package used by the mobile app.
config.watchFolders = [path.resolve(workspaceRoot, 'packages/shared')];

// 2. Let Metro know where to resolve packages, and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve (sub)dependencies only from the `nodeModulesPaths`
config.resolver.disableHierarchicalLookup = false;

// 4. Trỏ thẳng shared-types vào source (không qua dist đã build)
config.resolver.extraNodeModules = {
  '@gps-attendance/shared': path.resolve(workspaceRoot, 'packages/shared/src'),
};
=======
const config = getDefaultConfig(__dirname);
>>>>>>> 6fd913c335f579fabcfa125705e1b5a16fa99917

module.exports = config;
