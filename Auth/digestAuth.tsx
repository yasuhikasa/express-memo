/****************************************************
 * Digest認証関連 ライブラリ
 * @module digestAuth
 *****************************************************/
import { Request, Response, NextFunction } from "express"
import crypto from "crypto"
import fetcher from "@/libs/fetcher"
import logger from "@/libs/logger"
import { isLocalhost } from "@/libs//util"
import { API_BASE_PATH } from "@/definitions/def"

interface userRes {
  hash: string
  noUserHash: string
}
// Digest認証用変数
const realm = "AiSEG"
// Digest認証失敗回数上限
const AUTH_COUNT = 3
// 認証回数管理用object
const iptable: { [key: string]: number } = {}

const no_check_cgi = [
	//index.cgiは認証対象外にしない(住コンの認証キャッシュ対応)
	"/get/msgdetail.cgi",
	"/get/top2.cgi",
	"/get/topsimple.cgi",
	"/get/graph.cgi",
	"/get/engelectcmp.cgi",
	"/get/ecoiku.cgi",
	"/get/devctrlmenu.cgi",
	"/get/thsensor.cgi",
	"/set/ecohst.cgi",
	"/set/exectop.cgi",
	"/isegAllGet.cgi",
	"/moniMacGet.cgi",
	"/valueStart.cgi",
	"/messageGet.cgi",
	"/setSupinfo.cgi",
	"/set/exectop2.cgi",
]

// Digest認証ミドルウェア関数
export const digestAuth = function () {
	return async function digest_auth(req: Request, res: Response, next: NextFunction) {
		logger.info("digest authentication start from [%s] [%s] ", req.url, req.ip)
		if (isLocalhost(req)) {
			// localhostからのアクセスはダイジェスト認証対象外
			logger.info("Do not authenticate because from localhost")
			return next()
		}
		if (req.url.match(/^\/apple-touch-icon|^\/action\/keep_session$/)) {
			// ダイジェスト認証除外URL (iPhone safari 対策)
			logger.info("digest authentication pass from [%s] [%s] ", req.url, req.ip)
			next()
		} else {
			const client_ip = req.ip

			// ダイジェスト認証の失敗回数チェック
			if (check_access_lock(client_ip, res) !== 0) {
				logger.info("digest authentication access lock from [%s] [%s] ", req.url, req.ip)
				return
			}

			// 認証ヘッダの有無のチェック
			if (!req.headers.authorization) {
				logger.info("digest authentication auth header none")
				authenticate(client_ip, res, true)
				return
			}

			// リクエストヘッダの認証情報の解析
			const authData: string = req.headers.authorization.replace("Digest ", "")
			const auth = parseAuth(authData)
			// ユーザーIDとパスワードのハッシュ、ユーザーIDのないパスワードのハッシュ取得
			const resUser = await fetcher.get<userRes>(`${API_BASE_PATH}/userSetting`)
			const ha2 = md5(req.method + ":" + auth.uri)

			const response1 = md5(
				[
					//ユーザ名:なし
					resUser.data.noUserHash,
					auth.nonce,
					auth.nc,
					auth.cnonce,
					auth.qop,
					ha2,
				].join(":")
			)

			const response2 = md5(
				[
					//ユーザ名:aiseg
					resUser.data.hash,
					auth.nonce,
					auth.nc,
					auth.cnonce,
					auth.qop,
					ha2,
				].join(":")
			)

			// responseの比較
			if (auth.response !== response1 && auth.response !== response2) {
				/*
          if( (util.isHomeCTRL(req)) && (req.url.split('?')[0].indexOf('index.cgi') === -1) ) {
            consolelog.debug("HomeCTRL redirect to index.cgi");
            res.redirect('/index.cgi');
            return;
          }
          */
				logger.warn("digest response mismatch: count_remain=%d", iptable[client_ip])
				authenticate(client_ip, res, false)
				return
			}

			logger.info("digest authentication success from [%s] [%s] ", req.url, req.ip)
			remove_ipaddress(client_ip)
			next()
		} // localhost
	}
}

/**
 * アクセスロック確認
 * 認証に3回失敗した場合は、403 ロック画面を表示し、1分間後にロック解除を行う
 * @param {String} client_ip 接続先IPアドレス
 * @param {Object} res HTTP response
 * @return {number} 0:アクセスロックなし, -1:アクセスロック発生
 **/
function check_access_lock(client_ip: string, res: Response) {
	if (iptable[client_ip] <= 0) {
		// アクセスロック発生
		// 認証ロック画面表示
		res.status(403).json({ errNo: 1006, message: "Digest authentication required" })

		//AISEGのようにブルー画面を出す場合はコンテンツが必要
		//res.render('parts/blue_error', { title: title, message: message, error:{} });
		if (iptable[client_ip] === 0) {
			// ロック解除処理
			setTimeout(function () {
				remove_ipaddress(client_ip)
			}, 60 * 1000)
			iptable[client_ip]--
		}
		return -1
	}
	return 0
}

/**
 * 認証回数管理用objectからのIPアドレス削除
 * @param {String} client_ip 接続先IPアドレス
 **/
function remove_ipaddress(client_ip: string) {
	if (iptable[client_ip]) {
		delete iptable[client_ip]
	}
}

/**
 * 認証回数管理用objectへのIPアドレス登録
 * @param {String} client_ip 接続先IPアドレス
 * @param {boolean} first true:first access, false: second access
 * @returns {undefined} undefined
 **/
function add_ipaddress(client_ip: string, first: boolean) {
	let lock
	if (iptable[client_ip] && !first) {
		iptable[client_ip]--
		lock = setTimeout(function () {
			if (iptable[client_ip]) {
				lock = null
			}
		}, 1000)
	} else if (!iptable[client_ip]) {
		iptable[client_ip] = AUTH_COUNT
		lock = setTimeout(function () {
			if (iptable[client_ip]) {
				lock = null
			}
		}, 1000)
	}
	return
}

/**
 * md5ハッシュ化
 * @param {String} msg md5でハッシュ化したい文字列
 * @return {String} md5でハッシュ化した文字列
 **/
function md5(msg: string) {
	return crypto.createHash("md5").update(msg).digest("hex")
}

/**
 * 401 エラー表示
 * @param {String} client_ip 接続先IPアドレス
 * @param {Object} res HTTP response
 * @param {boolean} first true:first access, false: second access
 * @returns {object} レスポンスデータ
 **/
function authenticate(client_ip: string, res: Response, first: boolean) {
	add_ipaddress(client_ip, first)
	if (check_access_lock(client_ip, res) === 0) {
		res.status(401)
		res.header(
			"WWW-Authenticate",
			'Digest realm="' + realm + '"' + ',qop="auth",nonce="' + Math.random() + '"' + ',opaque="' + md5(realm) + '"'
		)
		return res.status(401).json({ errNo: 1006, message: "Digest authentication required" })
	}
}

/**
 * requestの認証情報解析
 * @param {Object} auth requestの認証情報
 * @return {Object} authObj 解析した認証情報
 **/
function parseAuth(auth: string) {
	const authObj: { [key: string]: string } = {}
	auth = auth.replace(/\s+/g, "") // 空白削除
	auth.split(",").forEach(function (pair) {
		// ","で分割
		const pairArr = pair.split("=")
		if (pair.length == 2) {
			authObj[pairArr[0]] = pairArr[1].replace(/"/g, "")
		} else {
			// URL query文字列対応
			let uri_string = pairArr[1]
			for (let i = 2; i < pairArr.length; i++) {
				uri_string = uri_string + "=" + pairArr[i]
			}
			authObj[pairArr[0]] = uri_string.replace(/"/g, "")
		}
	})
	return authObj
}
