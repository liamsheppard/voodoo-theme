const stripJsonComments = require("strip-json-comments");

/**
 * JS object implementing properties equivalent to those of a vscode
 * theme json object as well as utility methods to populate them.
 */
class ParsedThemeObject {
	/**
	 * Constructor taking in the Voodoo theme source file's raw content as
	 * a string and using it to populate the object's properties.
	 * @param {string} jsonSource the Voodoo theme source file's content.
	 * @param {boolean} useRawValues whether to parse variables or use their raw values.
	 */
	constructor(jsonSource, useRawValues = false) {
		// Parse the json source.
		let source = JSON.parse(
			stripJsonComments(jsonSource).replace(/\,(?!\s*?[\{\[\"\'\w])/g, "")
		);

		// Parse the theme's properties.
		this.colors = {};
		this.tokenColors = [];

		Object.getOwnPropertyNames(source)
			.filter((property) => !this.hasOwnProperty(property))
			.forEach((property) => (this[property] = source[property]));

		source.useRawValues = useRawValues;

		this.#parseColors(source);
		this.#parseTokenColors(source);
	}

	#parseVariable(value, source) {
		const components = value.split(" ");

		// Check if variable exists.
		if (!source.hasOwnProperty("variables") || !(components[0] in source.variables)) {
			return value;
		}

		// Check whether to apply a custom opacity.
		if (components.length != 2) {
			return source.variables[components[0]];
		}

		// Update the variable's value to match custom opacity.
		let alpha = /^(?:100|\d{1,2}(?:\.\d+)?)%$/g.test(components[1])
			? parseFloat(components[1].split(0, -1)) / 100
			: parseFloat(components[1]);

		value = source.variables[components[0]];

		if (/^#[a-f0-9]{3,4}$/gi.test(value)) {
			let r = value[1] + value[1];
			let g = value[2] + value[2];
			let b = value[3] + value[3];

			value = value[4] ? `#${r}${g}${b}${value[4] + value[4]}` : `#${r}${g}${b}`;
		}

		let a = /^#[a-f0-9]{8}$/gi.test(value)
			? parseFloat(parseInt(colour.substr(7, 2), 16) / 255)
			: undefined;

		return a
			? value.substr(0, 7) + !isNaN(alpha)
				? parseInt(alpha * a * 255).toString(16)
				: "00"
			: (value += !isNaN(alpha) ? parseInt(alpha * 255).toString(16) : "00");
	}

	#parseTokenColors(source) {
		// Check if the theme's source does contain token colors.
		if (!source.hasOwnProperty("tokenColors")) {
			return;
		}

		// Use raw source token colors' values.
		if (source.useRawValues) {
			return (this.tokenColors = source.tokenColors);
		}

		// Filter out tokens without settings.
		const tokenColors = source.tokenColors.filter((token) => token.hasOwnProperty("settings"));

		// Parse colors from the source's colors and variables properties.
		tokenColors.forEach((scope) => {
			if (!scope.settings.hasOwnProperty("foreground")) {
				return;
			}

			scope.settings.foreground = this.#parseVariable(scope.settings.foreground, source);
		});

		this.tokenColors = tokenColors;
	}

	#parseColors(source) {
		// Check if the theme's source does contain colors.
		if (!source.hasOwnProperty("colors")) {
			return;
		}

		// Use raw source colors' values.
		if (source.useRawValues) {
			return (this.colors = source.colors);
		}

		// Parse colors from the source's colors and variables properties.
		Object.entries(source.colors).forEach(([key, value]) => {
			this.colors[key] = this.#parseVariable(value, source);
		});
	}
}

const { readFile, writeFile } = require("fs").promises;
const paths = require("./paths/paths");
const logger = require("./logger");

/**
 * Retrieves the json schema for the Voodoo theme's source file from
 * vscode's built-in color theme schema and returns the resulting parsed
 * theme object.
 */
async function buildThemeFile() {
	logger.log("Build started...", "build");
	logger.log(`Will be using '${paths.getInstanceType()}' to retrieve paths.`, "build");

	const themeSourcesPaths = await paths.getThemeSourcesPaths();
	let themeSourcePath = undefined;

	switch (themeSourcesPaths.length) {
		case 1:
			themeSourcePath = themeSourcesPaths[0];
			break;

		case 0:
			logger.log("BUILD FAILED: no suitable Voodoo theme source file found in the current workspace!\n", "build");
			await paths.hintPotentialThemeSourcesPaths();
			return;

		default:
			logger.log("BUILD FAILED: found multiple suitable Voodoo theme source files in the current workspace! Please keep a single active source file under the '**/themes/' directory before building.\n", "build");
			await paths.hintSuitableThemeSourcesPaths();
			return;
	}

	logger.log(`Reading theme from '${themeSourcePath}'`, "build");

	const themeSource = await readFile(themeSourcePath, "utf-8");
	const themeObject = new ParsedThemeObject(themeSource);

	const buildPath = paths.getBuildPathFrom(themeSourcePath);

	logger.log(`Writing theme to '${buildPath}'`, "build");

	await writeFile(buildPath, JSON.stringify(themeObject) + "\n", "utf-8");

	logger.log("BUILD SUCCEEDED.\n", "build");
}

async function buildJsonSchema() {
	logger.log("buildJsonSchema not implemented yet.", "build");
}

module.exports = { buildThemeFile, ParsedThemeObject, buildJsonSchema };