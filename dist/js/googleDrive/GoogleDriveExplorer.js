var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __values = (this && this.__values) || function (o) {
    var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
    if (m) return m.call(o);
    return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
};
/// <reference path="../../js/jsw.d.ts" />
/**
 * Googleサインイン用ウインドウ
*/
var GoogleSignWindow = /** @class */ (function (_super) {
    __extends(GoogleSignWindow, _super);
    function GoogleSignWindow(drive, func) {
        var _this = _super.call(this) || this;
        _this.setTitle('ログイン');
        _this.setSize(180, 100);
        _this.setPos();
        var client = _this.getClient();
        client.style.display = 'flex';
        client.style.alignItems = 'center';
        client.style.justifyContent = 'center';
        var button = document.createElement('button');
        button.innerText = 'ログイン';
        client.appendChild(button);
        var button2 = document.createElement('button');
        button2.innerText = 'ログアウト';
        client.appendChild(button2);
        var that = _this;
        button.addEventListener('click', function () {
            drive.signIn().then(function (flag) { func(flag); that.close(); });
        });
        button2.addEventListener('click', function () {
            drive.signOut().then(function (flag) { func(flag); that.close(); });
        });
        return _this;
    }
    return GoogleSignWindow;
}(JSW.FrameWindow));
/**
 * メッセージ表示用ウインドウ
*/
var MessageBox = /** @class */ (function (_super) {
    __extends(MessageBox, _super);
    function MessageBox(parent, title, msg) {
        var _this = _super.call(this) || this;
        var client = _this.getClient();
        client.style.display = 'flex';
        client.style.alignItems = 'center';
        client.style.justifyContent = 'center';
        _this.setTitle(title);
        _this.setText(msg);
        parent.addChild(_this);
        _this.setSize(200, 100);
        _this.setPos();
        return _this;
    }
    MessageBox.prototype.setText = function (text) {
        var client = this.getClient();
        client.textContent = text;
    };
    return MessageBox;
}(JSW.FrameWindow));
/**
 * GoogleDriveディレクトリリスト用ツリービュー
*/
var DriveTree = /** @class */ (function (_super) {
    __extends(DriveTree, _super);
    function DriveTree(googleExplorer) {
        var _this = _super.call(this) || this;
        _this.mGoogleExplorer = googleExplorer;
        //ツリーが展開されたら下の階層を先読み
        var that = _this;
        _this.addEventListener('itemOpen', function (e) {
            if (e.opened)
                that.loadChild(e.item.getItemValue());
        });
        //選択されたらファイルリストを読み出す
        _this.addEventListener('itemSelect', function (e) {
            googleExplorer.loadFiles(e.item.getItemValue());
        });
        _this.addEventListener('itemDrop', function (e) {
            var t = e.event.dataTransfer;
            var item = e.item;
            try {
                var text = t.getData('text/plain');
                var value = JSON.parse(text);
                if (value.type == 'DriveItem') {
                    that.mGoogleExplorer.moveFile(value.value, item.getItemValue());
                }
            }
            catch (e) { }
            //console.log(text)
        });
        _this.addEventListener('itemDragStart', function (e) {
            var item = e.item;
            var event = e.event;
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'DriveItem', value: item.getItemValue() }));
        });
        return _this;
    }
    DriveTree.prototype.load = function (id) {
        var that = this;
        var googleDrive = this.mGoogleExplorer.getGoogleDrive();
        if (id == null) {
            var item = that.getRootItem();
            item.clearItem();
            googleDrive.getFile('root').then(function (r) {
                item.setItemText(r.result.name);
                item.setItemValue(r.result.id);
                item.selectItem();
                that.load(r.result.id);
            });
        }
        else {
            var msgBox_1 = new MessageBox(this, 'メッセージ', 'フォルダ一覧の取得');
            googleDrive.getDir(id).then(function (files) {
                var e_1, _a;
                var item = that.findItemFromValue(id);
                //子アイテムのファイルIDを収集
                var ids = {};
                for (var i = 0, l = item.getChildCount(); i < l; i++) {
                    var child = item.getChildItem(i);
                    ids[child.getItemValue()] = child;
                }
                item.setKey('loaded', true);
                try {
                    for (var files_1 = __values(files), files_1_1 = files_1.next(); !files_1_1.done; files_1_1 = files_1.next()) {
                        var file = files_1_1.value;
                        if (!ids[file.id]) {
                            item.addItem([file.name, file.id]);
                        }
                        else {
                            ids[file.id].setItemText(file.name);
                        }
                        ids[file.id] = null;
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (files_1_1 && !files_1_1.done && (_a = files_1.return)) _a.call(files_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                //取得リストに存在しない子アイテムを削除
                for (var index in ids) {
                    if (ids[index])
                        ids[index].removeItem();
                }
                that.loadChild(id);
                msgBox_1.close();
            });
        }
    };
    DriveTree.prototype.loadChild = function (id) {
        var that = this;
        var googleDrive = this.mGoogleExplorer.getGoogleDrive();
        var item = this.findItemFromValue(id);
        var ids = [];
        for (var i = 0, l = item.getChildCount(); i < l; i++) {
            var child = item.getChildItem(i);
            ids.push(child.getItemValue());
        }
        //子ノードの読み込み
        googleDrive.getDir(ids).then(function (files) {
            var e_2, _a, e_3, _b, e_4, _c, e_5, _d, e_6, _e;
            //受け取ったファイルデータを親ごとに整理
            var parents = new Map();
            try {
                for (var files_2 = __values(files), files_2_1 = files_2.next(); !files_2_1.done; files_2_1 = files_2.next()) {
                    var file = files_2_1.value;
                    try {
                        for (var _f = __values(file.parents), _g = _f.next(); !_g.done; _g = _f.next()) {
                            var p = _g.value;
                            var files_4 = parents.get(p);
                            if (files_4 == null) {
                                files_4 = [];
                                parents.set(p, files_4);
                            }
                            files_4.push(file);
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_g && !_g.done && (_b = _f.return)) _b.call(_f);
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (files_2_1 && !files_2_1.done && (_a = files_2.return)) _a.call(files_2);
                }
                finally { if (e_2) throw e_2.error; }
            }
            try {
                //整理されたリストを使ってツリーを更新
                for (var _h = __values(parents.keys()), _j = _h.next(); !_j.done; _j = _h.next()) {
                    var pid = _j.value;
                    var item_1 = that.findItemFromValue(pid);
                    if (item_1) {
                        var childIds = new Map();
                        //子アイテムのファイルIDを収集
                        for (var i = 0, l = item_1.getChildCount(); i < l; i++) {
                            var child = item_1.getChildItem(i);
                            childIds.set(child.getItemValue(), child);
                        }
                        //ツリーと取得ファイルリストの突き合わせ
                        var files_5 = parents.get(pid);
                        try {
                            for (var files_3 = __values(files_5), files_3_1 = files_3.next(); !files_3_1.done; files_3_1 = files_3.next()) {
                                var file = files_3_1.value;
                                if (!childIds.has(file.id)) {
                                    item_1.addItem([file.name, file.id]);
                                    item_1.setKey('loaded', false);
                                }
                                else {
                                    childIds.get(file.id).setItemText(file.name);
                                }
                                childIds.delete(file.id);
                            }
                        }
                        catch (e_5_1) { e_5 = { error: e_5_1 }; }
                        finally {
                            try {
                                if (files_3_1 && !files_3_1.done && (_d = files_3.return)) _d.call(files_3);
                            }
                            finally { if (e_5) throw e_5.error; }
                        }
                        try {
                            //取得リストに存在しない子アイテムを削除
                            for (var _k = __values(childIds.values()), _l = _k.next(); !_l.done; _l = _k.next()) {
                                var item_2 = _l.value;
                                item_2.removeItem();
                            }
                        }
                        catch (e_6_1) { e_6 = { error: e_6_1 }; }
                        finally {
                            try {
                                if (_l && !_l.done && (_e = _k.return)) _e.call(_k);
                            }
                            finally { if (e_6) throw e_6.error; }
                        }
                    }
                }
            }
            catch (e_4_1) { e_4 = { error: e_4_1 }; }
            finally {
                try {
                    if (_j && !_j.done && (_c = _h.return)) _c.call(_h);
                }
                finally { if (e_4) throw e_4.error; }
            }
        });
    };
    return DriveTree;
}(JSW.TreeView));
/**
 * GoogleDriveファイルリスト用リストビュー
*/
var DriveList = /** @class */ (function (_super) {
    __extends(DriveList, _super);
    function DriveList(googleExplorer) {
        var _this = _super.call(this) || this;
        _this.mGoogleExplorer = googleExplorer;
        _this.getClient().ondragover = function (e) {
            e.preventDefault();
        };
        _this.getClient().addEventListener("itemDrop", _this.onDrop.bind(_this));
        _this.addHeader([['名前', 250], ['更新', 200], ['サイズ', 80]]);
        _this.setColumnStyles(['left', 'left', 'right']);
        _this.sortItem(0, true);
        var that = _this;
        _this.addEventListener('itemDblClick', function (e) {
            var file = that.getItemValue(e.itemIndex);
            if (file.mimeType === 'application/vnd.google-apps.folder')
                that.mGoogleExplorer.selectDir(file.id); //フォルダなら選択
            else
                location.href = file.webContentLink; //データのダウンロード
        });
        _this.addEventListener('itemDragStart', function (e) {
            var e_7, _a;
            var index = e.itemIndex;
            var event = e.event;
            event.dataTransfer.effectAllowed = 'move';
            var ids = [];
            if (that.isSelectItem(index)) {
                var index_1 = that.getSelectItem();
                var files = that.getSelectValues();
                try {
                    for (var files_6 = __values(files), files_6_1 = files_6.next(); !files_6_1.done; files_6_1 = files_6.next()) {
                        var file = files_6_1.value;
                        ids.push(file.id);
                    }
                }
                catch (e_7_1) { e_7 = { error: e_7_1 }; }
                finally {
                    try {
                        if (files_6_1 && !files_6_1.done && (_a = files_6.return)) _a.call(files_6);
                    }
                    finally { if (e_7) throw e_7.error; }
                }
                event.dataTransfer.setDragImage(that.getCell(index_1, 0), 10, 10);
            }
            else {
                ids.push(that.getItemValue(index).id);
                event.dataTransfer.setDragImage(that.getCell(index, 0), 10, 10);
            }
            event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'DriveItem', value: ids }));
        });
        return _this;
    }
    DriveList.prototype.onDrop = function (e) {
        var t = e.params.event.dataTransfer;
        var index = e.params.itemIndex;
        if (t.files && t.files.length) {
            var that_1 = this;
            var id_1 = this.mSelectId;
            var googleDrive = this.mGoogleExplorer.getGoogleDrive();
            var msgBox_2 = new MessageBox(this, 'メッセージ', 'ファイルアップロード');
            googleDrive.upload(id_1, t.files).then(function (response) {
                if (id_1 === that_1.mSelectId)
                    that_1.mGoogleExplorer.selectDir(id_1);
                msgBox_2.close();
            });
            e.preventDefault();
        }
        else {
            console.log(index);
            try {
                var text = t.getData('text/plain');
                var value = JSON.parse(text);
                if (value.type == 'DriveItem') {
                    var fileId = this.mSelectId;
                    //ドラッグ先がフォルダアイテムか確認
                    if (index >= 0) {
                        var file = this.getItemValue(index);
                        if (file.mimeType === 'application/vnd.google-apps.folder')
                            fileId = file.id;
                    }
                    this.mGoogleExplorer.moveFile(value.value, fileId);
                }
            }
            catch (e) { }
        }
    };
    DriveList.prototype.load = function (id) {
        if (id == null)
            id = this.mSelectId;
        if (id == null)
            return;
        this.mSelectId = id;
        var googleDrive = this.mGoogleExplorer.getGoogleDrive();
        var that = this;
        this.clearItem();
        var msgBox = new MessageBox(this, 'メッセージ', 'ファイル一覧の取得');
        googleDrive.getFiles(id).then(function (files) {
            var e_8, _a;
            try {
                for (var files_7 = __values(files), files_7_1 = files_7.next(); !files_7_1.done; files_7_1 = files_7.next()) {
                    var file = files_7_1.value;
                    var label = document.createElement('div');
                    label.style.height = '100%';
                    label.style.display = 'flex';
                    label.style.alignItems = 'center';
                    var icon = document.createElement('img');
                    icon.style.marginRight = '1ex';
                    icon.src = file.iconLink;
                    icon.style.height = '100%';
                    label.appendChild(icon);
                    var name_1 = document.createElement('div');
                    label.appendChild(name_1);
                    var date = new Date(file.modifiedTime);
                    var kind = file.mimeType === 'application/vnd.google-apps.folder' ? 'A' : 'X';
                    var lsize = '';
                    var fileSize = 0;
                    if (file.size != null) {
                        fileSize = parseInt(file.size);
                        var unit = ['B', 'K', 'M', 'G', 'T'];
                        var size = fileSize;
                        var i = void 0, l = void 0;
                        for (i = 0, l = unit.length - 1; i < l; i++) {
                            if (size < 1024)
                                break;
                            size /= 1024;
                        }
                        lsize = Math.floor(size) + ' ' + unit[i];
                    }
                    name_1.textContent = file.name;
                    var index = that.addItem([label, date.toLocaleString(), lsize]);
                    that.setItemValue(index, file);
                    that.setSortKeys(index, [kind + file.name.toUpperCase(), date.getTime(), fileSize]);
                }
            }
            catch (e_8_1) { e_8 = { error: e_8_1 }; }
            finally {
                try {
                    if (files_7_1 && !files_7_1.done && (_a = files_7.return)) _a.call(files_7);
                }
                finally { if (e_8) throw e_8.error; }
            }
            that.sortItem();
            msgBox.close();
        });
    };
    return DriveList;
}(JSW.ListView));
/**
 * GoogleDrive操作用パネル
*/
var DrivePanel = /** @class */ (function (_super) {
    __extends(DrivePanel, _super);
    function DrivePanel(googleExplorer) {
        var _this = _super.call(this) || this;
        _this.mGoogleExplorer = googleExplorer;
        _this.setWidth(32);
        return _this;
    }
    DrivePanel.prototype.addImage = function (url, title, func) {
        var img = document.createElement('img');
        img.src = './css/images2/' + url;
        img.title = title;
        img.addEventListener('click', func);
        this.getClient().appendChild(img);
    };
    return DrivePanel;
}(JSW.Panel));
var InputWindow = /** @class */ (function (_super) {
    __extends(InputWindow, _super);
    function InputWindow() {
        var _this = _super.call(this) || this;
        var that = _this;
        var input = document.createElement('input');
        var buttonArea = document.createElement('div');
        var okButton = document.createElement('button');
        var cancelButton = document.createElement('button');
        okButton.textContent = 'OK';
        cancelButton.textContent = 'Cancel';
        buttonArea.appendChild(okButton);
        buttonArea.appendChild(cancelButton);
        _this.getClient().appendChild(input);
        _this.getClient().appendChild(buttonArea);
        _this.getClient().dataset.style = 'InputWindow';
        input.addEventListener('keydown', function (e) {
            switch (e.keyCode) {
                case 9:
                case 13:
                    that.callEvent('textInput', { value: input.value });
                case 27:
                    that.close();
                    break;
            }
        });
        okButton.addEventListener('click', function () {
            that.callEvent('textInput', { value: input.value });
            that.close();
        });
        cancelButton.addEventListener('click', function () {
            that.close();
        });
        _this.getNode().addEventListener("animationend", function () { input.focus(); });
        input.focus();
        return _this;
    }
    InputWindow.prototype.addEventListener = function (type, callback) {
        _super.prototype.addEventListener.call(this, type, callback);
    };
    return InputWindow;
}(JSW.FrameWindow));
/**
 * GoogleDrive操作用親ウインドウ
*/
var GoogleExplorer = /** @class */ (function (_super) {
    __extends(GoogleExplorer, _super);
    /**
     *Creates an instance of GoogleExplorer.
     * @param {string} clientId GoogleAPIのクライアントID
     * @memberof GoogleExplorer
     */
    function GoogleExplorer(clientId) {
        var _this = _super.call(this) || this;
        _this.setTitle('GDriveExlorer');
        _this.mGoogleDrive = new JSW.GoogleDrive(clientId, function () {
            this.loadTree();
        }.bind(_this));
        var splitter = new JSW.Splitter;
        _this.addChild(splitter, 'client');
        splitter.setSplitterPos(200);
        var tree = new DriveTree(_this);
        splitter.addChild(0, tree, 'client');
        _this.mTreeView = tree;
        var list = new DriveList(_this);
        splitter.addChild(1, list, 'client');
        _this.mListView = list;
        var panel = new DrivePanel(_this);
        panel.getClient().dataset.panel = 'GDrivePanel';
        _this.addChild(panel, 'right');
        panel.addImage('login.svg', 'ログイン', _this.onLogin.bind(_this));
        panel.addImage('reload.svg', '更新', _this.onReload.bind(_this));
        panel.addImage('rename.svg', '名前の変更', _this.onRename.bind(_this));
        panel.addImage('create_folder.svg', 'ディレクトリ作成', _this.onCreateDir.bind(_this));
        panel.addImage('dbox.svg', '削除', _this.onDelete.bind(_this));
        return _this;
    }
    /**
     *GoogleDriveAPI操作用クラスを返す
     *
     * @returns
     * @memberof GoogleExplorer
     */
    GoogleExplorer.prototype.getGoogleDrive = function () {
        return this.mGoogleDrive;
    };
    /**
    *ディレクトリを選択
    *
    * @param {*} id ディレクトリのファイルID
    * @memberof GoogleExplorer
    */
    GoogleExplorer.prototype.selectDir = function (id) {
        this.mTreeView.selectItemFromValue(id);
    };
    /**
     *ツリーの読み込み
     *
     * @param {*} [id] ディレクトリのファイルID(省略でroot)
     * @memberof GoogleExplorer
     */
    GoogleExplorer.prototype.loadTree = function (id) {
        this.mTreeView.load(id);
    };
    /**
     *ファイルリストを読み込む
     *
     * @param {*} id 親ディレクトリのID
     * @memberof GoogleExplorer
     */
    GoogleExplorer.prototype.loadFiles = function (id) {
        this.mListView.load(id);
    };
    /**
     *ファイルの移動
     *
     * @param {(string | string[])} srcId 移動元のファイルID
     * @param {string} destId 移動先のディレクトリ
     * @memberof GoogleExplorer
     */
    GoogleExplorer.prototype.moveFile = function (srcId, destId) {
        var e_9, _a;
        var that = this;
        var googleDrive = this.mGoogleDrive;
        var msgBox = new MessageBox(this, 'メッセージ', 'フォルダ移動');
        var ids;
        if (srcId instanceof Array)
            ids = srcId;
        else
            ids = [srcId];
        var reloadId = {};
        reloadId[destId] = destId;
        var requests = [];
        var _loop_1 = function (id) {
            var request = googleDrive.getFile(id).then(function (response) {
                var parentId;
                if (response.result.parents.length) {
                    parentId = response.result.parents[0];
                    reloadId[parentId] = id;
                }
            });
            requests.push(request);
        };
        try {
            //ソースの親ディレクトリの取得
            for (var ids_1 = __values(ids), ids_1_1 = ids_1.next(); !ids_1_1.done; ids_1_1 = ids_1.next()) {
                var id = ids_1_1.value;
                _loop_1(id);
            }
        }
        catch (e_9_1) { e_9 = { error: e_9_1 }; }
        finally {
            try {
                if (ids_1_1 && !ids_1_1.done && (_a = ids_1.return)) _a.call(ids_1);
            }
            finally { if (e_9) throw e_9.error; }
        }
        Promise.all(requests).then(function () {
            var e_10, _a;
            //移動処理
            var requests = [];
            try {
                for (var ids_2 = __values(ids), ids_2_1 = ids_2.next(); !ids_2_1.done; ids_2_1 = ids_2.next()) {
                    var id = ids_2_1.value;
                    var request = googleDrive.moveDir(id, destId);
                    requests.push(request);
                }
            }
            catch (e_10_1) { e_10 = { error: e_10_1 }; }
            finally {
                try {
                    if (ids_2_1 && !ids_2_1.done && (_a = ids_2.return)) _a.call(ids_2);
                }
                finally { if (e_10) throw e_10.error; }
            }
            //移動後のリスト更新
            Promise.all(requests).then(function () {
                msgBox.close();
                var select = that.mTreeView.getSelectItemValue();
                if (reloadId[select])
                    that.mListView.load();
                for (var id in reloadId) {
                    that.loadTree(id);
                }
            }).catch(function (e) {
                msgBox.setText(e.message);
            });
        });
    };
    GoogleExplorer.prototype.onLogin = function () {
        var that = this;
        var loginWindow = new GoogleSignWindow(that.mGoogleDrive, function (flag) {
            if (flag)
                that.loadTree();
            else {
                that.mTreeView.clearItem();
                that.mListView.clearItem();
            }
        });
        this.addChild(loginWindow);
        loginWindow.setPos();
    };
    GoogleExplorer.prototype.onReload = function () {
        this.mTreeView.load(this.mTreeView.getSelectItemValue());
        this.mListView.load();
    };
    GoogleExplorer.prototype.onRename = function () {
        var ids = this.mListView.getSelectValues();
        if (ids.length === 0)
            return;
        var id = ids[0].id;
        var that = this;
        var inputWindow = new InputWindow();
        this.addChild(inputWindow);
        inputWindow.setTitle('ファイル名の変更');
        inputWindow.setPos();
        inputWindow.addEventListener('textInput', function (e) {
            var text = e.params.value;
            that.mGoogleDrive.rename(id, text).then(function (response) {
                var parentId = that.mTreeView.getSelectItemValue();
                that.loadTree(parentId);
                that.mListView.load();
            });
        });
    };
    GoogleExplorer.prototype.onDelete = function () {
        var _this = this;
        var e_11, _a;
        var files = this.mListView.getSelectValues();
        var p = [];
        try {
            for (var files_8 = __values(files), files_8_1 = files_8.next(); !files_8_1.done; files_8_1 = files_8.next()) {
                var file = files_8_1.value;
                p.push(this.mGoogleDrive.delete(file.id));
            }
        }
        catch (e_11_1) { e_11 = { error: e_11_1 }; }
        finally {
            try {
                if (files_8_1 && !files_8_1.done && (_a = files_8.return)) _a.call(files_8);
            }
            finally { if (e_11) throw e_11.error; }
        }
        var that = this;
        var msgBox = new MessageBox(this, 'メッセージ', 'ファイル削除');
        Promise.all(p).then(function () {
            that.mListView.load();
            var id = _this.mTreeView.getSelectItemValue();
            _this.mTreeView.load(id);
            msgBox.close();
        });
        //console.log(files)
    };
    GoogleExplorer.prototype.onCreateDir = function () {
        var id = this.mTreeView.getSelectItemValue();
        if (id == null)
            return;
        var that = this;
        var inputWindow = new InputWindow();
        this.addChild(inputWindow);
        inputWindow.setTitle('フォルダの作成');
        inputWindow.setPos();
        inputWindow.addEventListener('textInput', function (e) {
            var text = e.params.value;
            that.mGoogleDrive.createDir(id, text).then(function (response) {
                that.loadTree(id);
                var select = that.mTreeView.getSelectItemValue();
                if (select === id)
                    that.mListView.load();
            });
        });
    };
    return GoogleExplorer;
}(JSW.FrameWindow));
//# sourceMappingURL=GoogleDriveExplorer.js.map