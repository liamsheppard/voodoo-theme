<p align="center"><img src="https://github.com/liamsheppard/voodoo-theme/blob/master/images/readme-icon.png?raw=true"/></p>

<p align="center">A dark, neon-inspired theme for VS-Code</p>

---

<p align="center">Issues and PRs are welcome! 👻</p>

![](https://github.com/liamsheppard/voodoo-theme/blob/master/images/main.png?raw=true)

---

## How to contribute

Voodoo is built from `./themes/Voodoo-color-source.json`, a file that contains the theme's color palette as a dictionary of variables and color codes which are then used to stylize multiple syntax scopes and tokens at once.

To build the theme yourself, all you need is to execute the package's pre-defined scripts as follow:

```sh
# You'll need some dependencies which aren't shipped with the extension, aka the strip-json-comments module.
yarn install # or npm install

# Then:
yarn build # or npm run build
```

The theme's builder will read the `./themes/Voodoo-color-source.json` source file from either the active vscode's workspace or its own root path (`./builder/../themes/`). The resulting file is then output in the source file's directory as `Voodoo-color-theme.json`.

Conversely, the recommended setup is to simply grab the theme from its git repository and work from there. Working directly from the repository's also comes with extra benefits such as pre-configured `.vscode/*.json` settings to debug using the extension host or build using the "Build Task" or the `ctrl+shift+b` shortcut.

Finally, the builder's uses the `./builder/vscode-extension.js` module as its entry point to generate `./themes/Voodoo-color-source.schema.json`, a json schema file which is used to validate the theme's source file formatting as well as provide useful insight and descriptions while editing.
