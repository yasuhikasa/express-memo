/****************************************************
 * APIサーバのリバースプロキシサーバ起動処理
 * @module apiApp
 *****************************************************/
import express, { Request, Response, NextFunction } from "express"
import { TLSSocket } from "tls"
import http from "http"
import { createProxyMiddleware, fixRequestBody } from "http-proxy-middleware"
import * as def from "@/definitions/def"
import ApiError from "@/types/ApiError"
import logger from "@/libs/logger"
import { digestAuth } from "@/libs/digestAuth"

const apiApp = express()

apiApp.use(express.json({ limit: "5mb" }))
apiApp.use(express.urlencoded({ limit: "5mb", extended: false }))

// サーバー情報をレスポンスヘッダから除外
apiApp.disable("x-powered-by")

// レスポンスヘッダを追加
apiApp.use((req: Request, res: Response, next: NextFunction) => {
	res.header("X-Panasonic-Controller-ID", "_cic")
	res.header("Content-Type", "text/html; charset=utf-8")
	res.header("Access-Control-Allow-Origin", "*")
	res.header("Access-Control-Allow-Methods", "GET,PUT,POST,DELETE")
	res.header("Access-Control-Allow-Headers", "Content-Type, Authorization")
	res.header("X-Content-Type-Options", "nosniff") // ドライブバイ・ダウンロード攻撃対策
	res.header("Content-Security-Policy", "default-src 'self'; frame-ancestors 'none'") // 他ドメインコンテンツの読み込み禁止
	res.header("Cache-Control", "private, no-store, no-cache, must-revalidate") // APIレスポンスはキャッシュさせない
	next()
})

// Digest認証
apiApp.use(digestAuth())

/**
 * クライアント認証
 * 認証状態を取得し、認証されていない場合は401エラーを返す。
 * @returns {object} レスポンスデータ
 */
apiApp.use((req: Request, res: Response, next: NextFunction) => {
	// クライアント認証状態を取得
	const clientAuthorized = (req.socket as TLSSocket).authorized
	if (!clientAuthorized) {
		logger.info("client authentication not authorized form [%s] [%s]", req.url, req.ip)
		return res.status(401).json({ errNo: 1001, message: "User is not authorized" })
	}
	logger.info("client authentication success from [%s] [%s]", req.url, req.ip)
	next()
})

const onProxy = (proxyReq: http.ClientRequest, req: http.IncomingMessage, res: http.ServerResponse) => {
	if (req.url === def.API_ACTIVATE_PATH) {
		// アクティベート要求時は、クライアント証明書のOrganizational Unit(OU)をヘッダーに追加
		logger.info(`req activate add header ou:${(req.socket as TLSSocket).getPeerCertificate().subject.OU}`)
		proxyReq.setHeader(def.CERTIFICATE_OU, (req.socket as TLSSocket).getPeerCertificate().subject.OU)
	}
	fixRequestBody(proxyReq, req)
}

// APIサーバのリバースプロキシミドルウェアを生成
apiApp.use(
	createProxyMiddleware(def.API_BASE_PATH, {
		target: def.EXTERNAL_API_URL,
		changeOrigin: true,
		onProxyReq: onProxy,
	})
)

// APIサーバのWebSocket通信用のリバースプロキシミドルウェアを生成
const apiWsProxy = createProxyMiddleware(def.API_WS_BASE_PATH, {
	target: def.EXTERNAL_API_WS_URL,
	changeOrigin: true,
})
apiApp.use(apiWsProxy)

// エラーハンドリング
apiApp.use((err: ApiError, req: Request, res: Response, next: NextFunction) => {
	if (err) {
		logger.error(err.message)
		return res.status(500).json({ errNo: 1003, message: "Internal Server Error" })
	}
})

export { apiApp, apiWsProxy }
