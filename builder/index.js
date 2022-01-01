if (process.argv.length < 3) {
	let errorMsg = "Unexpected argv.length! Expected { [0]: node's execPath, [1]: builder's path, [2]: command }, but got: ";
	process.argv.forEach((value, index) => errorMsg += `\n  - [${index}]: ${value}`);

	console.error(errorMsg);
	return;
}

const cmd = process.argv[2];

switch (cmd) {
	case "build-theme":
		require("./build").buildThemeFile();
		break;

	default:
		console.error(`Unsupported command: '${cmd}'! - usage: ./builder build-theme`);
		break;
}