"use strict";
/* eslint-disable @typescript-eslint/naming-convention */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilterPanel = void 0;
const vscode_1 = require("vscode");
function createWebViewPanel(name, title, messageHandler, disposeHandler) {
    // create and show a WebView
    const panel = vscode_1.window.createWebviewPanel(name, // the internal name of the view
    title, // title of the panel displayed to the user
    vscode_1.ViewColumn.Beside, // editor column to show the new WebView panel in
    // WebView options
    {
        enableFindWidget: true,
        enableScripts: true
    });
    panel.onDidDispose(() => {
        if (disposeHandler) {
            disposeHandler();
        }
    }, null);
    if (messageHandler) {
        messageHandler(panel);
    }
    return panel;
}
function getNonce() {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
class FilterPanel {
    constructor(context, viewProvider) {
        this.viewProvider = viewProvider;
        this.disposables = [];
        this.disposables.push(vscode_1.commands.registerCommand(FilterPanel.FILTER_CMD, () => {
            if (!this.panel) {
                this.panel = createWebViewPanel("filter", FilterPanel.TITLE, this.addMessageHandler.bind(this), () => {
                    this.panel = undefined;
                });
            }
            this.panel.webview.html = this.renderMappingsTagFilterForm(this.panel, context.extensionUri);
        }));
        this.disposables.forEach(d => context.subscriptions.push(d));
    }
    renderMappingsTagFilterForm(panel, extensionUri) {
        const styleVSCodeUri = panel.webview.asWebviewUri(vscode_1.Uri.joinPath(extensionUri, 'src', 'vscode.css'));
        const styleUri = panel.webview.asWebviewUri(vscode_1.Uri.joinPath(extensionUri, 'src', 'style.css'));
        const scriptUri = panel.webview.asWebviewUri(vscode_1.Uri.joinPath(extensionUri, 'src', 'filter.js'));
        const nonce = getNonce();
        const staticContent = `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <!--
                    Use a content security policy to only allow loading images from https or from our extension directory,
                    and only allow scripts that have a specific nonce.
                -->
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${panel.webview.cspSource}; script-src 'nonce-${nonce}';" />

                <meta name="viewport" content="width=device-width, initial-scale=1.0" />

                <link href="${styleVSCodeUri}" rel="stylesheet">
                <link href="${styleUri}" rel="stylesheet">
                <script nonce="${nonce}" src="${scriptUri}"></script>
                
                <title>"${FilterPanel.TITLE}"</title>
            </head>
            <body>`;
        const staticContentEnd = `</body></html>`;
        const content = `<h1>${FilterPanel.TITLE}</h1>
            <br/>
            <form id="filterForm">
                <label for="term">Filter term:</label><br/>
                <input id="term" type="text" /><br/>

                <label for="hasFiles">Show only archives with files?</label><br/>
                <input id="hasFiles" type="checkbox" value="false" /><br/><br/>

                <input type="submit" value="Submit">
            </form>`;
        return staticContent + content + staticContentEnd;
    }
    addMessageHandler(panel) {
        panel.webview.onDidReceiveMessage(async (message) => {
            switch (message.command) {
                case "filter":
                    await this.viewProvider.updateFilter({
                        term: message.term,
                        hasFiles: message.hasFiles
                    });
                    panel.dispose();
                    break;
            }
        });
    }
    dispose() {
        this.disposables.forEach(disposable => {
            disposable.dispose();
        });
    }
}
exports.FilterPanel = FilterPanel;
FilterPanel.PANEL = "extension.myTreeView.filterPanel";
FilterPanel.FILTER_CMD = FilterPanel.PANEL + ".filter";
FilterPanel.TITLE = "Filter";
//# sourceMappingURL=filterPanel.js.map