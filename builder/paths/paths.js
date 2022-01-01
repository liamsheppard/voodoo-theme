const THEME_SOURCE_FILENAME = "Voodoo-color-source.json";
const THEME_SOURCE_SCHEMA_FILENAME = "Voodoo-color-source.schema.json";
const THEME_BUILD_FILENAME = "Voodoo-color-theme.json";

const logger = require("../logger");

class VoodooPaths {
	instance = undefined;

	constructor() {
		try {
			this.instance = new (require("./vscode-paths").VoodooVscodePaths)();
		} catch (error) {
			if (error.code != "MODULE_NOT_FOUND") {
				throw error;
			}

			this.instance = new (require("./workspace-paths").VoodooWorkspacePaths)();
		}
	}
}

const paths = new VoodooPaths();

/**
 * Finds the paths of all Voodoo theme source files in the current workspace.
 * @returns {Thenable<string[]>} the paths of all suitable Voodoo theme source files in the current workspace.
 */
function getThemeSourcesPaths() {
	return paths.instance.getThemeSourcesPaths(THEME_SOURCE_FILENAME);
}

/**
 * Returns the build's path based on the used theme source's path.
 * @param {string} sourcePath the source path we are building from.
 * @returns {string} the build path derived from the source path passed as parameter.
 */
function getBuildPathFrom(sourcePath) {
	return sourcePath.slice(0, -THEME_SOURCE_FILENAME.length) + THEME_BUILD_FILENAME;
}

/**
 * Logs the paths of all files in the current workspace that could potentially
 * be a Voodoo theme source file based on the its name.
 * @returns {Thenable<void>} the callback that will hint at potential theme sources paths through the logger's available channels.
 */
async function hintPotentialThemeSourcesPaths() {
	return paths.instance.getPotentialThemeSourcesPaths(THEME_SOURCE_FILENAME).then(filepaths => {
		if (filepaths.length == 0) {
			return;
		}

		let hintPaths = "Found " + filepaths.length + " potential matches outside of the expected '**/themes/' directory:";
		filepaths.forEach(filepath => hintPaths += `\n  - ${filepath}`);

		logger.log(hintPaths, "paths");
	});
}

/**
 * Logs the paths of all suitable Voodoo theme source files in the current
 * workspace based.
 * @returns {Thenable<void>} the callback that will hint at suitable theme sources paths through the logger's available channels.
 */
async function hintSuitableThemeSourcesPaths() {
	return getThemeSourcesPaths(THEME_SOURCE_FILENAME).then(filepaths => {
		if (filepaths.length == 0) {
			return;
		}

		let hintPaths = "Found " + filepaths.length + " suitable matches in the current workspace:";
		filepaths.forEach(filepath => hintPaths += `\n  - ${filepath}`);

		logger.log(hintPaths, "paths");
	});
}

/**
 * @returns {string} the name of the paths.instance object.
 */
function getInstanceType() {
	return paths.instance.getInstanceType();
}

module.exports = { getThemeSourcesPaths, getBuildPathFrom, hintPotentialThemeSourcesPaths, hintSuitableThemeSourcesPaths, getInstanceType, THEME_SOURCE_SCHEMA_FILENAME };