const path = require("path");
const https = require("https");

function resolvePath(unresolvedPath) {
	try {
		return new URL(unresolvedPath);
	} catch (error) {
		if (error.code !== "ERR_INVALID_URL") {
			throw error;
		}

		let filepath = path.resolve(unresolvedPath).replace("\\", "/");

		if (!filepath.startsWith("/")) {
			filepath = "/" + filepath;
		}

		return new URL(encodeURI("file://" + filepath));
	}
}

function retrieveHttps(url) {
	return new Promise((resolve, reject) => {
		https.get(url, (res) => {
			let body = "";
			res.setEncoding("utf8");
			res.on("data", (data) => (body += data));
			res.on("end", () => resolve(body));
			res.on("error", reject);
		});
	});
}

const { readFile } = require("fs").promises;
const { ParsedThemeObject } = require("./build");

function compareThemeObjects(theme, reference) {
	if (typeof theme !== "object" || typeof reference !== "object") {
		return undefined;
	}

	let diffs = new Map();

	// Filter out additional and missing keys.
	const commonObjectKeys = Object.getOwnPropertyNames(theme).filter((k) =>
		reference.hasOwnProperty(k)
	);

	Object.getOwnPropertyNames(theme).forEach((property) => {
		if (!commonObjectKeys.includes(property)) {
			diffs.set(property, `is not in the reference's file.`);
		}
	});

	Object.getOwnPropertyNames(reference).forEach((property) => {
		if (!commonObjectKeys.includes(property)) {
			diffs.set(property, `is missing from the Voodoo theme's file.`);
		}
	});

	// Compare common keys.
	for (const key of commonObjectKeys) {
		if (typeof theme[key] !== typeof reference[key]) {
			diffs.set(key, `not of the same type in theme and reference.`);
			continue;
		}

		// Special case for token colors to compare scopes instead of
		// names or indexes.
		if (Array.isArray(theme[key]) && key === "tokenColors") {
			let themeTokens = {};
			let themeTokensNoScope = [];

			theme[key].forEach((element, index) => {
				if (!element.scope) {
					themeTokensNoScope.push(element.name ? element.name : index);
				} else {
					themeTokens[element.scope] = element;
				}
			});

			let referenceTokens = {};
			let referenceTokensNoScope = [];

			reference[key].forEach((element, index) => {
				if (!element.scope) {
					referenceTokensNoScope.push(element.name ? element.name : index);
				} else {
					referenceTokens[element.scope] = element;
				}
			});

			let tokenDiffs = compareThemeObjects(themeTokens, referenceTokens);

			themeTokensNoScope.forEach((token) =>
				tokenDiffs.set(token, `defines no scope in the theme's file.`)
			);

			referenceTokensNoScope.forEach((token) =>
				tokenDiffs.set(token, `defines no scope in the reference's file.`)
			);

			diffs.set(key, tokenDiffs);
			continue;
		}

		switch (typeof theme[key]) {
			case "object":
				diffs.set(key, compareThemeObjects(theme[key], reference[key]));
				break;
			case "string":
				let comparison = theme[key].localeCompare(reference[key], undefined, {
					sensitivity: "accent",
				});
				if (comparison !== 0) {
					diffs.set(key, `is \`${theme[key]}\` instead of \`${reference[key]}\`.`);
				}
				break;
			default:
				if (theme[key] != reference[key]) {
					diffs.set(key, `is \`${theme[key]}\` instead of \`${reference[key]}\`.`);
				}
				break;
		}
	}

	return diffs;
}

function formatDifferences(diffs, prefix = "") {
	let logs = [];

	diffs.forEach((value, key) => {
		if (typeof value === "object") {
			let childLogs = formatDifferences(value, `\t${prefix}`);

			if (childLogs.length > 0) {
				logs.push(`${prefix}- ${key}:`);
				childLogs.forEach((log) => logs.push(log));
			}
		} else {
			logs.push(`${prefix}- ${key} ${value}`);
		}
	});

	return logs;
}

/**
 * Compares the active Voodoo theme's colors with those retrieved from the
 * theme file's passed as reference using the theme's built file
 * (Voodoo-color-theme.json) and not the source file.
 * @param {vscode.ExtensionContext} context the active Voodoo theme's extension context.
 * @param {string} reference the local path or URL of the theme file to use as reference.
 */
async function checkConformity(context, reference) {
	const output = context.globalState.get("output");

	output.appendLine("# Started conformity check");
	output.show();

	// Retrieve the theme file's data.
	const themeSourcePath = context.extensionPath + "/themes/Voodoo-color-theme.json";
	const themeSource = await readFile(themeSourcePath, "utf-8");

	// Retrieve the reference file's data.
	const referenceSourcePath = resolvePath(reference);

	if (referenceSourcePath.protocol !== "file:" && referenceSourcePath.protocol !== "https:") {
		throw "Reference only supports file and https protocols.";
	}

	const referenceSource =
		referenceSourcePath.protocol === "https:"
			? await retrieveHttps(referenceSourcePath)
			: await readFile(referenceSourcePath.pathname, "utf-8");

	// Parse retrieved data.
	const themeObject = new ParsedThemeObject(themeSource, true);
	const referenceObject = new ParsedThemeObject(referenceSource, true);

	// Compare the two parsed theme objects.
	const diffs = compareThemeObjects(themeObject, referenceObject);

	// Print differences.
	if (!diffs) {
		return output.appendLine("Couldn't parse theme and/or passed reference.");
	}

	if (diffs.length === 0) {
		return output.appendLine("No diffs! The theme's file conforms to the passed reference.");
	}

	formatDifferences(diffs).forEach((diff) => output.appendLine(diff));
}

module.exports = { checkConformity };
