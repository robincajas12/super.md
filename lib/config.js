const path = require("path");

const resolveConfigPath = (p, configDir) =>
  path.isAbsolute(p) ? p : path.resolve(configDir, p);

function applyConfig(config, configDir, defaults) {
  const result = { ...defaults };

  if (config.sourceDir) result.SOURCE_DIR = resolveConfigPath(config.sourceDir, configDir);
  if (config.mountPoint) result.MOUNT_POINT = resolveConfigPath(config.mountPoint, configDir);
  if (config.scriptsDir) result.SCRIPTS_DIR = resolveConfigPath(config.scriptsDir, configDir);
  if (config.workingDir) result.WORKING_DIR = resolveConfigPath(config.workingDir, configDir);
  if (config.projectDir) result.PROJECT_DIR = resolveConfigPath(config.projectDir, configDir);

  return result;
}

module.exports = {
  resolveConfigPath,
  applyConfig,
};
