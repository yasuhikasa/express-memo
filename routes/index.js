var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
res.render('index', { title: 'Express' });
});

router.post('/post', (req, res) => {
  const customHeader = req.headers['app-type'];

  console.log(customHeader);

  if (customHeader === 'settings') {
    console.log('success');
    // res.redirect('http://localhost:3000/receiveHeader'); // Next.jsアプリへリダイレクト
  } else {
    res.status(403).json({ error: 'Invalid header value' });
  }
});

module.exports = router;

