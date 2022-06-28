"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestTreeDataProvider = void 0;
/* eslint-disable @typescript-eslint/naming-convention */
const vscode_1 = require("vscode");
const crypto_1 = require("crypto");
const filterPanel_1 = require("./filterPanel");
let idx = 0;
// ////////////////////////////////////////////////////////////////////////////
// Domain classes
// ////////////////////////////////////////////////////////////////////////////
class Archive {
    constructor() {
        this.uuid = (0, crypto_1.randomUUID)();
        this.internalId = idx++;
        this.title = `Archive ${this.internalId}`;
        this.description = "Lorem Ipsum";
        this.lastUpdated = new Date().toISOString();
        this.hasDownloadableContent = Boolean(Math.round(Math.random()));
        if (this.hasDownloadableContent) {
            const files = [];
            let fileIdx = 1;
            const rnd = Math.round(Math.random() * 5);
            for (let i = 0; i < rnd; i++) {
                const file = new File(fileIdx++);
                files.push(file);
            }
            this.files = new FilesContainer(files);
        }
    }
}
class File {
    constructor(idx) {
        this.uuid = (0, crypto_1.randomUUID)();
        // fake content
        this.content = Math.random().toString(36).slice(2, 7);
        this.name = `File ${idx++}`;
    }
}
class Filter {
    constructor(term, hasFiles) {
        this.term = term;
        this.hasFiles = hasFiles;
    }
}
// ////////////////////////////////////////////////////////////////////////////
// Domain helper classes
// ////////////////////////////////////////////////////////////////////////////
// helper class to represent description content as child of archives in the
// tree
class Description {
    constructor(description) {
        this.description = description;
    }
}
// Adding File[] to the generic array definition will lead to vscode adding
// each file as child of archive instead of an intermediary node. This helper
// class represents the intermediary node
class FilesContainer {
    constructor(files) {
        this.files = files;
    }
}
// artifical class to indicate that more data is available to load
class LoadMore {
    constructor(page) {
        this.page = page;
    }
}
// ////////////////////////////////////////////////////////////////////////////
// Tree item definitions
// ////////////////////////////////////////////////////////////////////////////
class ArchiveNode extends vscode_1.TreeItem {
    constructor(data) {
        super(data.title, vscode_1.TreeItemCollapsibleState.Collapsed);
        this.data = data;
        this.tooltip = new vscode_1.MarkdownString(`$(globe) ${data.uuid}
___
$(book) ${data.description}
___
$(clock) ${data.lastUpdated}
`, true);
        this.iconPath = new vscode_1.ThemeIcon("archive");
        this.contextValue = this.data.hasDownloadableContent ? 'archiveWithFiles' : "archive";
    }
}
class DescriptionNode extends vscode_1.TreeItem {
    constructor(descr) {
        super(descr, vscode_1.TreeItemCollapsibleState.None);
        this.iconPath = new vscode_1.ThemeIcon("book");
    }
}
class FilesNode extends vscode_1.TreeItem {
    constructor(label, files) {
        super(label, vscode_1.TreeItemCollapsibleState.Collapsed);
        this.files = files;
        this.contextValue = "files";
        this.iconPath = new vscode_1.ThemeIcon("files");
    }
}
class FileNode extends vscode_1.TreeItem {
    constructor(file) {
        super(file.name, vscode_1.TreeItemCollapsibleState.None);
        this.file = file;
        this.contextValue = "file";
        this.iconPath = new vscode_1.ThemeIcon("file-text");
        this.tooltip = new vscode_1.MarkdownString(`$(globe) ${file.uuid}
___
$(book) ${file.content}`, true);
    }
}
class MoreNode extends vscode_1.TreeItem {
    constructor(cmd, page = 0) {
        super("...", vscode_1.TreeItemCollapsibleState.None);
        this.page = page;
        this.contextValue = "more";
        this.tooltip = "Load the next set of items";
        this.command = {
            title: "Next page",
            command: cmd,
            tooltip: "Load the next set of items",
            arguments: [page]
        };
    }
}
// ////////////////////////////////////////////////////////////////////////////
// FAKE API methods
// ////////////////////////////////////////////////////////////////////////////
const MAX_RESULTS_PER_PAGE = 10;
const MAX_SAMPLES = 30;
function createTestData() {
    const resources = [];
    for (let i = 0; i < MAX_SAMPLES; i++) {
        resources.push(new Archive());
    }
    return resources;
}
const DATA = createTestData();
function _filteredData(filter) {
    const data = [];
    for (const item of DATA) {
        if (filter.term && filter.hasFiles) {
            if ((item.title.includes(filter.term)
                || item.description.includes(filter.term))
                && item.hasDownloadableContent) {
                data.push(item);
            }
        }
        else if (filter.term && !filter.hasFiles) {
            if (item.title.includes(filter.term)
                || item.description.includes(filter.term)) {
                data.push(item);
            }
        }
        else {
            if (item.hasDownloadableContent) {
                data.push(item);
            }
        }
    }
    return data;
}
function getTestData(filter, page) {
    if (page < 0) {
        page = 0;
    }
    let data;
    if (filter) {
        data = _filteredData(filter);
    }
    else {
        data = DATA;
    }
    const start = page * MAX_RESULTS_PER_PAGE;
    const end = start + MAX_RESULTS_PER_PAGE;
    return data.slice(start, end);
}
function getTotalDataCount(filter) {
    if (filter) {
        return _filteredData(filter).length;
    }
    else {
        return DATA.length;
    }
}
// ////////////////////////////////////////////////////////////////////////////
// Test class
// ////////////////////////////////////////////////////////////////////////////
class TestTreeDataProvider {
    constructor(context) {
        this._onDidChangeTreeData = new vscode_1.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.disposables = [];
        this.items = [];
        this.disposables.push(vscode_1.window.registerTreeDataProvider(TestTreeDataProvider.VIEW, this));
        this.disposables.push(vscode_1.commands.registerCommand(TestTreeDataProvider.RESET_COMMAND, this.resetFilter.bind(this))); // or () => this.resetFilter()
        this.disposables.push(vscode_1.commands.registerCommand(TestTreeDataProvider.NEXT_PAGE_COMMAND, this.nextPage.bind(this))); // or (page: number) => this.nextPage(page)
        this.disposables.push(vscode_1.commands.registerCommand(TestTreeDataProvider.DOWNLOAD_MOST_RECENT_COMMAND, this.downloadMostRecent.bind(this)));
        this.disposables.push(vscode_1.commands.registerCommand(TestTreeDataProvider.DOWNLOAD_SINGLE_FILE_COMMAND, this.downloadFile));
        this.disposables.push(vscode_1.commands.registerCommand(TestTreeDataProvider.DELETE_COMMAND, this.delete.bind(this)));
        this.disposables.push(new filterPanel_1.FilterPanel(context, this));
        this.disposables.forEach(d => context.subscriptions.push(d));
    }
    getTreeItem(element) {
        if (element instanceof LoadMore) {
            return new MoreNode(TestTreeDataProvider.NEXT_PAGE_COMMAND, element.page);
        }
        else if (element instanceof Archive) {
            return new ArchiveNode(element);
        }
        else if (element instanceof Description) {
            return new DescriptionNode(element.description);
        }
        else if (element instanceof FilesContainer) {
            return new FilesNode("files", element);
        }
        else if (element instanceof File) {
            return new FileNode(element);
        }
        throw new Error(`Unsupported tree item ${JSON.stringify(element)}`);
    }
    getChildren(element) {
        if (element) {
            if (element instanceof LoadMore) {
                // LoadMore nodes will never have children
                return [];
            }
            else if (element instanceof Archive) {
                if (element.files) {
                    return [new Description(element.description), element.files];
                }
                else {
                    return [new Description(element.description)];
                }
            }
            else if (element instanceof FilesContainer) {
                return element.files;
            }
            else {
                return undefined;
            }
        }
        else if (this.items.length > 0) {
            return this.items;
        }
        else {
            const items = this.loadData();
            items.forEach(item => this.items.push(item));
            return this.items;
        }
    }
    loadData(page = 0) {
        const items = getTestData(this.filter, page);
        if ((this.items.length + items.length) < getTotalDataCount(this.filter)) {
            items.push(new LoadMore(page + 1));
        }
        return items;
    }
    nextPage(page) {
        if (this.items.length > 0 && this.items[this.items.length - 1] instanceof LoadMore) {
            // remove the last load-more item from the tree
            this.items.pop();
            const newItems = this.loadData(page);
            this.addItemsToTree(newItems);
        }
        this._onDidChangeTreeData.fire();
    }
    addItemsToTree(items) {
        items.forEach(item => this.addItemToTree(item));
        this._onDidChangeTreeData.fire();
    }
    addItemToTree(item) {
        let idx = 0;
        for (idx; idx < this.items.length; idx++) {
            if (item instanceof LoadMore) {
                // add the LoadMore item to the end of the list and call it
                // done
                this.items.push(item);
                return;
            }
            else if (item instanceof Archive) {
                // we may have deleted items in the list which are now 'undefined'
                const curItem = this.items[idx];
                if (curItem) {
                    // sort items by their internal ID
                    if (curItem.internalId > item.internalId) {
                        break;
                    }
                    // we don't need to add the same node twice as we already
                    // added that node previously
                    if (curItem.uuid === item.title) {
                        return;
                    }
                }
            }
        }
        this.items.splice(idx, 0, item);
    }
    async downloadMostRecent(archive) {
        if (archive.files) {
            const files = archive.files.files;
            const mostRecent = files[files.length - 1];
            return this.downloadFile(mostRecent);
        }
        return Promise.resolve();
    }
    async downloadFile(file) {
        return vscode_1.window.showSaveDialog({
            title: "Save file to ..."
        }).then(async (uri) => {
            if (uri) {
                await vscode_1.workspace.fs.writeFile(uri, Buffer.from(file.content));
                return uri;
            }
            return undefined;
        }).then(async (uri) => {
            if (uri) {
                return vscode_1.workspace.openTextDocument(uri);
            }
            return;
        }).then(async (doc) => {
            if (doc) {
                await vscode_1.window.showTextDocument(doc, undefined, false);
            }
        });
    }
    async delete(item) {
        const choice = await this.promptUserAction(`Do you really want to delete archive ${item.title}?`, 'Yes', 'No');
        if (choice === 'Yes') {
            // Determining index of item to delte
            const idx = this.items.findIndex(_item => _item // item may have been deleted before
                && _item instanceof Archive // we are only interested in archives
                && _item.uuid === item.uuid); // and that the UUID matches the one provided as input
            delete this.items[idx];
            // request update of the tree
            this._onDidChangeTreeData.fire();
        }
    }
    async promptUserAction(msg, ...choices) {
        if (!choices || choices.length === 0) {
            return undefined;
        }
        return new Promise((resolve, reject) => {
            void vscode_1.window.showWarningMessage(msg, { modal: true }, ...choices)
                .then((action) => {
                if (action) {
                    resolve(action);
                }
                else {
                    reject(undefined);
                }
            });
        });
    }
    async updateFilter(filter) {
        this.filter = filter;
        await vscode_1.commands.executeCommand("setContext", TestTreeDataProvider.CONTEXT_HAS_FILTER, true);
        this.items = [];
        this._onDidChangeTreeData.fire();
    }
    async resetFilter() {
        this.filter = undefined;
        await vscode_1.commands.executeCommand("setContext", TestTreeDataProvider.CONTEXT_HAS_FILTER, false);
        this.items = [];
        this._onDidChangeTreeData.fire();
    }
    dispose() {
        this.disposables.forEach(disposable => {
            disposable.dispose();
        });
    }
}
exports.TestTreeDataProvider = TestTreeDataProvider;
TestTreeDataProvider.VIEW = "extension.myTreeView";
TestTreeDataProvider.CONTEXT_HAS_FILTER = TestTreeDataProvider.VIEW + ".hasFilter";
TestTreeDataProvider.NEXT_PAGE_COMMAND = TestTreeDataProvider.VIEW + ".loadNextPage";
TestTreeDataProvider.RESET_COMMAND = TestTreeDataProvider.VIEW + ".resetFilter";
TestTreeDataProvider.DELETE_COMMAND = TestTreeDataProvider.VIEW + ".delete";
TestTreeDataProvider.DOWNLOAD_SINGLE_FILE_COMMAND = TestTreeDataProvider.VIEW + ".downloadFile";
TestTreeDataProvider.DOWNLOAD_MOST_RECENT_COMMAND = TestTreeDataProvider.VIEW + ".downloadMostRecent";
//# sourceMappingURL=myTreeProvider.js.map