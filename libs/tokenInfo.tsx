/****************************************************

WebSocket接続用トークン管理 ライブラリ
@module tokenInfo
***************************************************/
let tokenList: string[] = []
const tokenInfo = {
/** 
現在のトークンを取得
@returns {String} token
**/
getToken: function () {
if (tokenList.length > 0) {
return tokenList[0]
}
},
/*
引数のトークンが有効か判定する
@param {String} token
@returns {Boolean} 有効ならtrue
/
isValidToken: function (token: string) {
return tokenList.indexOf(token) > -1
},
/*
トークンを生成する
@param {Number} length トークンの長さ
@returns {String} token
*/
createToken: function (length: number) {
const word = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const localLength = length ? Number(length) : 10
let token = ""
Array(localLength)
.fill("")
.forEach(function (x, i) {
token += word[Math.floor(Math.random() * word.length)]
})
return token
},
}
/**

トークン情報を更新する
*/
const updateToken = function () {
tokenList.unshift(tokenInfo.createToken(10))
if (tokenList.length > 2) {
tokenList = tokenList.slice(0, 1)
}
}
/**

古いトークン情報を削除する。
保持しているトークンが1以下の場合は削除せず保持する。
*/
const deleteToken = function () {
if (tokenList.length > 1) {
tokenList = tokenList.slice(0, 1)
}
}
updateToken() // モジュール読み込み時に更新
const updateInterval = 1000 * 60 * 60 // トークン更新間隔。1時間間隔
let intervalId = null
intervalId = setInterval(function () {
updateToken()
setTimeout(function () {
deleteToken()
}, 1000 * 60 * 3) // 更新後3分間は前のトークンを保持し、前のトークンでも受け付ける
}, updateInterval)

export default tokenInfo