/****************************************************
 * ユーティリティ ライブラリ（APIサーバ全体で使用する関数を定義）
 * @module util
 *****************************************************/
import crypto from "crypto"
import { Request, Response, NextFunction } from "express"
import ApiError from "@/types/ApiError"
import logger from "@/libs/logger"
import csrfTokenInfo from "@/libs/csrfTokenInfo"
import { isPermitWithOutCsrfToken, cnvIpv4MappedAddressToIpv4Address } from "@/libs/internalPermission"
import IORedis from "ioredis"
import * as def from "@/definitions/def"
import * as controlDefs from "@/definitions/controlDefs"

/**
 * スタブモードで起動していればtrue
 */
export const isStub = process.env.STUBMODE === "on"

/**
 * res.jsonを使う場面では基本、この関数を使用する
 * @param {Request} req リクエストオブジェクト
 * @param {Response} res レスポンスオブジェクト
 * @param {Object} data データオブジェクト
 * @param {number} statusCode ステータスコード
 * @returns {Object} レスポンスデータ
 * @example
 * wrapResJson(req, res, { data: "hoge" })
 * wrapResJson(req, res, { data: "hoge" }, 202)
 */
export const wrapResJson = (req: Request, res: Response, data: object, statusCode?: number) => {
	if (statusCode) {
		return res.status(statusCode).json(data)
	} else {
		return res.json(data)
	}
}

/**
 * MD5変換関数
 * @param {string} word MD5変換対象の文字列
 * @example
 * md5("abc") => "900150983cd24fb0d6963f7d28e17f72"
 */
export const md5 = (word: string) => crypto.createHash("md5").update(word).digest("hex")

/**
 * WebAPI用のエラーオブジェクトの作成関数
 * エラー処理時にnextの引数として使用する想定。
 * next関数に引き渡し後はエラーハンドリングの共通部でstatusで指定したHTTPステータスで
 * errNoとmessageを持ったオブジェクトをjsonで返す処理を実行する。
 * @param {string} message エラーメッセージ(省略した場合"Internal Server Error")
 * @param {number} errNo エラー番号(省略した場合1003)
 * @param {number} status HTTPステータスコード(省略した場合500)
 * @returns {ApiError} ApiErrorインスタンス
 * @example
 * if (err) next(createError("error", 3001, 500))
 */
export const createError = (message = "Internal Server Error", errNo = 1003, status = 500) => {
	return new ApiError(message, errNo, status)
}

/**
 * リクエスト番号生成関数
 * @returns {number} リクエスト番号
 */
let requestId = 0
export const createReqNumber = () => {
	requestId++
	if (requestId == 0 || requestId == 0xffff) {
		requestId = 1
	}
	return requestId
}

/**
 * 詳細機器種別から機器種別を示す2バイトを取得する関数
 * @param {string} devType  詳細機器種別
 * @returns {string} 機器種別
 * @example
 * param:0xAAEEFFFFGHHHHHHH return:0xEE
 */
export const getDevTypeHex = (devType: string) => {
	if (devType.length < 6) {
		// 6文字未満なら文字列から切り出せないためそのまま返す
		return devType
	}
	return devType.substring(0, 2) + devType.substring(4, 6)
}

/**
 * 機器タイプの名前を取得する関数
 * @param {string} devType - 詳細機器種別
 * @returns {string} - 機器タイプの名前
 */
export const getDevTypeName = (devType: string) => {
	const devTypeHex: string = getDevTypeHex(devType)
	// devTypeHexがcontrolDefs.tsのdevTypeオブジェクトのキーに含まれている場合、その名前を返す
	if (Object.prototype.hasOwnProperty.call(controlDefs.devType, devTypeHex)) {
		return controlDefs.devType[devTypeHex].name
	} else {
		// devTypeHexがcontrolDefs.tsのdevTypeオブジェクトのキーに含まれていない場合、devTypeをそのまま返す
		return devType
	}
}

/**
 * トークンを生成する
 * @param {number} length トークンの文字数
 * @returns {string} トークン
 */
export const createToken = (length = 10) => {
	const word = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	const tokenArr = [...Array(length)].map(() => word[Math.floor(Math.random() * word.length)])
	return tokenArr.join("")
}

/**
 * 受け取った値が空か判定する
 * @param {unknown} value
 * @returns {boolean} 空だった場合true
 */
export const isEmpty = (value: unknown): boolean => {
	if (value === null) return true

	switch (typeof value) {
	case "object":
		if (value) {
			if (Array.isArray(value)) {
				return false
			} else if (Object.keys(value).length > 0) {
				return false
			} else if (Object.keys(value).length !== undefined) {
				return Object.keys(value).length === 0
			} else if (typeof value.valueOf() !== "object") {
				return isEmpty(value.valueOf())
			} else {
				return false
			}
		} else {
			return false
		}
		break
	case "string":
		if (value === "" || value === "-") {
			return true
		} else {
			return false
		}
		break
	case "undefined":
		return true
	case "number":
		return Number.isNaN(value)
	case "boolean":
		return false
	default:
		return false
	}
}

/**
 * object内の要素で値が空のものを削除する
 * @param {object} obj 削除対象object
 * @returns {object} 削除後object
 */
export const removeEmpty = (obj: { [x: string]: any; activation?: boolean; organizationalUnitName?: string }) => {
	Object.keys(obj).forEach(
		function (key: string | number) {
			if (isEmpty(obj[key])) {
				delete obj[key]
			} else if (typeof obj[key] === "object") {
				removeEmpty(obj[key])
			}
		}.bind(this)
	)
	return obj
}

/**
 * XSS攻撃に該当するかどうかを判定する
 * @returns {next} 後続処理
 */
export const checkCrossSite = function () {
	return async function (req: Request, res: Response, next: NextFunction) {
		// クロスサイトスクリプティングのチェック(GET/POST/Cookie/Referer)
		// XSSのチェックを行う要素をオブジェクトにまとめる
		const params = {
			get: req.query,
			post: req.body,
			put: req.body,
			cookies: req.cookies,
			referer: { referer: req.headers.referer },
		} as any
		if (req.body.data && typeof req.body.data === "string") {
			try {
				params.post = JSON.parse(req.body.data)
			} catch (e) {
				// eslint-disable-next-line no-empty
				// パースに失敗した場合は無視する
			}
		}
		// referrerの禁則文字許容URLチェック（チェック対象外のURLはクエリパラメータのチェックを行わない）
		if (params.referer.referer && typeof params.referer.referer === "string") {
			if (params.referer.referer.indexOf(def.NO_CHECK_REF_URL) > -1) {
				params.referer.referer = params.referer.referer.split("?")[0]
			}
		}
		// ホワイトリストからの接続の場合、XSSチェックを行わず、後続処理実行
		if (def.NO_CHECK_XSS_URL.includes(req.url.split("?")[0])) {
			return next()
		}
		// 例外処理(禁則文字許可)
		// オブジェクト構造再帰チェックの対象外かどうか(対象ならobjscanがtrue)
		const objscan = def.NEST_OBJ_URL.indexOf(req.url.split("?")[0]) === -1
		for (const p in params) {
			// XSSの攻撃に該当するかどうかを判定
			if (isCrossSiteAttack(params[p], objscan)) {
				return next(createError("Bad Request(XSS).", 1006, 400))
			}
		}
		return next()
	}
}

/**
 * リクエストパラメータにXSSが含まれるかを判定する
 * 禁則文字（*"'`<>()及びNULL）が含まれるかをチェック
 * @param {any} params リクエストパラメーター
 * @param {boolean} objscan オブジェクト構造再帰チェックの対象かどうか
 * @returns {boolean} true:XSS検出あり false:XSS検出なし
 */
function isCrossSiteAttack(params: any, objscan: boolean) {
	for (const prop in params) {
		let val = params[prop]
		if (prop === "redirect" && typeof val === "string") {
			// redirectパラメータの特殊対応
			if (/^https?:\/\/.+/i.test(val)) {
				// 他ドメインへのリダイレクト回避のためホスト情報削除
				// https://の//のエスケープ
				// eslint-disable-next-line no-useless-escape
				const path = val.split(/^https?:\/\/[^\/]+\//)[1]
				val = params[prop] = "/" + (path ? path : "")
			}
			// XSS対象文字のエスケープ
			// eslint-disable-next-line no-useless-escape
			if (/["'`<>\(\)\0]/.test(val)) {
				// XSS対象文字"'`<>() 及び NULL ('&'は許可)
				logger.warn("Bad redirect(%s)", val)
				return true
			}
		} else if (prop === "ssid" || prop === "code") {
			// ssid, セキュリティコードはチェック除外
			continue
		} else if (
			isBadParam(prop, objscan) ||
      ((typeof val === "string" || Array.isArray(val) || (objscan && typeof val === "object")) &&
        isBadParam(val, objscan))
		) {
			logger.warn("Bad Param(%s=%s)", prop, val)
			return true
		} else {
			// eslint-disable-next-line no-empty
			// XSS検出なしとして、次のpropをチェックする
		}
	}
	return false
}

/**
 * 不正なスクリプトが埋め込まれているかどうかをオブジェクトの中まで再帰的にチェックする処理
 * @param {any} val リクエストパラメーター
 * @param {boolean} objscan オブジェクト構造再帰チェックの対象かどうか
 * @returns {boolean} true:XSS検出あり false:XSS検出なし
 */
function isBadParam(val: any, objscan: boolean) {
	// valが配列の場合
	if (Array.isArray(val)) {
		for (let i = 0; i < val.length; i++) {
			if (objscan && typeof val[i] === "object") {
				// objscan指定でオブジェクトの場合、各要素まで確認
				for (const p in val[i]) {
					if (isBadParam(val[i][p], objscan)) {
						return true
					}
				}
			} else if (isBadParam(val[i], objscan)) {
				return true
			} else {
				// eslint-disable-next-line no-empty
				// XSS検出なしとして、次のvalをチェック
			}
		}
		return false
	}
	// objscan指定で、かつvalがオブジェクトの場合
	if (objscan && typeof val === "object") {
		for (const q in val) {
			if (isBadParam(val[q], objscan)) {
				return true
			}
		}
		return false
	}

	// valが文字列の場合
	// XSS検出対象のエスケープ
	// eslint-disable-next-line no-useless-escape
	if (/\{(.|\n)+\:(.|\n)+\}/.test(val)) {
		// オブジェクト
		try {
			return isBadParam(JSON.parse(val), objscan)
		} catch (e) {
			logger.error("isBadParam Error!!")
			return true // 不正オブジェクト(正規オブジェクトは許可)
		}
	}
	// この文字を禁則文字として判定することで不正なスクリプトと関数の実行を防ぐ
	// XSS検出対象のエスケープ
	// eslint-disable-next-line no-useless-escape
	else if (/["'`<>\(\)\0]/.test(val)) {
		// XSS対象文字"'`&<>() 及び NULL ('&'は許可)
		logger.error("param is invalid string!!")
		return true
	}
	// 以下の文字を禁則文字として判定することで不正なスクリプトと関数の実行を防ぐ
	// 「任意の文字=任意の文字」「改行文字=任意の文字」「任意の文字=改行文字」「改行文字=改行文字」
	else if (
		/(.|\n)+=(.|\n)+/.test(val) && // 変数置換(base64エンコード、クエリ部分は除外)
    val.slice(-1) !== "=" &&
    !/\?.+=.+/.test(val)
	) {
		logger.error("param is variable!!")
		return true
	} else {
		// eslint-disable-next-line no-empty
		// XSS検出なしとして、次のpropをチェックする
	}
	return false
}

/**
 * CSRFトークンが有効かを判定する
 * @returns {next} 後続処理
 */
export const checkCSRFToken = function () {
	return async function (req: Request, res: Response, next: NextFunction) {
		let token
		const address = req.socket.remoteAddress as string
		const reqIpv4Addr = cnvIpv4MappedAddressToIpv4Address(address)
		const result = await isPermitWithOutCsrfToken(reqIpv4Addr)
		if (result === true) {
			// トークンが免除されている要求元の場合はチェックせず、後続処理実行
			return next()
		}
		if (def.NO_CHECK_CSRF_TOKEN_URL.includes(req.url.split("?")[0])) {
			// トークンが免除されているURLの場合はチェックせず、後続処理実行
			return next()
		}
		// トークンを取得
		if (req.method == "GET") {
			const urlArr = req.url.split("?")
			if (urlArr[1]) {
				const urlParam = urlArr[1].split("&")
				for (const par of urlParam) {
					if (par.indexOf("token=") > -1) {
						const parArr = par.split("=")
						token = Number(parArr[1])
						break
					}
				}
			}
		}
		if (req.method == "POST" || req.method == "PUT") {
			token = req.body.token
		}
		// トークンチェック
		if (csrfTokenInfo.isValidCsrfToken(token)) {
			return next()
		} else {
			return next(createError("Bad Request(token).", 1005, 400))
		}
	}
}

/**
 * パスワードが以下の条件を満たすか判定する
 * ・パスワードが8文字以上16文字以内である
 * ・アルファベット大文字・アルファベット小文字・数字・記号のうち3種類を含む
 * @param {string} password パスワード
 * @returns {boolean} true：判定OK、false：判定NG
 */
export function judgePassword(password: string) {
	let passFlg = true
	let passCnt = 0
	const ratz = /[a-z]/
	const rAtZ = /[A-Z]/
	const r0t9 = /[0-9]/
	// パスワードに使用できる記号のエスケープ
	// eslint-disable-next-line no-useless-escape
	const rKigou = /[!"#$%&'()~\\?|\/^`<>{}\[\],\._=:;@・\-\+\*]/g
	// パスワードが8文字以上16文字以内であること
	if (password.length < 8 || password.length > 16) {
		passFlg = false
	}
	// パスワードにアルファベット大文字・アルファベット小文字・数字・記号のうち3種類を含む
	if (rAtZ.test(password)) {
		passCnt += 1
	}
	if (ratz.test(password)) {
		passCnt += 1
	}
	if (r0t9.test(password)) {
		passCnt += 1
	}
	if (rKigou.test(password)) {
		passCnt += 1
	}
	if (passCnt < 3) {
		passFlg = false
	}
	return passFlg
}

/**
 * 状態変化通知取得用にRedisにAPIサーバをメンバ追加する
 * @param {number} retry - リトライ回数
 * @returns {void} - 値は返さない
 */

const redisPort = def.REDIS_PORT
const redisAddress = def.REDIS_ADDRESS
const redis = new IORedis(redisPort, redisAddress)

export const createApiMember = (retry = 0) => {
	const KEY = def.NOTIFY_MQDB_MEMBER_KEY
	const MEMBER = def.SOURCE_MODULE
	redis.sadd(KEY, MEMBER, (err, _data) => {
		if (err) {
			logger.error("Failed SADD key: " + KEY + ", member: " + MEMBER)
			if (retry < 3) {
				logger.debug("Retrying SADD...")
				// 5秒間隔で3回までリトライする
				setTimeout(() => createApiMember(retry + 1), 5000)
			}
		} else {
			logger.debug("SADD key: " + KEY + ", member: " + MEMBER)
		}
	})
}
