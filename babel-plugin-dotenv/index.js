var dotEnv = require("dotenv");
var fs = require("fs");
var sysPath = require("path");
var process = require("process");

const configObject = ({ configDir, configFile }) =>
  Object.assign(
    dotEnv.config({
      path: sysPath.join(configDir, configFile),
      silent: true
    }) || {},
    dotEnv.config({
      path: sysPath.join(configDir, envPath({ configFile })),
      silent: true
    })
  );
const getEnvFile = ({ filename = ".env" }) => filename;
const envPath = ({ configFile }) =>
  process.env.BABEL_ENV === "development" || process.env.BABEL_ENV === undefined
    ? configFile + ".development"
    : configFile + ".production";

const importConfig = ({ config, configFile, path, types }) => (
  { type, imported, local },
  idx
) => {
  if (type === "ImportDefaultSpecifier") {
    throw path
      .get("specifiers")
      [idx].buildCodeFrameError("Import dotenv as default is not supported.");
  }
  var importedId = imported.name;
  var localId = local.name;
  if (!config.hasOwnProperty(importedId)) {
    throw path
      .get("specifiers")
      [idx].buildCodeFrameError(
        'Try to import dotenv variable "' +
          importedId +
          '" which is not defined in any ' +
          configFile +
          " files."
      );
  }

  path.scope.getBinding(localId).referencePaths.forEach(refPath => {
    refPath.replaceWith(types.valueToNode(config[importedId]));
  });
};

module.exports = ({ types }) => ({
  visitor: {
    ImportDeclaration: (path, { opts: options }) => {
      if (options.replacedModuleName === undefined) return;
      if (path.node.source.value === options.replacedModuleName) {
        const configFile = getEnvFile(options);
        const config = configObject({
          configDir: options.configDir || "./",
          configFile
        });

        path.node.specifiers.forEach(
          importConfig({ path, config, configFile, types })
        );

        path.remove();
      }
    }
  }
});
