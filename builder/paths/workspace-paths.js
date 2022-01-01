const path = require('path');
const fs = require('fs');

class VoodooWorkspacePaths {
	getInstanceType() {
		return "Voodoo Workspace Paths";
	}

	getThemeSourcesPaths(filename) {
		return new Promise((resolve) => {
			const workspacePath = path.join(__dirname, '../../themes');
			const filepaths = fs.readdirSync(workspacePath);

			let themeSourcesPaths = [];

			filepaths.forEach(filepath => {
				if (filepath == filename) {
					themeSourcesPaths.push(path.join(workspacePath, filepath));
				}
			});

			resolve(themeSourcesPaths);
		});
	}

	getPotentialThemeSourcesPaths(filename) {
		return new Promise((resolve) => {
			const workspacePath = path.join(__dirname, '../..');
			const filepaths = fs.readdirSync(workspacePath);

			let themeSourcesPaths = [];

			filepaths.forEach(filepath => {
				if (filepath == filename) {
					themeSourcesPaths.push(path.join(workspacePath, filepath));
				}
			});

			resolve(themeSourcesPaths);
		});
	}
}

module.exports = { VoodooWorkspacePaths };