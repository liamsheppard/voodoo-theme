const vscode = require("vscode");
const schema = require("./schema");
const build = require("./build");

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
	schema.refreshJsonSchema(extensionContext);

	// Register extension's commands.
	[
		vscode.commands.registerCommand("voodoo.startBuilder", () => {
			vscode.window.showInformationMessage("Voodoo theme's builder extension activated!");
		}),
		vscode.commands.registerCommand("voodoo.buildTheme", () => {
			build.buildThemeFile(extensionContext);
		}),
	].forEach((cmd) => extensionContext.subscriptions.push(cmd));

	setContextEnabledValue(true);
}

/**
 * Event function called when the extension is deactivated.
 */
function deactivate() {
	setContextEnabledValue(false);
}

module.exports = { activate, deactivate };
