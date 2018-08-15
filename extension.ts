// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below

import {window, workspace, languages, commands, Disposable, ExtensionContext, StatusBarAlignment, StatusBarItem, TextDocument} from 'vscode';

var dev_log = null;

function dbg_log(msg) {
    if (!dev_log) {
        dev_log = window.createOutputChannel("hello_world_dev");
    }
    dev_log.show();
    dev_log.appendLine(msg);
}

var active_doc_before = null;
var active_editor_before = null;

function after_lang_change() {
    let editor = window.activeTextEditor;
    let active_doc = editor.document;
    if (editor == active_editor_before) {
        dbg_log('same editor');
    } else {
        dbg_log('different editor');
    }
    if (active_doc == active_doc_before) {
        dbg_log('same doc');
    } else {
        dbg_log('different doc');
    }
}


function language_set_by_id(language_id) {
    let editor = window.activeTextEditor;
    let active_doc = editor.document;
    let cur_uri = active_doc.uri;
    dbg_log('cur_uri.toString(): ' + cur_uri.toString());
    dbg_log('cur_uri.toString() 2: ' + cur_uri.toString());
    active_doc_before = active_doc;
    active_editor_before = editor;
    languages.setLanguageById(cur_uri, language_id);
    setTimeout(after_lang_change, 2000);
}


function set_new_language() {
    var handle_failure = function(reason) { dbg_log('Unable to create input box: ' + reason); };
    var input_box_props = {"ignoreFocusOut": true, "prompt": 'enter new language id'};
    window.showInputBox(input_box_props).then(language_set_by_id, handle_failure);
}



// this method is called when your extension is activated. activation is
// controlled by the activation events defined in package.json
export function activate(ctx: ExtensionContext) {

    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    console.log('Congratulations, your extension "Wordcount" is now active!');

    // create a new word counter
    let wordCounter = new WordCounter();
    let controller = new WordCounterController(wordCounter);
    var set_lang_cmd = commands.registerCommand('extension.WCSetNewLanguage', set_new_language);

    // add to a list of disposables which are disposed when this extension
    // is deactivated again.
    ctx.subscriptions.push(controller);
    ctx.subscriptions.push(wordCounter);
    ctx.subscriptions.push(set_lang_cmd);
}

export class WordCounter {

    private _statusBarItem: StatusBarItem;

    public updateWordCount() {
        
        // Create as needed
        if (!this._statusBarItem) {
            this._statusBarItem = window.createStatusBarItem(StatusBarAlignment.Left);
        } 

        // Get the current text editor
        let editor = window.activeTextEditor;
        if (!editor) {
            this._statusBarItem.hide();
            return;
        }

        let doc = editor.document;

        // Only update status if an MD file
        if (doc.languageId === "markdown") {
            let wordCount = this._getWordCount(doc);

            // Update the status bar
            this._statusBarItem.text = wordCount !== 1 ? `$(pencil) ${wordCount} Words` : '$(pencil) 1 Word';
            this._statusBarItem.show();
        } else {
            this._statusBarItem.hide();
        }
    }

    public _getWordCount(doc: TextDocument): number {
        let docContent = doc.getText();

        // Parse out unwanted whitespace so the split is accurate
        docContent = docContent.replace(/(< ([^>]+)<)/g, '').replace(/\s+/g, ' ');
        docContent = docContent.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        let wordCount = 0;
        if (docContent != "") {
            wordCount = docContent.split(" ").length;
        }

        return wordCount;
    }

    public dispose() {
        this._statusBarItem.dispose();
    }
}

class WordCounterController {

    private _wordCounter: WordCounter;
    private _disposable: Disposable;

    constructor(wordCounter: WordCounter) {
        this._wordCounter = wordCounter;
        this._wordCounter.updateWordCount();

        // subscribe to selection change and editor activation events
        let subscriptions: Disposable[] = [];
        window.onDidChangeTextEditorSelection(this._onEvent, this, subscriptions);
        window.onDidChangeActiveTextEditor(this._onEvent, this, subscriptions);

        // create a combined disposable from both event subscriptions
        this._disposable = Disposable.from(...subscriptions);
    }

    private _onEvent() {
        this._wordCounter.updateWordCount();
    }

    public dispose() {
        this._disposable.dispose();
    }
}
