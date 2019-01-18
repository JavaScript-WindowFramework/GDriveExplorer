namespace JSW{

/**
 *GoogleDrive操作用クラス
 *
 * @export
 * @class GoogleDrive
 */
export class GoogleDrive {
	mClientId: string

	/**
	 *Creates an instance of GoogleDrive.
	 * @param {string} clientId GoogleのOAuthクライアントID
	 * @param {()=>void} [callback] 初期化時のコールバック
	 * @memberof GoogleDrive
	 */
	constructor(clientId:string, callback?:()=>void) {
		this.mClientId = clientId

		gapi.load('client:auth2', () => {
			console.log('API Loaded')

			gapi.client.init({
				clientId: this.mClientId,
				scope: 'https://www.googleapis.com/auth/drive',
				discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
			}).then(function () {
				if (callback) {
					callback()
				}
			}).catch(function(e){
				console.log(e)
			})
		});
	}

	/**
	 *サインイン状態のチェック
	 *
	 * @returns {boolean} サインイン状態
	 * @memberof GoogleDrive
	 */
	isSignIn():boolean {
		if (!gapi.auth2)
			return false;
		return gapi.auth2.getAuthInstance().isSignedIn.get()
	}

	/**
	 *サインインの要求
	 *
	 * @returns {Promise<boolean>}
	 * @resolve flag true:成功 false:失敗
	 * @reject value エラーメッセージ
	 * @memberof GoogleDrive
	 */
	signIn() : Promise<boolean>{
		return new Promise((resolve: (flag?:boolean)=> void, reject:(value?:{message})=>void)=>{
			if (gapi.auth2) {
				const auth = gapi.auth2.getAuthInstance();
				const flag = auth.isSignedIn.get()
				if (flag)
					resolve(flag);
				else
					auth.signIn().then(()=>{
						resolve(true);
					}).catch(()=>{
						reject({ message: 'ログイン失敗' })
					});
			}else{
				reject({message:'APIが初期化されていない'})
			}
		})

	}
	/**
	* サインアウトンの要求
	* @returns {Promise<boolean>}
	* @resolve flag true:成功 false:失敗
	* @reject value エラーメッセージ
	*/
	signOut() : Promise<boolean>{
		return new Promise((resolve:(value?: boolean)=> void, reject:(value?:{message})=>void)=>{
			if (!gapi.auth2)
				reject({message:'APIが初期化されていない'})
			else
				gapi.auth2.getAuthInstance().signOut().then((flag)=>{
					resolve(flag)
				})
		})

	}
	/**
	 *ファイルのアップロード
	 *
	 * @param {string} parentId
	 * @param {FileList} files
	 * @returns Promise<gapi.client.drive.File[]>
	 * @resolve response アップロードレスポンス
	 * @memberof GoogleDrive
	 */
	upload(parentId : string,files : FileList){
		const that = this
		return new Promise((resolve:(value?: gapi.client.drive.File[])=> void, reject)=>{
			const user = gapi.auth2.getAuthInstance().currentUser.get();
			const oauthToken = user.getAuthResponse().access_token;
			for (var i = 0; i < files.length; i++) {
				var file = files[i];
				var reader = new FileReader()
				reader.onload = function () {
					const http = new XMLHttpRequest()
					const contentType = file.type || 'application/octet-stream'
					http.open('POST', 'https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable', true)
					http.setRequestHeader('Authorization', 'Bearer ' + oauthToken)
					http.setRequestHeader('Content-Type', 'application/json')
					http.setRequestHeader('X-Upload-Content-Length', file.size.toString())
					http.setRequestHeader('X-Upload-Content-Type', contentType)
					http.onreadystatechange = function () {
						if (http.readyState === XMLHttpRequest.DONE && http.status === 200) {
							const locationUrl = http.getResponseHeader('Location')
							const httpUpload = new XMLHttpRequest()
							httpUpload.open('PUT', locationUrl, true)
							httpUpload.setRequestHeader('Content-Type', contentType)
							httpUpload.setRequestHeader('X-Upload-Content-Type', contentType)
							httpUpload.onreadystatechange = function () {
								if (httpUpload.readyState === XMLHttpRequest.DONE && httpUpload.status === 200) {
									let response = JSON.parse(httpUpload.response)
									that.moveDir(response.id,parentId).then(()=>{
										resolve(response)
									})
								}
							};
							httpUpload.send(reader.result);
						}
					}
					http.send(JSON.stringify({
						'name': file.name,
						'mimeType': contentType,
						'Content-Type': contentType,
						'Content-Length': file.size
					}));
				}
				reader.readAsArrayBuffer(file);
			}
		})
	}

	/**
	 *ディレクトリ一覧の要求
	 *
	 * @param {(string | string[])} id ディレクトリID
	 * @returns Promise<gapi.client.drive.File[]>
	 * @resolve files ファイルリスト
	 * @reject value エラーメッセージ
	 * @memberof GoogleDrive
	 */
	getDir(id: string | string[]) {
		const that = this
		return new Promise((resolve:(files?: gapi.client.drive.File[])=> void, reject)=>{
			if (!gapi.client.drive) {
				reject({message:'DriveAPIがロードされていない'})
				return
			}
			if(!that.isSignIn()){
				reject({message:'ログインしていない'})
				return
			}
			let parent: string[]
			if (id instanceof Array) {
				if (id.length === 0){
					resolve([])
					return
				}
				parent = id as string[]
			} else {
				parent = [id]
			}
			let query = '('
			for (let i = 0, l = parent.length; i < l; i++) {
				if (i > 0)
					query += ' or '
				query += "'" + parent[i] + "' in parents"
			}
			query += ')'

			let files:gapi.client.drive.File[] = []
			function getDir(token?) {
				gapi.client.drive.files.list({
					pageSize: 1000,
					corpora: 'user',
					spaces: "drive",
					orderBy: 'name',
					q: query + " and mimeType='application/vnd.google-apps.folder' and trashed=false",
					fields: "nextPageToken, files(id, name,mimeType,kind,parents,iconLink)",
					pageToken: token
				}).then(function (response) {
					Array.prototype.push.apply(files, response.result.files)
					if (response.result.nextPageToken)
						getDir(response.result.nextPageToken)
					else
						resolve(files)
				});
			}
			getDir()

		})
	}
	/**
	 * ファイルの削除(ゴミ箱)
	 *
	 * @param {string} id ファイルID
	 * @returns Promise<gapi.client.Response<{}>)>
	 * @resolve response レスポンス
	 * @memberof GoogleDrive
	 */
	delete(id:string){
		return new Promise((resolve: (response: gapi.client.Response<{}>)=>void,reject)=>{
			gapi.client.request({
				path:'https://www.googleapis.com/drive/v3/files/'+id,
				method:'PATCH',
				body:JSON.stringify({trashed:true})
			}).execute((response)=>{
				resolve(response)
			})

		})
	}
	rename(id: string, name: string) {
		return new Promise((resolve: (response: gapi.client.Response<{}>) => void, reject) => {
			gapi.client.request({
				path: 'https://www.googleapis.com/drive/v3/files/'+id,
				method: 'PATCH',
				body: JSON.stringify({
					name: name
				})
			}).execute((response) => {
				resolve(response)
			})

		})
	}
	createDir(parentId:string,name:string){
		return new Promise((resolve: (response: gapi.client.Response<{}>) => void, reject) => {
			gapi.client.request({
				path: 'https://www.googleapis.com/drive/v3/files',
				method: 'POST',
				body: JSON.stringify({
					name: name,
					mimeType:'application/vnd.google-apps.folder',
					parents: [parentId] })
			}).execute((response) => {
				resolve(response)
			})

		})
	}
	/**
	* ファイルの削除(ゴミ箱)
	* @async
	* @Param {string} srcId 移動元ID
	* @Param {string} toId 移動元フォルダID
	* @returns Promise<gapi.client.Response<{}>)>
	* @resolve files ファイルリスト
	* @memberof GoogleDrive
	*/

	moveDir(srcId:string,toId:string){
		return new Promise((resolve,reject)=>{
			if(srcId === toId){
				reject({message:'移動先が不正'})
				return
			}
			gapi.client.drive.files.get({ fileId: srcId,fields: 'parents' }).then((response) => {
				let file = response.result
				var previousParents = file.parents.join(',')

				gapi.client.drive.files.update({
					fileId: srcId,
					addParents: toId,
					removeParents: previousParents,
					fields: 'id, parents'
					}).then(function(response){
						resolve(response)
					},function(){
						reject({message:'移動に失敗'})
					})
				})
			})
	}
	/**
	* ファイル情報の取得
	* @async
	* @Param {string} id ファイルID
	* @resolve response レスポンス
	* @memberof GoogleDrive
	*/
	getFile(id:string) {
		const that = this
		return new Promise(
				(resolve:(value?: gapi.client.Response<gapi.client.drive.File>)=> void,
				reject:(value?:{message:string})=>void)=>{
			if (!gapi.client.drive) {
				reject({message:'DriveAPIがロードされていない'})
				return
			}
			if(!that.isSignIn()){
				reject({message:'ログインしていない'})
				return
			}
			gapi.client.drive.files.get({ fileId: id, fields:'id,name,parents' }).then((response) => {
				resolve(response)
			})
		})
	}
	/**
	* ファイルリストの取得
	* @async
	* @Param {string} parentId フォルダID
	* @resolve response レスポンス
	* @reject value エラーメッセージ
	*/
	getFiles(parentId:string) {
		const that = this
		return new Promise(
					(resolve:(files?: gapi.client.drive.File[])=> void,
					reject:(value?:{message:string})=>void)=>{
			if (!gapi.client.drive) {
				reject({message:'DriveAPIがロードされていない'})
				return
			}
			if(!that.isSignIn()){
				reject({message:'ログインしていない'})
				return
			}
			let files = []
			function getFiles(token?) {
				gapi.client.drive.files.list({
					pageSize: 1000,
					corpora: 'user',
					spaces: "drive",
					orderBy: 'name',
					q: "'" + parentId + "' in parents and trashed=false",
					fields: "nextPageToken, files(id, name,mimeType,kind,modifiedTime,parents,iconLink,size,webContentLink)",
					pageToken: token
				}).then((response) => {
					Array.prototype.push.apply(files, response.result.files)
					if (response.result.nextPageToken)
						getFiles(response.result.nextPageToken)
					else
						resolve(files)
				})
			}
			getFiles()
		})
	}
}
}