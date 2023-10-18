/****************************************************
 * 認証サーバ起動処理
 *****************************************************/
import fs from "fs"
import https from "https"
import { contentsApp, contentsWsProxy } from "@/contents/contentsApp"
import { apiApp, apiWsProxy } from "@/api/apiApp"
import logger from "@/libs/logger"

// 認証サーバー起動時のオプション
const contentsOptions = {
	key: fs.readFileSync("certs/server-key.pem"),
	cert: fs.readFileSync("certs/server-crt.pem"),
	ca: fs.readFileSync("certs/ca-crt.pem"),
	secureProtocol: "TLSv1_2_method", // TLSv1.2のみ許可
	ciphers: [
		// Cipher Suites
		"ECDHE-ECDSA-AES256-GCM-SHA384",
		"ECDHE-ECDSA-AES128-GCM-SHA256",
		"ECDHE-RSA-AES256-GCM-SHA384",
		"ECDHE-RSA-AES128-GCM-SHA256",
		"!aNULL",
		"!eNULL",
		"!EXPORT",
		"!DES",
		"!RC4",
		"!MD5",
		"!PSK",
		"!SRP",
		"!CAMELLIA",
	].join(":"),
}

const apiOptions = Object.assign({}, contentsOptions, {
	requestCert: true, // クライアント認証あり
	rejectUnauthorized: false, // 自己証明書利用
})

// コンテンツサーバのリバースプロキシサーバー起動
const contentsPort = parseInt(process.env.CONTENTSPORT || "8443")
const contentsServer = https.createServer(contentsOptions, contentsApp)
const contentsListen = contentsServer.listen(contentsPort, (err?: Error) => {
	if (err) throw err
	logger.info(`Reverse proxy Contents server (port: ${contentsPort}) start...`)
})
contentsListen.on("upgrade", contentsWsProxy.upgrade as any) // websocket upgrade

// APIサーバのリバースプロキシサーバー起動
const apiPort = parseInt(process.env.APIPORT || "443")
const apiServer = https.createServer(apiOptions, apiApp)
const apiListen = apiServer.listen(apiPort, (err?: Error) => {
	if (err) throw err
	logger.info(`Reverse proxy API server (port: ${apiPort}) start...`)
})
apiListen.on("upgrade", apiWsProxy.upgrade as any) // websocket upgrade

export { contentsServer, apiServer }
