/****************************************************

外部用 WebSocket接続モジュール
@module externalWss
*****************************************************/
import http from "http"
import websocket from "ws"
import logger from "@/libs/logger"
import tokenInfo from "@/libs/tokenInfo"
import IORedis from "ioredis"
import * as def from "@/definitions/def"
const redisPort = 6379
const redisAddress = "redis"
const redis = new IORedis(redisPort, redisAddress)

/**

WebSocketの接続を確立する
@param {http.Server} server リクエストオブジェクト
@returns {websocket.Server} WebSocketサーバインスタンス
*/
export const externalWssConnection = (server: http.Server) => {
const wss = new websocket.Server({
server: server,
})
/**

WebSocket接続クライアント数を取得する
@returns {number} 接続クライアント数
*/
const clientCount = () => {
return wss.clients.size
}
// WebSocket接続時
wss.on("connection", (ws: any, req: any) => {
logger.info(
external websocket connected: ${ws._socket.remoteAddress}:${ws._socket.remotePort}, url: ${ req.url }, clientCount: ${clientCount()}
)
let hasToken = false
/**
* トークン認証是非に関わらずメッセージ送信する関数
* @param {Object} msgObj メッセージオブジェクト
* @param {boolean} msgObj.wsAuthorization WebSocketの認証有無
* @param {string} msgObj.message 通知メッセージ
* @param {any} msgObj.received 受信データ
/
const wsForcedSend = function (msgObj: { wsAuthorization?: boolean; message?: string; received?: any }) {
try {
ws.send(JSON.stringify(msgObj))
} catch (err) {
logger.error(
external websocket send error: ${ws._socket.remoteAddress}:${ws._socket.remotePort}, url: ${req.url}
)
}
}
/*
* トークン認証した場合にメッセージ送信する関数
* @param {Object} msgObj メッセージオブジェクト
* @param {string} msgObj.method 通知種別 “publish”
* @param {string} msgObj.event 通知イベント名
* @param {any} msgObj.type 機器種別
* @param {boolean|undefined} msgObj.wsAuthorization 認証状態
* @param {string|undefined} msgObj.message 通知メッセージ
* @param {any} msgObj.received 受信データ
* ※使用していない引数が含まれるが、通知内容が決まり次第見直しする
*/
const wsSend = function (msgObj: {
method?: string
event?: string
type?: any
wsAuthorization?: boolean | undefined
message?: string | undefined
received?: any
}) {
if (hasToken) wsForcedSend(msgObj)
}

// 認証していない場合は1分後に自動切断する
setTimeout(function () {
  if (!hasToken) {
    logger.info(
      `external websocket auto close cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort} url ${req.url}`
    )
    wsForcedSend({ message: "disconnect because it is not authorized." })
    return ws.close()
  }
}, 1000 * 60)

// WebSocket切断時
ws.onclose = () => {
  logger.info(
    `external websocket close cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort} cl_num ${clientCount()}`
  )
}

// WebSocketエラー発生時
ws.onerror = () => {
  ws.close()
  logger.error(
    `external websocket error cl_addr ${ws._socket.remoteAddress}:${ws._socket.remotePort} cl_num ${clientCount()}`
  )
}

// WebSocketメッセージ受信時のトークン認証処理
ws.onmessage = (message: any) => {
  const msgObj = JSON.parse(message.data as string)
  if ("token" in msgObj) {
    if (tokenInfo.isValidToken(String(msgObj.token))) {
      // トークン認証成功時
      hasToken = true
      wsForcedSend({ wsAuthorization: true, message: "it is authorized." })
    } else {
      // トークン認証失敗時
      wsForcedSend({ wsAuthorization: false, message: "request message received but not authorized." })
    }
  } else {
    // トークン情報がない場合は送られたメッセージをそのまま返す
    wsForcedSend({ received: msgObj })
  }
}

// 状態変化通知取得用にRedisにAPIサーバをメンバ追加する
const createApiMember = () => {
  const KEY = def.NOTIFY_MQDB_MEMBER_KEY
  const MEMBER = def.SOURCE_MODULE
  redis.sadd(KEY, MEMBER, (err, _data) => {
    if (err) {
      logger.error("Fail SADD key: " + KEY + ", member: " + MEMBER)
    } else {
      logger.debug("SADD key: " + KEY + ", member: " + MEMBER)
    }
  })
}
createApiMember()
// Redisの状態変化通知キーを監視し、フィールドが追加されたらWebSocket通知を発信する
const wsNotify = () => {
  const KEY = def.NOTIFY_KEY
  redis.blpop(KEY, 0, (_err, data) => {
    // 認証済みの場合のみ通知を行う
    if (data) {
      const dataObj = JSON.parse(String(data[1]))
      logger.debug("Get from redis key: " + KEY + ", field: " + JSON.stringify(dataObj))
      // WebSocket送信
      wsSend(dataObj)
    }
    wsNotify()
  })
}
wsNotify()

return wss
})
}