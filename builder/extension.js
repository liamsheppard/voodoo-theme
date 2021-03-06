const vscode = require("vscode");
const schema = require("./schema");
const build = require("./build");
const conformity = require("./conformity");

/**
 * Sets the context's `voodoo.builder.enabled` property value.
 * @param {boolean} value the boolean value to assign.
 */
function setContextEnabledValue(value) {
	vscode.commands.executeCommand("setContext", "voodoo.builder.enabled", value);
}

/**
 * Event function called when the extension is activated.
 * @param {vscode.ExtensionContext} extensionContext the extension's context.
 */
function activate(extensionContext) {
	// Register extension's commands.
	[
		vscode.commands.registerCommand("voodoo.buildTheme", () => {
			try {
				build.buildThemeFile();
			} catch (e) {
				vscode.window.showErrorMessage(
					`The Voodoo theme builder failed to build the theme-src.json file. ${e}`
				);
			}
		}),
		vscode.commands.registerCommand("voodoo.checkConformity", () => {
			const defaultReference =
				"https://raw.githubusercontent.com/liamsheppard/voodoo-theme/master/themes/Voodoo-color-theme.json";
			vscode.window
				.showInputBox({
					placeHolder: "Local path or URL of the theme file to use as reference",
					value: defaultReference,
					valueSelection: [0, defaultReference.length],
				})
				.then((input) => conformity.checkConformity(extensionContext, input));
		}),
	].forEach((cmd) => extensionContext.subscriptions.push(cmd));

	// Setup the extension's context.
	extensionContext.globalState.update(
		"output",
		vscode.window.createOutputChannel("Voodoo Builder")
	);

	try {
		schema.refreshJsonSchema(extensionContext);
	} catch (e) {
		vscode.window.showErrorMessage(
			"The Voodoo theme builder failed to refresh the theme-src.json's schema."
		);
	}

	setContextEnabledValue(true);
}

/**
 * Event function called when the extension is deactivated.
 */
function deactivate() {
	setContextEnabledValue(false);
}

module.exports = { activate, deactivate };
