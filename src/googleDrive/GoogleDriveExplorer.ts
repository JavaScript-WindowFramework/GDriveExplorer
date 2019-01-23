/**
 * Googleサインイン用ウインドウ
*/
class GoogleSignWindow extends JSW.FrameWindow {
	constructor(drive: JSW.GoogleDrive, func) {
		super()
		this.setTitle('ログイン')
		this.setSize(180, 100)
		this.setPos()
		let client = this.getClient()
		client.style.display = 'flex'
		client.style.alignItems = 'center'
		client.style.justifyContent = 'center'


		let button = document.createElement('button')
		button.innerText = 'ログイン'
		client.appendChild(button)

		let button2 = document.createElement('button')
		button2.innerText = 'ログアウト'
		client.appendChild(button2)

		let that = this
		button.addEventListener('click', function () {
			drive.signIn().then(function (flag) { func(flag); that.close() })
		})
		button2.addEventListener('click', function () {
			drive.signOut().then(function (flag) { func(flag); that.close() })
		})

	}
}
/**
 * メッセージ表示用ウインドウ
*/
class MessageBox extends JSW.FrameWindow {
	mTextNode: HTMLElement
	constructor(parent: JSW.Window, title: string, msg: string) {
		super()
		let client = this.getClient()
		client.style.display = 'flex'
		client.style.alignItems = 'center';
		client.style.justifyContent = 'center';

		this.setTitle(title)
		this.setText(msg)

		parent.addChild(this)
		this.setSize(200, 100)
		this.setPos()
	}
	setText(text: string) {
		let client = this.getClient()
		client.textContent = text
	}
}
/**
 * GoogleDriveディレクトリリスト用ツリービュー
*/
class DriveTree extends JSW.TreeView {
	mGoogleExplorer: GoogleExplorer
	constructor(googleExplorer: GoogleExplorer) {
		super()
		this.mGoogleExplorer = googleExplorer
		//ツリーが展開されたら下の階層を先読み
		const that = this
		this.addEventListener('itemOpen', function (e) {
			let params = e.params
			if (params.opened)
				that.loadChild(params.item.getItemValue())
		})
		//選択されたらファイルリストを読み出す
		this.addEventListener('itemSelect', function (e) {
			googleExplorer.loadFiles(e.params.item.getItemValue())
		})
		this.addEventListener('itemDrop', function (e) {
			let t = e.params.event.dataTransfer
			let item = e.params.item
			try {
				let text = t.getData('text/plain')
				let value = JSON.parse(text)
				if (value.type == 'DriveItem') {
					that.mGoogleExplorer.moveFile(value.value, item.getItemValue())
				}
			} catch (e) { }

			//console.log(text)

		})
		this.addEventListener('itemDragStart', function (e) {
			let item = e.params.item
			let event = e.params.event
			event.dataTransfer.effectAllowed = 'move'
			event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'DriveItem', value: item.getItemValue() }));
		})
	}
	load(id?) {
		const that = this
		const googleDrive = this.mGoogleExplorer.getGoogleDrive()
		if (id == null) {
			var item = that.getRootItem()
			item.clearItem()
			googleDrive.getFile('root').then((r) => {
				item.setItemText(r.result.name)
				item.setItemValue(r.result.id)
				item.selectItem()
				that.load(r.result.id)
			})
		} else {
			let msgBox = new MessageBox(this, 'メッセージ', 'フォルダ一覧の取得')

			googleDrive.getDir(id).then(function (files) {
				let item = that.findItemFromValue(id)
				//子アイテムのファイルIDを収集
				let ids = {}
				for (let i = 0, l = item.getChildCount(); i < l; i++) {
					let child = item.getChildItem(i)
					ids[child.getItemValue()] = child
				}
				item.setKey('loaded', true)
				for (let file of files) {
					if (!ids[file.id]) {
						item.addItem([file.name, file.id])
					} else {
						ids[file.id].setItemText(file.name)
					}
					ids[file.id] = null
				}
				//取得リストに存在しない子アイテムを削除
				for (let index in ids) {
					if (ids[index])
						ids[index].removeItem()
				}
				that.loadChild(id)
				msgBox.close()
			})
		}
	}
	loadChild(id) {
		const that = this
		const googleDrive = this.mGoogleExplorer.getGoogleDrive()
		let item = this.findItemFromValue(id)
		let ids = []
		for (let i = 0, l = item.getChildCount(); i < l; i++) {
			let child = item.getChildItem(i)
			ids.push(child.getItemValue())
		}
		//子ノードの読み込み
		googleDrive.getDir(ids).then(files => {
			//受け取ったファイルデータを親ごとに整理
			let parents = new Map<string, gapi.client.drive.File[]>();
			for (let file of files) {
				for (let p of file.parents) {
					let files = parents.get(p)
					if(files == null){
						files = []
						parents.set(p,files)
					}
					files.push(file)

				}
			}
			//整理されたリストを使ってツリーを更新
			for (let pid of parents.keys()){
				let item = that.findItemFromValue(pid)
				if (item) {
					let childIds = new Map<string,JSW.TreeItem>()
					//子アイテムのファイルIDを収集
					for (let i = 0, l = item.getChildCount(); i < l; i++) {
						let child = item.getChildItem(i)
						childIds.set(child.getItemValue(),child)
					}
					//ツリーと取得ファイルリストの突き合わせ
					let files = parents.get(pid)
					for(let file of files){
						if (!childIds.has(file.id)) {
							item.addItem([file.name, file.id])
							item.setKey('loaded', false)
						} else {
							childIds.get(file.id).setItemText(file.name)
						}
						childIds.delete(file.id)
					}
					//取得リストに存在しない子アイテムを削除
					for(let item of childIds.values()) {
						item.removeItem()
					}
				}



			}
		})
	}
}
/**
 * GoogleDriveファイルリスト用リストビュー
*/
class DriveList extends JSW.ListView {
	mGoogleExplorer: GoogleExplorer
	mSelectId: string
	constructor(googleExplorer: GoogleExplorer) {
		super()
		this.mGoogleExplorer = googleExplorer
		this.getClient().ondragover = function (e) {
			e.preventDefault()
		}
		this.getClient().addEventListener("itemDrop", this.onDrop.bind(this));

		this.addHeader([['名前', 250], ['更新', 200], ['サイズ', 80]])
		this.setColumnStyles(['left', 'left', 'right'])
		this.sortItem(0, true)
		let that = this
		this.addEventListener('itemDblClick', function (e) {
			let p = e.params
			let file = that.getItemValue(p.itemIndex)
			if (file.mimeType === 'application/vnd.google-apps.folder')
				that.mGoogleExplorer.selectDir(file.id)	//フォルダなら選択
			else
				location.href = file.webContentLink		//データのダウンロード
		})
		this.addEventListener('itemDragStart', function (e) {
			let p = e.params
			let index = p.itemIndex
			let event = p.event as DragEvent
			event.dataTransfer.effectAllowed = 'move'
			let ids = [];

			if (that.isSelectItem(index)) {
				let index = that.getSelectItem()
				let files = that.getSelectValues()
				for (let file of files) {
					ids.push(file.id)
				}
				event.dataTransfer.setDragImage(that.getCell(index, 0), 10, 10)
			} else {
				ids.push(that.getItemValue(index).id)
				event.dataTransfer.setDragImage(that.getCell(index, 0), 10, 10)
			}


			event.dataTransfer.setData('text/plain', JSON.stringify({ type: 'DriveItem', value: ids }));
		})
	}
	private onDrop(e) {
		let t = e.params.event.dataTransfer
		let index = e.params.itemIndex

		if (t.files && t.files.length) {
			const that = this
			const id = this.mSelectId
			const googleDrive = this.mGoogleExplorer.getGoogleDrive()
			let msgBox = new MessageBox(this, 'メッセージ', 'ファイルアップロード')
			googleDrive.upload(id, t.files).then(response => {
				if (id === that.mSelectId)
					that.mGoogleExplorer.selectDir(id)
				msgBox.close()
			})
			e.preventDefault()
		} else {
			console.log(index)
			try {
				let text = t.getData('text/plain')
				let value = JSON.parse(text)
				if (value.type == 'DriveItem') {
					let fileId = this.mSelectId
					//ドラッグ先がフォルダアイテムか確認
					if (index >= 0) {
						let file = this.getItemValue(index)
						if (file.mimeType === 'application/vnd.google-apps.folder')
							fileId = file.id
					}
					this.mGoogleExplorer.moveFile(value.value, fileId)
				}
			} catch (e) { }
		}



	}
	load(id?) {
		if (id == null)
			id = this.mSelectId
		if (id == null)
			return
		this.mSelectId = id
		const googleDrive = this.mGoogleExplorer.getGoogleDrive()
		const that = this
		this.clearItem()
		let msgBox = new MessageBox(this, 'メッセージ', 'ファイル一覧の取得')
		googleDrive.getFiles(id).then((files) => {
			for (let file of files) {
				let label = document.createElement('div')
				label.style.height = '100%'
				label.style.display = 'flex'
				label.style.alignItems = 'center'
				let icon = document.createElement('img')
				icon.style.marginRight = '1ex'
				icon.src = file.iconLink;
				icon.style.height = '100%'
				label.appendChild(icon)
				let name = document.createElement('div')
				label.appendChild(name)

				let date = new Date(file.modifiedTime)
				let kind = file.mimeType === 'application/vnd.google-apps.folder' ? 'A' : 'X'
				let lsize = '';
				let fileSize = 0
				if (file.size != null) {
					fileSize = parseInt(file.size)
					const unit = ['B', 'K', 'M', 'G', 'T']
					let size = fileSize
					let i, l
					for (i = 0, l = unit.length - 1; i < l; i++) {
						if (size < 1024)
							break
						size /= 1024
					}
					lsize = Math.floor(size) + ' ' + unit[i]
				}
				name.textContent = file.name
				let index = that.addItem([label, date.toLocaleString(), lsize])
				that.setItemValue(index, file)
				that.setSortKeys(index, [kind + file.name.toUpperCase(), date.getTime(), fileSize])
			}
			that.sortItem()
			msgBox.close()
		})
	}

}
/**
 * GoogleDrive操作用パネル
*/
class DrivePanel extends JSW.Panel {
	mGoogleExplorer: GoogleExplorer
	constructor(googleExplorer: GoogleExplorer) {
		super()
		this.mGoogleExplorer = googleExplorer
		this.setWidth(32)
	}
	addImage(url, title, func) {
		let img = document.createElement('img')
		img.src = './css/images2/' + url
		img.title = title
		img.addEventListener('click', func)
		this.getClient().appendChild(img)
	}

}
interface INPUTWINDOW_EVENT_TEXT_INPUT extends Event {
	params: { value: string }
}
class InputWindow extends JSW.FrameWindow {
	constructor() {
		super()
		const that = this
		let input = document.createElement('input')
		let buttonArea = document.createElement('div')
		let okButton = document.createElement('button')
		let cancelButton = document.createElement('button')
		okButton.textContent = 'OK'
		cancelButton.textContent = 'Cancel'
		buttonArea.appendChild(okButton)
		buttonArea.appendChild(cancelButton)
		this.getClient().appendChild(input)
		this.getClient().appendChild(buttonArea)
		this.getClient().dataset.style = 'InputWindow'

		input.addEventListener('keydown', function (e) {
			switch (e.keyCode) {
				case 9:
				case 13:
					that.callEvent('textInput', { value: input.value })
				case 27:
					that.close()
					break;
			}
		})
		okButton.addEventListener('click', function () {
			that.callEvent('textInput', { value: input.value })
			that.close()
		})

		cancelButton.addEventListener('click', function () {
			that.close()
		})
		this.getNode().addEventListener("animationend", function () { input.focus() })
		input.focus()

	}
	addEventListener(type: 'textInput', callback: (event: INPUTWINDOW_EVENT_TEXT_INPUT) => void): void;
	addEventListener(type: string, callback: any, options?) {
		super.addEventListener(type, callback, options)
	}
}

/**
 * GoogleDrive操作用親ウインドウ
*/
class GoogleExplorer extends JSW.FrameWindow {
	mGoogleDrive: JSW.GoogleDrive
	mListView: DriveList
	mTreeView: DriveTree
	/**
	 *Creates an instance of GoogleExplorer.
	 * @param {string} clientId GoogleAPIのクライアントID
	 * @memberof GoogleExplorer
	 */
	constructor(clientId: string) {
		super()
		this.setTitle('GDriveExlorer')

		this.mGoogleDrive = new JSW.GoogleDrive(clientId,
			function () {
				this.loadTree()
			}.bind(this)
		)

		let splitter = new JSW.Splitter
		this.addChild(splitter, 'client')
		splitter.setSplitterPos(200)

		let tree = new DriveTree(this)
		splitter.addChild(0, tree, 'client')
		this.mTreeView = tree

		let list = new DriveList(this)
		splitter.addChild(1, list, 'client')
		this.mListView = list

		let panel = new DrivePanel(this)
		panel.getClient().dataset.panel = 'GDrivePanel'
		this.addChild(panel, 'right')

		panel.addImage('login.svg', 'ログイン', this.onLogin.bind(this))
		panel.addImage('reload.svg', '更新', this.onReload.bind(this))
		panel.addImage('rename.svg', '名前の変更', this.onRename.bind(this))
		panel.addImage('create_folder.svg', 'ディレクトリ作成', this.onCreateDir.bind(this))
		panel.addImage('dbox.svg', '削除', this.onDelete.bind(this))
	}

	/**
	 *GoogleDriveAPI操作用クラスを返す
	 *
	 * @returns
	 * @memberof GoogleExplorer
	 */
	getGoogleDrive() {
		return this.mGoogleDrive
	}
	/**
	*ディレクトリを選択
	*
	* @param {*} id ディレクトリのファイルID
	* @memberof GoogleExplorer
	*/
	selectDir(id) {
		this.mTreeView.selectItemFromValue(id)
	}
	/**
	 *ツリーの読み込み
	 *
	 * @param {*} [id] ディレクトリのファイルID(省略でroot)
	 * @memberof GoogleExplorer
	 */
	loadTree(id?) {
		this.mTreeView.load(id)
	}
	/**
	 *ファイルリストを読み込む
	 *
	 * @param {*} id 親ディレクトリのID
	 * @memberof GoogleExplorer
	 */
	loadFiles(id) {
		this.mListView.load(id)
	}
	/**
	 *ファイルの移動
	 *
	 * @param {(string | string[])} srcId 移動元のファイルID
	 * @param {string} destId 移動先のディレクトリ
	 * @memberof GoogleExplorer
	 */
	moveFile(srcId: string | string[], destId: string) {
		let that = this
		let googleDrive = this.mGoogleDrive
		let msgBox = new MessageBox(this, 'メッセージ', 'フォルダ移動')

		let ids;
		if (srcId instanceof Array)
			ids = srcId
		else
			ids = [srcId]

		let reloadId = {}
		reloadId[destId] = destId
		let requests = []
		//ソースの親ディレクトリの取得
		for (let id of ids) {
			let request = googleDrive.getFile(id).then(function (response) {
				let parentId;
				if (response.result.parents.length) {
					parentId = response.result.parents[0]
					reloadId[parentId] = id
				}
			})
			requests.push(request)
		}
		Promise.all(requests).then(function () {
			//移動処理
			let requests = []
			for (let id of ids) {
				let request = googleDrive.moveDir(id, destId)
				requests.push(request)
			}
			//移動後のリスト更新
			Promise.all(requests).then(function () {
				msgBox.close()
				let select = that.mTreeView.getSelectItemValue()
				if (reloadId[select])
					that.mListView.load()
				for (let id in reloadId) {
					that.loadTree(id)
				}
			}).catch(function (e) {
				msgBox.setText(e.message)
			})
		})

	}

	private onLogin() {
		const that = this
		let loginWindow = new GoogleSignWindow(that.mGoogleDrive, function (flag) {
			if (flag)
				that.loadTree()
			else {
				that.mTreeView.clearItem()
				that.mListView.clearItem()
			}
		})
		this.addChild(loginWindow)
		loginWindow.setPos()
	}
	private onReload() {
		this.mTreeView.load(this.mTreeView.getSelectItemValue())
		this.mListView.load()
	}
	private onRename() {
		let ids = this.mListView.getSelectValues()
		if (ids.length === 0)
			return
		let id = ids[0].id
		const that = this
		let inputWindow = new InputWindow()
		this.addChild(inputWindow)
		inputWindow.setTitle('ファイル名の変更')
		inputWindow.setPos()
		inputWindow.addEventListener('textInput', function (e) {
			let text = e.params.value
			that.mGoogleDrive.rename(id, text).then(response => {
				let parentId = that.mTreeView.getSelectItemValue()
				that.loadTree(parentId)
				that.mListView.load()
			})
		})
	}
	private onDelete() {
		let files = this.mListView.getSelectValues()
		let p = []
		for (let file of files) {
			p.push(this.mGoogleDrive.delete(file.id))
		}
		let that = this
		let msgBox = new MessageBox(this, 'メッセージ', 'ファイル削除')
		Promise.all(p).then(() => {
			that.mListView.load()
			let id = this.mTreeView.getSelectItemValue()
			this.mTreeView.load(id)
			msgBox.close()
		})
		//console.log(files)
	}
	private onCreateDir() {
		let id = this.mTreeView.getSelectItemValue()
		if (id == null)
			return

		const that = this
		let inputWindow = new InputWindow()
		this.addChild(inputWindow)
		inputWindow.setTitle('フォルダの作成')
		inputWindow.setPos()
		inputWindow.addEventListener('textInput', function (e) {
			let text = e.params.value
			that.mGoogleDrive.createDir(id, text).then(response => {
				that.loadTree(id)
				let select = that.mTreeView.getSelectItemValue()
				if (select === id)
					that.mListView.load()
			})
		})
	}
}