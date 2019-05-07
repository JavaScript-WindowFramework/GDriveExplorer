//GoogleDrive用のクライアントID
const clientID = '666143344271-pnu2li1ilk85pg597ohvabs9e31n70gf.apps.googleusercontent.com'
/**
 * 初期実行関数
*/
function Main() {
	let info = new JWF.FrameWindow()
	info.setTitle('説明')
	info.setScroll(true)
	info.getClient().style.padding = '20px'
	info.getClient().innerHTML =
		"<h1>使い方</h1>"+
		"<p>　サイドバーのログインボタンを押してGoogleアカウントでログインしてください<br>"+
		"　「このアプリは確認されていません」が出たら、「詳細」をクリックして先に進んでください</p>"+
		"<hr> <h1>ソースコード</h1>"+
		"<p>　<a target='_blank' href='https://github.com/JavaScript-WindowFramework/GDriveExplorer'>GitHub</a></p>"+
		"<p>　ちなみにGoogleの承認を得ようと思ったらGoogleDriveに似ているから駄目だと言われたので、非承認アプリ状態です<br>"+
		"　GoogleDriveにアクセスするアプリなんだから、似ているも何もないのにどうすりゃ良いのか謎です</p>"+
		"<hr> <h1>利用規約とプライバシーポリシー</h1> <p>　<a href='info/privacy.html'>こちらをご確認ください</a> </p>"
	info.setSize(600, 600)
	info.setOverlap(true)


	let explorer = new GoogleExplorer(clientID)
	explorer.setSize(800, 600)
	explorer.setPos()
}
//ページ読み込み時に実行する処理を設定
addEventListener("DOMContentLoaded", Main)