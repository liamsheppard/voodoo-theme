const { writeFile } = require("fs").promises;
const vscode = require("vscode");

const VOODOO_VARIABLE_USAGE_REGEXP =
	"^\\$[A-Za-z0-9_]*(\\ ((?:100|\\d{1,2})%?|(?:\\.|0\\.)\\d+|1\\.0+))?$";
const VOODOO_VARIABLE_NAME_REGEXP = "^\\$[A-Za-z0-9_]*$";
const VOODOO_VARIABLE_USAGE_DEFAULT = "$";
const VOODOO_TOKEN_SETTINGS_DEFINITION_POINTER =
	"#/properties/tokenColors/anyOf/1/definitions/settings";

const VOODOO_THEME_SCHEMA_EDITS = {
	properties: {
		variables: {
			description:
				"Color variables of the theme. Uses a `[$COLOR_VARIABLE] [optional:OPACITY (% or decimal)]` format.",
			type: "object",
			propertyNames: {
				pattern: VOODOO_VARIABLE_NAME_REGEXP,
			},
			additionalProperties: {
				type: "string",
				format: "color-hex",
			},
		},
		colors: {
			additionalProperties: {
				type: "string",
				pattern: VOODOO_VARIABLE_USAGE_REGEXP,
				defaultSnippets: [{ body: "${1:" + VOODOO_VARIABLE_USAGE_DEFAULT + "}" }],
			},
			$ref: {
				properties: {
					$voodooJoker: {
						format: undefined,
						pattern: VOODOO_VARIABLE_USAGE_REGEXP,
						defaultSnippets: [{ body: "${1:" + VOODOO_VARIABLE_USAGE_DEFAULT + "}" }],
					},
				},
			},
		},
		tokenColors: {
			anyOf: [
				{
					type: "string",
					description: "Path to a tmTheme file (relative to the current file).",
				},
				{
					description: "Colors for syntax highlighting",
					$ref: {
						definitions: {
							colorGroup: {
								anyOf: [
									{ type: "string", format: "color-hex" },
									{ $ref: VOODOO_TOKEN_SETTINGS_DEFINITION_POINTER },
								],
							},
							settings: {
								properties: {
									foreground: {
										format: undefined,
										pattern: VOODOO_VARIABLE_USAGE_REGEXP,
										default: VOODOO_VARIABLE_USAGE_DEFAULT,
									},
								},
								defaultSnippets: [
									{
										body: {
											foreground:
												"${1:" + VOODOO_VARIABLE_USAGE_DEFAULT + "}",
											fontStyle: "${2:bold}",
										},
									},
								],
							},
						},
						items: {
							defaultSnippets: [
								{
									body: {
										scope: "${1:keyword.operator}",
										settings: {
											foreground:
												"${2:" + VOODOO_VARIABLE_USAGE_DEFAULT + "}",
										},
									},
								},
							],
							properties: {
								settings: { $ref: VOODOO_TOKEN_SETTINGS_DEFINITION_POINTER },
							},
						},
					},
				},
			],
		},
	},
};

async function retrieveSchema(uri) {
	return JSON.parse((await vscode.workspace.openTextDocument(uri)).getText());
}

async function applyEditsMapToJson(jsonObject, map) {
	// Exit on invalid parameters (empty map branch).
	if (typeof jsonObject !== "object" || typeof map !== "object") {
		return;
	}

	// Resolve any object-type referenced by the $ref property's value.
	const containsReference = jsonObject.hasOwnProperty("$ref") && map.hasOwnProperty("$ref");

	if (containsReference && typeof map["$ref"] === "object") {
		const schema = await retrieveSchema(vscode.Uri.parse(jsonObject["$ref"]));
		const mappedProperties = map["$ref"];

		delete jsonObject["$ref"];
		Object.getOwnPropertyNames(schema).forEach((property) => {
			jsonObject[property] = schema[property];
		});

		delete map["$ref"];
		Object.getOwnPropertyNames(mappedProperties).forEach((property) => {
			map[property] = mappedProperties[property];
		});

		return await applyEditsMapToJson(jsonObject, map);
	}

	for (const key of Object.getOwnPropertyNames(jsonObject)) {
		// Handle unmapped key.
		if (!map.hasOwnProperty(key) && !map.hasOwnProperty("$voodooJoker")) {
			continue;
		}

		// Apply mapped edits.
		const mappedKey = map.hasOwnProperty(key) ? map[key] : map["$voodooJoker"];

		if (typeof mappedKey === "object") {
			Object.getOwnPropertyNames(mappedKey)
				.filter((x) => {
					if (typeof mappedKey[x] === "object") {
						return jsonObject[key].hasOwnProperty(x)
							? typeof jsonObject[key][x] !== "object" && x !== "$ref"
							: x !== "$voodooJoker";
					} else {
						return true;
					}
				})
				.forEach((property) => {
					jsonObject[key][property] = mappedKey[property];
				});
		} else {
			jsonObject[key] = mappedKey;
		}

		// Explore object types recursively.
		if (typeof jsonObject[key] === "object") {
			await applyEditsMapToJson(jsonObject[key], mappedKey);
		}
	}
}

/**
 * Retrieves the json schema for the Voodoo theme's source file from
 * vscode's built-in color theme schema.
 * @param {vscode.ExtensionContext} context the active Voodoo theme's extension context.
 */
async function refreshJsonSchema(context) {
	const voodooSchemaPath = context.extensionPath + "/theme-src.schema.json";
	const builtInColorThemeUri = vscode.Uri.parse("vscode://schemas/color-theme");

	// Read default json schema resource.
	let themeJsonSchema = await retrieveSchema(builtInColorThemeUri);

	// Apply edits to match theme-src's needs.
	await applyEditsMapToJson(themeJsonSchema, VOODOO_THEME_SCHEMA_EDITS);

	// Write result to the extension's schema file.
	await writeFile(voodooSchemaPath, JSON.stringify(themeJsonSchema) + "\n", "utf-8");
}

module.exports = { refreshJsonSchema };
