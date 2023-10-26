/****************************************************

内部用 APIサーバ起動処理
@module innternalApp
*****************************************************/
import express, { Request, Response, NextFunction } from "express"
import ApiError from "@/types/ApiError"
import logger from "@/libs/logger"
import { internalWssConnection } from "@/routers/internal/internalWebsocket/internalWss"
import { API_BASE_PATH } from "@/definitions/def"
import { checkCrossSite, checkCSRFToken } from "@/libs/util"
import csrfToken from "@/routers/internal/internalRoutes/csrfToken"
import wsToken from "@/routers/internal/internalRoutes/wsToken"
import systemSetting from "@/routers/internal/internalRoutes/systemSetting"
import devices from "@/routers/internal/internalRoutes/devices"
import userSetting from "@/routers/internal/internalRoutes/userSetting"
export const app = express()

app.use(express.json({ limit: "5mb" }))
app.use(express.urlencoded({ limit: "5mb", extended: false }))

// サーバー情報をレスポンスヘッダから除外
app.disable("x-powered-by")

// CSRFトークンをチェック
app.use(checkCSRFToken())

// リクエストしたurlがチェック対象であればXSS攻撃に当たるかどうかを判定
app.use(checkCrossSite())

// APIハンドラー登録
app.use(API_BASE_PATH, csrfToken) // CSRF用トークンの取得
app.use(API_BASE_PATH, wsToken) // WebSocket用トークンの取得
app.use(API_BASE_PATH, devices) // 機器制御
app.use(API_BASE_PATH, systemSetting) // システム設定
app.use(API_BASE_PATH, userSetting) // ユーザー設定

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
logger.error(internal api error ${req.method} ${req.path} ${err})
return res.status(500).json({ errNo: 1003, message: "Internal Server Error" })
}
}
})
// APIサーバー起動
const port = parseInt(process.env.INT_PORT as string)
const internalApp = app.listen(port, (err?: Error) => {
if (err) throw err
// WebSocket確立
internalWssConnection(internalApp)
logger.info(internal web server (port: ${port}) start...)
})

export default internalApp