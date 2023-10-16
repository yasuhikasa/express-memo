/****************************************************

外部用 APIサーバ起動処理
@module externalApp
*****************************************************/
import express, { Request, Response, NextFunction } from "express"
import ApiError from "@/types/ApiError"
import logger from "@/libs/logger"
import { externalWssConnection } from "@/routers/external/externalWebsocket/externalWss"
import activationInfo from "@/libs/activationInfo"
import { createError, checkCrossSite } from "@/libs/util"
import { API_BASE_PATH } from "@/definitions/def"
import activate from "@/routers/external/externalRoutes/activate"
import token from "@/routers/external/externalRoutes/token"
import registries from "@/routers/external/externalRoutes/registries"
import devices from "@/routers/external/externalRoutes/devices"
import airqualities from "@/routers/external/externalRoutes/airqualities"
import systemSetting from "@/routers/external/externalRoutes/systemSetting"
export const app = express()

app.use(express.json({ limit: "5mb" }))
app.use(express.urlencoded({ limit: "5mb", extended: false }))

// サーバー情報をレスポンスヘッダから除外
app.disable("x-powered-by")

// activateを判断しなくていいURL
const notActivateUrlArray = {
targetUrl: ["/activate"],
}

/**

activateを判断しなくていいURLか確認
@param {Request} req
@returns {boolean} 対象外URLの場合true
*/
export const isNotActivateURL = (req: Request) => {
let result = -1
result = notActivateUrlArray.targetUrl.indexOf(req.path)
if (result === -1) {
return false
}
return true
}
// アクティベート判定
app.use(API_BASE_PATH, function (req: Request, res: Response, next: NextFunction) {
// 非アクティベート対象のURLもしくはアクティベート済みの場合処理を継続
if (isNotActivateURL(req) || activationInfo.status) {
return next()
} else {
return next(createError("not activation. please call [PUT]/activate API.", 1005, 403))
}
})

// リクエストしたurlがチェック対象であればXSS攻撃に当たるかどうかを判定
app.use(checkCrossSite())

// APIハンドラー登録
app.use(API_BASE_PATH, activate) // 共通 WebAPI有効化無効化
app.use(API_BASE_PATH, token) // 状態変化通知 トークン情報取得
app.use(API_BASE_PATH, registries) // 機器登録 一括機器登録の開始と停止
app.use(API_BASE_PATH, devices) // 機器制御
app.use(API_BASE_PATH, systemSetting) // システム設定
app.use(API_BASE_PATH, airqualities) // 空気質履歴・報知 空気質履歴取得

/**

エラーハンドリング
@returns {object} レスポンスデータ
*/
app.use(API_BASE_PATH, (req: Request, res: Response, next: NextFunction) => {
// エンドポイントが存在しない
return res.status(404).json({ errNo: 1002, message: "Not found" })
})
/**

エラー処理
@returns {object} レスポンスデータ
*/
app.use(API_BASE_PATH, (err: ApiError, req: Request, res: Response, next: NextFunction) => {
if (err) {
try {
const errObj = err.toJson()
logger.error(${req.method} ${req.path} ${JSON.stringify(errObj)})
return res.status(err.status).json(errObj)
} catch {
logger.error(external api error ${req.method} ${req.path} ${err})
return res.status(500).json({ errNo: 1003, message: "Internal Server Error" })
}
}
})
// APIサーバー起動
const port = parseInt(process.env.EXT_PORT as string)
const externalApp = app.listen(port, (err?: Error) => {
if (err) throw err
// WebSocket確立
externalWssConnection(externalApp)
logger.info(external web server (port: ${port}) start...)
})
export default externalApp