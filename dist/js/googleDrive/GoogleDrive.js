var JSW;
(function (JSW) {
    var GoogleAuth = /** @class */ (function () {
        function GoogleAuth() {
        }
        GoogleAuth.prototype.init = function (clientId, scope, discovery) {
            var _this = this;
            return new Promise(function (resolv, reject) {
                var that = _this;
                gapi.load('client:auth2', function () {
                    var discoverys = discovery instanceof Array ? discovery : [discovery];
                    gapi.client.init({
                        clientId: clientId,
                        scope: scope,
                        discoveryDocs: discoverys
                    }).then(function () {
                        that.mAuthInstance = gapi.auth2.getAuthInstance();
                        resolv();
                    }).catch(function (e) {
                        reject(e);
                    });
                });
            });
        };
        /**
         *サインイン状態のチェック
         *
         * @returns {boolean} サインイン状態
         * @memberof GoogleDrive
         */
        GoogleAuth.prototype.isSignIn = function () {
            if (!this.mAuthInstance)
                return false;
            return this.mAuthInstance.isSignedIn.get();
        };
        /**
     *サインインの要求
     *
     * @returns {Promise<boolean>}
     * @resolve flag true:成功 false:失敗
     * @reject value エラーメッセージ
     * @memberof GoogleDrive
     */
        GoogleAuth.prototype.signIn = function () {
            var that = this;
            return new Promise(function (resolve, reject) {
                if (gapi.auth2) {
                    var auth = that.mAuthInstance;
                    var flag = auth.isSignedIn.get();
                    if (flag)
                        resolve(flag);
                    else
                        auth.signIn().then(function () {
                            resolve(true);
                        }).catch(function () {
                            reject({ message: 'ログイン失敗' });
                        });
                }
                else {
                    reject({ message: 'APIが初期化されていない' });
                }
            });
        };
        /**
        * サインアウトンの要求
        * @returns {Promise<boolean>}
        * @resolve flag true:成功 false:失敗
        * @reject value エラーメッセージ
        */
        GoogleAuth.prototype.signOut = function () {
            var that = this;
            return new Promise(function (resolve, reject) {
                if (!gapi.auth2)
                    reject({ message: 'APIが初期化されていない' });
                else
                    that.mAuthInstance.signOut().then(function (flag) {
                        resolve(flag);
                    });
            });
        };
        return GoogleAuth;
    }());
    JSW.GoogleAuth = GoogleAuth;
    /**
     *GoogleDrive操作用クラス
     *
     * @export
     * @class GoogleDrive
     */
    var GoogleDrive = /** @class */ (function () {
        /**
         *Creates an instance of GoogleDrive.
         * @param {string} clientId GoogleのOAuthクライアントID
         * @param {()=>void} [callback] 初期化時のコールバック
         * @memberof GoogleDrive
         */
        function GoogleDrive(clientId, callback) {
            this.mAuth = new GoogleAuth();
            this.mAuth.init(clientId, 'https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest').then(function () {
                callback();
            });
        }
        /**
         *サインイン状態のチェック
         *
         * @returns {boolean} サインイン状態
         * @memberof GoogleDrive
         */
        GoogleDrive.prototype.isSignIn = function () {
            return this.mAuth.isSignIn();
        };
        /**
         *サインインの要求
         *
         * @returns {Promise<boolean>}
         * @resolve flag true:成功 false:失敗
         * @reject value エラーメッセージ
         * @memberof GoogleDrive
         */
        GoogleDrive.prototype.signIn = function () {
            return this.mAuth.signIn();
        };
        /**
        * サインアウトンの要求
        * @returns {Promise<boolean>}
        * @resolve flag true:成功 false:失敗
        * @reject value エラーメッセージ
        */
        GoogleDrive.prototype.signOut = function () {
            return this.mAuth.signOut();
        };
        /**
         *ファイルのアップロード
         *
         * @param {string} parentId
         * @param {FileList} files
         * @returns Promise<gapi.client.drive.File[]>
         * @resolve response アップロードレスポンス
         * @memberof GoogleDrive
         */
        GoogleDrive.prototype.upload = function (parentId, files) {
            var that = this;
            return new Promise(function (resolve, reject) {
                var user = gapi.auth2.getAuthInstance().currentUser.get();
                var oauthToken = user.getAuthResponse().access_token;
                for (var i = 0; i < files.length; i++) {
                    var file = files[i];
                    var reader = new FileReader();
                    reader.onload = function () {
                        var http = new XMLHttpRequest();
                        var contentType = file.type || 'application/octet-stream';
                        http.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', true);
                        http.setRequestHeader('Authorization', 'Bearer ' + oauthToken);
                        http.setRequestHeader('Content-Type', 'application/json');
                        http.setRequestHeader('X-Upload-Content-Length', file.size.toString());
                        http.setRequestHeader('X-Upload-Content-Type', contentType);
                        http.onreadystatechange = function () {
                            if (http.readyState === XMLHttpRequest.DONE && http.status === 200) {
                                var locationUrl = http.getResponseHeader('Location');
                                var httpUpload_1 = new XMLHttpRequest();
                                httpUpload_1.open('PUT', locationUrl, true);
                                httpUpload_1.setRequestHeader('Content-Type', contentType);
                                httpUpload_1.setRequestHeader('X-Upload-Content-Type', contentType);
                                httpUpload_1.onreadystatechange = function () {
                                    if (httpUpload_1.readyState === XMLHttpRequest.DONE && httpUpload_1.status === 200) {
                                        var response_1 = JSON.parse(httpUpload_1.response);
                                        that.moveDir(response_1.id, parentId).then(function () {
                                            resolve(response_1);
                                        });
                                    }
                                };
                                httpUpload_1.send(reader.result);
                            }
                        };
                        http.send(JSON.stringify({
                            'name': file.name,
                            'mimeType': contentType,
                            'Content-Type': contentType,
                            'Content-Length': file.size
                        }));
                    };
                    reader.readAsArrayBuffer(file);
                }
            });
        };
        /**
         *ディレクトリ一覧の要求
         *
         * @param {(string | string[])} id ディレクトリID
         * @returns Promise<gapi.client.drive.File[]>
         * @resolve files ファイルリスト
         * @reject value エラーメッセージ
         * @memberof GoogleDrive
         */
        GoogleDrive.prototype.getDir = function (id) {
            var that = this;
            return new Promise(function (resolve, reject) {
                if (!gapi.client.drive) {
                    reject({ message: 'DriveAPIがロードされていない' });
                    return;
                }
                if (!that.isSignIn()) {
                    reject({ message: 'ログインしていない' });
                    return;
                }
                var parent;
                if (id instanceof Array) {
                    if (id.length === 0) {
                        resolve([]);
                        return;
                    }
                    parent = id;
                }
                else {
                    parent = [id];
                }
                var query = '(';
                for (var i = 0, l = parent.length; i < l; i++) {
                    if (i > 0)
                        query += ' or ';
                    query += "'" + parent[i] + "' in parents";
                }
                query += ')';
                var files = [];
                function getDir(token) {
                    gapi.client.drive.files.list({
                        pageSize: 1000,
                        corpora: 'user',
                        spaces: "drive",
                        orderBy: 'name',
                        q: query + " and mimeType='application/vnd.google-apps.folder' and trashed=false",
                        fields: "nextPageToken, files(id, name,mimeType,kind,parents,iconLink)",
                        pageToken: token
                    }).then(function (response) {
                        Array.prototype.push.apply(files, response.result.files);
                        if (response.result.nextPageToken)
                            getDir(response.result.nextPageToken);
                        else
                            resolve(files);
                    });
                }
                getDir();
            });
        };
        /**
         * ファイルの削除(ゴミ箱)
         *
         * @param {string} id ファイルID
         * @returns Promise<gapi.client.Response<{}>)>
         * @resolve response レスポンス
         * @memberof GoogleDrive
         */
        GoogleDrive.prototype.delete = function (id) {
            return new Promise(function (resolve, reject) {
                gapi.client.request({
                    path: 'https://www.googleapis.com/drive/v3/files/' + id,
                    method: 'PATCH',
                    body: JSON.stringify({ trashed: true })
                }).execute(function (response) {
                    resolve(response);
                });
            });
        };
        GoogleDrive.prototype.rename = function (id, name) {
            return new Promise(function (resolve, reject) {
                gapi.client.request({
                    path: 'https://www.googleapis.com/drive/v3/files/' + id,
                    method: 'PATCH',
                    body: JSON.stringify({
                        name: name
                    })
                }).execute(function (response) {
                    resolve(response);
                });
            });
        };
        GoogleDrive.prototype.createDir = function (parentId, name) {
            return new Promise(function (resolve, reject) {
                gapi.client.request({
                    path: 'https://www.googleapis.com/drive/v3/files',
                    method: 'POST',
                    body: JSON.stringify({
                        name: name,
                        mimeType: 'application/vnd.google-apps.folder',
                        parents: [parentId]
                    })
                }).execute(function (response) {
                    resolve(response);
                });
            });
        };
        /**
        * ファイルの削除(ゴミ箱)
        * @async
        * @Param {string} srcId 移動元ID
        * @Param {string} toId 移動元フォルダID
        * @returns Promise<gapi.client.Response<{}>)>
        * @resolve files ファイルリスト
        * @memberof GoogleDrive
        */
        GoogleDrive.prototype.moveDir = function (srcId, toId) {
            return new Promise(function (resolve, reject) {
                if (srcId === toId) {
                    reject({ message: '移動先が不正' });
                    return;
                }
                gapi.client.drive.files.get({ fileId: srcId, fields: 'parents' }).then(function (response) {
                    var file = response.result;
                    var previousParents = file.parents.join(',');
                    gapi.client.drive.files.update({
                        fileId: srcId,
                        addParents: toId,
                        removeParents: previousParents,
                        fields: 'id, parents'
                    }).then(function (response) {
                        resolve(response);
                    }, function () {
                        reject({ message: '移動に失敗' });
                    });
                });
            });
        };
        /**
        * ファイル情報の取得
        * @async
        * @Param {string} id ファイルID
        * @resolve response レスポンス
        * @memberof GoogleDrive
        */
        GoogleDrive.prototype.getFile = function (id) {
            var that = this;
            return new Promise(function (resolve, reject) {
                if (!gapi.client.drive) {
                    reject({ message: 'DriveAPIがロードされていない' });
                    return;
                }
                if (!that.isSignIn()) {
                    reject({ message: 'ログインしていない' });
                    return;
                }
                gapi.client.drive.files.get({ fileId: id, fields: 'id,name,parents' }).then(function (response) {
                    resolve(response);
                });
            });
        };
        /**
        * ファイルリストの取得
        * @async
        * @Param {string} parentId フォルダID
        * @resolve response レスポンス
        * @reject value エラーメッセージ
        */
        GoogleDrive.prototype.getFiles = function (parentId) {
            var that = this;
            return new Promise(function (resolve, reject) {
                if (!gapi.client.drive) {
                    reject({ message: 'DriveAPIがロードされていない' });
                    return;
                }
                if (!that.isSignIn()) {
                    reject({ message: 'ログインしていない' });
                    return;
                }
                var files = [];
                function getFiles(token) {
                    gapi.client.drive.files.list({
                        pageSize: 1000,
                        corpora: 'user',
                        spaces: "drive",
                        orderBy: 'name',
                        q: "'" + parentId + "' in parents and trashed=false",
                        fields: "nextPageToken, files(id, name,mimeType,kind,modifiedTime,parents,iconLink,size,webContentLink)",
                        pageToken: token
                    }).then(function (response) {
                        Array.prototype.push.apply(files, response.result.files);
                        if (response.result.nextPageToken)
                            getFiles(response.result.nextPageToken);
                        else
                            resolve(files);
                    });
                }
                getFiles();
            });
        };
        return GoogleDrive;
    }());
    JSW.GoogleDrive = GoogleDrive;
})(JSW || (JSW = {}));
//# sourceMappingURL=GoogleDrive.js.map