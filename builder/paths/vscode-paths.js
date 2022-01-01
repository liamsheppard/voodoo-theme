const vscode = require("vscode");

class VoodooVscodePaths {
	getInstanceType() {
		return "Voodoo VSCode Paths";
	}

	async getThemeSourcesPaths(filename) {
		const uris = await vscode.workspace.findFiles("**/themes/" + filename);
		return uris.map(uri => uri.fsPath);
	}

	async getPotentialThemeSourcesPaths(filename) {
		const uris = await vscode.workspace.findFiles("**/" + THEME_SOURCE_FILENAME);
		return uris.map(uri => uri.fsPath);
	}
}

module.exports = { VoodooVscodePaths };