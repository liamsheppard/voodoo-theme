class VoodooLogger {
	#vscodeOutputChannel = undefined;
	#notInVscode = false;

	/**
	 * @returns {vscode.OutputChannel} the vscode output channel used by the extension.
	 */
	get outputChannel() {
		if (this.#vscodeOutputChannel != undefined || this.#notInVscode) {
			return this.#vscodeOutputChannel
		}

		try {
			const vscode = require("vscode");

			this.#vscodeOutputChannel = vscode.window.createOutputChannel("voodoo-builder");
			this.#vscodeOutputChannel.show();

			vscode.window.showInformationMessage("Extension details logged in 'Output > voodoo-builder'.");
		} catch (error) {
			if (error.code != "MODULE_NOT_FOUND") {
				throw error;
			}

			this.#notInVscode = true;
		}

		return this.#vscodeOutputChannel;
	}

	/**
	 * Logs the passed message in the extension's output channel when called
	 * from a vscode extension and in the JS console.
	 * @param {string} message the message to log.
	 */
	log(message) {
		console.log(message);

		if (!this.#notInVscode && this.outputChannel != undefined) {
			this.outputChannel.appendLine(message);
		}
	}
}

const logger = new VoodooLogger();

function getCurrentDateTime() {
	const dtNow = new Date();
	const dtLocalOffsetInMs = dtNow.getTimezoneOffset() * 60 * 1000;
	const dtLocalIsoString = new Date(dtNow.getTime() - dtLocalOffsetInMs).toISOString();
	return dtLocalIsoString.replace("T", " ").replace("Z", "");
}

/**
 * Logs the passed message in the extension's output channel with an `info` tag.
 * @param {string} message the log's content.
 * @param {string} process the logging process.
 */
function log(message, process = undefined) {
	logger.log(`[${getCurrentDateTime()}]${process ? ` [${process}] ` : " "}${message}`);
}

module.exports = { log };