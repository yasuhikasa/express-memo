/****************************************************

内部用 WebSocket接続モジュール
@module internalWss
*****************************************************/
import http from "http"
import websocket from "ws"
import fs from "fs/promises"
import logger from "@/libs/logger"
import { CONTENTS_WS_TOKEN_HASH_FILE } from "@/definitions/def"
import { isPermitWithOutWebSocketToken, cnvIpv4MappedAddressToIpv4Address } from "@/libs/internalPermission"
/**

コンテンツ用WebScketのトークン情報取得
@returns {string|null} トークン情報
**/
const readContentsWsTokenFile = async () => {
let hashData = ""
try {
hashData = await fs.readFile(CONTENTS_WS_TOKEN_HASH_FILE, "utf-8")
} catch (err) {
logger.error(internal websocket token read error)
}
return hashData
}
/**

WebSocketの接続を確立する
@param {http.Server} server リクエストオブジェクト
@returns {websocket.Server} WebSocketサーバインスタンス
*/
export const internalWssConnection = (server: http.Server) => {
const wss = new websocket.Server({
server: server,
})
/**

WebSocket接続クライアント数を取得する
@returns {number} 接続クライアント数
*/
const clients_num = function () {
let cnt = 0
wss.clients.forEach(function (c) {
cnt += 1
})
return cnt
}
// WebSocket接続時
wss.on("connection", async (ws: any, req: any) => {
logger.info(
internal websocket connected cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort} url ${ req.url } cl_num ${clients_num()}
)

let hasToken = false
let token = ""

/**
 * トークン認証是非に関わらずメッセージ送信する関数
 * @param {Object} msgObj メッセージオブジェクト
 * @param {boolean} msgObj.wsAuthorization WebSocketの認証有無
 * @param {string} msgObj.message 通知メッセージ
 * @param {any} msgObj.received 受信データ
 */
const wsForcedSend = function (msgObj: { wsAuthorization?: boolean; message?: string; received?: any }) {
  try {
    ws.send(JSON.stringify(msgObj))
  } catch (err) {
    logger.error(
      `internal websocket send error cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort} url ${req.url}`
    )
  }
}
/**
 * トークン認証した場合にメッセージ送信する関数
 * @param {Object} msgObj メッセージオブジェクト
 * @param {string} msgObj.method 通知種別 “publish”
 * @param {string} msgObj.event 通知イベント名
 * @param {any} msgObj.type 機器種別
 * @param {boolean|undefined} msgObj.wsAuthorization 認証状態
 * @param {string|undefined} msgObj.message 通知メッセージ
 * @param {any} msgObj.received 受信データ
 */
const wsSend = function (msgObj: {
  method?: string
  event?: string
  type?: any
  wsAuthorization?: boolean | undefined
  message?: string | undefined
  received?: any
}) {
  // トークン認証した場合にメッセージ送信する関数
  if (hasToken) wsForcedSend(msgObj)
}

// WebSocket切断時
ws.onclose = () => {
  logger.info(
    `internal websocket close cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort} cl_num ${clients_num()}`
  )
}

// WebSocketエラー発生時
ws.onerror = () => {
  ws.close()
  logger.error(
    `internal websocket error cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort} cl_num ${clients_num()}`
  )
}

ws.onmessage = (message: any) => {
  // メッセージ受付時のトークン処理
  const msgObj = JSON.parse(message.data as string)
  if ("token" in msgObj) {
    logger.info(
      `internal websocket recv token ${msgObj.token} keep token ${token} cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort}`
    )
    // トークン確認
    if (msgObj.token === token) {
      logger.info(`internal websocket token success cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort}`)
      hasToken = true
    } else {
      logger.error(`internal websocket token mismatch cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort}`)
    }
  } else {
    logger.error(
      `internal websocket recv non token property cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort}`
    )
  }
}

token = await readContentsWsTokenFile()

const reqIpv4Addr = cnvIpv4MappedAddressToIpv4Address(ws._socket.remoteAddress)
const result = await isPermitWithOutWebSocketToken(reqIpv4Addr)
if (result === true) {
  // トークンが免除されている要求元の場合はトークン受信済み扱いにする
  hasToken = true
}
logger.info(`internal websocket reqIpv4Addr:${reqIpv4Addr} hasToken:${hasToken}`)

return wss
})
}