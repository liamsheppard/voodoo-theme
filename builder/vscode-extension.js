const vscode = require("vscode");
const schema = require("./schema");

/**
 * Event function called when the extension is activated.
 * @param {vscode.ExtensionContext} extensionContext the extension's context.
 */
function activate(extensionContext) {
	try {
		schema.refreshJsonSchema(extensionContext);
	} catch (e) {
		vscode.window.showErrorMessage(
			"The Voodoo theme builder failed to refresh './themes/Voodoo-color-source.schema.json'."
		);
	}
}

/**
 * Event function called when the extension is deactivated.
 */
function deactivate() { }

module.exports = { activate, deactivate };
