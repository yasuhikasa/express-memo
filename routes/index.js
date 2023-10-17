var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
	res.render('index', { title: 'Express' });
});



// // 共通の変数でヘッダー情報を一時保存
let customHeader = null;

router.post('/post', function(req, res) {
	customHeader = req.headers['app-type']; // ヘッダー情報を保存
	console.log(customHeader);
	res.status(200).json({ message: 'Header received from A' });
});

router.get('/send', function(req, res) {
	if (customHeader) {
		res.status(200).json({ customHeader: customHeader });
	} else {
		res.status(404).json({ error: 'Header not found' });
	}
});

module.exports = router;


//モバイルアプリの場合

// カスタムヘッダーを一時的に保存する変数
let customHeaderValue = null;

router.post('/sendHeader', (req, res) => {
	customHeaderValue = req.headers['app-type'];
	res.status(200).json({ customHeader: customHeaderValue });
});

// Bアプリ用のエンドポイント
router.get('/receiveHeader', (req, res) => {
	if (customHeaderValue) {
		res.status(200).json({ customHeader: customHeaderValue });
	} else {
		res.status(404).json({ error: 'Header not found' });
	}
});

module.exports = router;