const { writeFile } = require("fs").promises;
const vscode = require("vscode");

const VOODOO_VARIABLE_USAGE_REGEXP =
	"^\\$[A-Za-z0-9_]*(\\ ((?:100|\\d{1,2}(?:\\.\\d+)?)%|(?:\\.|0\\.)\\d+|1\\.0+))?$";
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
				description:
					"Additional workbench color, most likely contributed by a missing extension.",
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

/**
 * @param {vscode.Uri} uri Uri to retrieve the json schema from.
 */
async function retrieveSchemaFromUri(uri) {
	const schemaDefinitionFile = await vscode.workspace.openTextDocument(uri);
	return JSON.parse(schemaDefinitionFile.getText());
}

async function applyEditsMapToJson(jsonSchemaObject, map) {
	// Exit on invalid parameters (empty map branch).
	if (typeof jsonSchemaObject !== "object" || typeof map !== "object") {
		return;
	}

	// Resolve any object-type referenced by the $ref property's value.
	const containsReference = jsonSchemaObject.hasOwnProperty("$ref") && map.hasOwnProperty("$ref");

	if (containsReference && typeof map["$ref"] === "object") {
		const schema = await retrieveSchemaFromUri(vscode.Uri.parse(jsonSchemaObject["$ref"]));
		const mappedProperties = map["$ref"];

		delete jsonSchemaObject["$ref"];
		Object.getOwnPropertyNames(schema).forEach((property) => {
			jsonSchemaObject[property] = schema[property];
		});

		delete map["$ref"];
		Object.getOwnPropertyNames(mappedProperties).forEach((property) => {
			map[property] = mappedProperties[property];
		});

		return await applyEditsMapToJson(jsonSchemaObject, map);
	}

	for (const key of Object.getOwnPropertyNames(jsonSchemaObject)) {
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
						return jsonSchemaObject[key].hasOwnProperty(x)
							? typeof jsonSchemaObject[key][x] !== "object" && x !== "$ref"
							: x !== "$voodooJoker";
					} else {
						return true;
					}
				})
				.forEach((property) => {
					jsonSchemaObject[key][property] = mappedKey[property];
				});
		} else {
			jsonSchemaObject[key] = mappedKey;
		}

		// Explore object types recursively.
		if (typeof jsonSchemaObject[key] === "object") {
			await applyEditsMapToJson(jsonSchemaObject[key], mappedKey);
		}
	}
}

const paths = require("./paths/paths");

/**
 * Refreshes the json schema file used by the extension to validate Voodoo's
 * theme source.
 * @param {vscode.ExtensionContext} context Voodoo's current extension context.
 */
async function refreshJsonSchema(context) {
	// Retrieve the built-in json schema for themes from vscode's resources.
	const builtInSchemaUri = vscode.Uri.parse("vscode://schemas/color-theme");
	const builtInJsonSchema = await retrieveSchemaFromUri(builtInSchemaUri);

	// Apply edits to the retrieved built-in json schema to address Voodoo's
	// theme source needs.
	await applyEditsMapToJson(builtInJsonSchema, VOODOO_THEME_SCHEMA_EDITS);

	// Write the resulting json schema file at the expected path from the current
	// extension's root.
	const voodooSchemaPath = `${context.extensionPath}/themes/${paths.THEME_SOURCE_SCHEMA_FILENAME}`;
	await writeFile(voodooSchemaPath, JSON.stringify(builtInJsonSchema) + "\n", "utf-8");
}

module.exports = { refreshJsonSchema };
