var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
res.render('index', { title: 'Express' });
});

router.post('/post', async(req, res) => {
  const customHeader = req.headers['app-type'];

  console.log(customHeader);

  if (customHeader === 'settings') {
    console.log('success');
    res.status(200).json({ message: 'Data received successfully!' });
  } else {
    res.status(403).json({ error: 'Invalid header value' });
  }
});

module.exports = router;

// var express = require('express');
// var router = express.Router();

// // 共通の変数でヘッダー情報を一時保存
// let customHeader;

// router.post('/receiveFromA', function(req, res) {
//   customHeader = req.headers['app-type']; // ヘッダー情報を保存
//   console.log(customHeader);
//   res.status(200).json({ message: 'Header received from A' });
// });

// router.get('/sendToB', function(req, res) {
//   if (customHeader) {
//     res.status(200).json({ customHeader: customHeader });
//   } else {
//     res.status(404).json({ error: 'Header not found' });
//   }
// });

// module.exports = router;


//モバイルアプリの場合
// var express = require('express');
// var router = express.Router();

// // カスタムヘッダーを一時的に保存する変数
// let customHeaderValue = null;

// router.get('/sendHeader', (req, res) => {
//   customHeaderValue = req.headers['app-type'];
//   res.send('Header received');
// });

// // Bアプリ用のエンドポイント
// router.get('/receiveHeader', (req, res) => {
//   res.send(customHeaderValue);
// });

// module.exports = router;