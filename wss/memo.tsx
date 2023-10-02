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
import {propertyChange, deviceInfoChange, updateHistory} from "@/stub/stubData/statusChangeStubData"
import * as def from "@/definitions/def"
import IORedis from "ioredis"
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
const redisPort = 6379
const redisAddress = "redis"
const redis = new IORedis(redisPort, redisAddress)

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

/**
 * 状態変化通知取得用にRedisにAPIサーバをメンバ追加する
 */
const createApiMember = (retry = 0) => {
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
createApiMember()

const wsNotify = () => {
  const KEY = def.NOTIFY_KEY
  redis.blpop(KEY, 0, (_err, data) => {
    if (data) {
      const result:any = formatNotification(data);
      // const dataObj = JSON.parse(String(data[1]))
      // console.log("dataです", dataObj)
      logger.debug("BLPOP key: " + KEY + ", field: " + JSON.stringify(result))
      // 認証済みの場合にWebSocket送信
      wsSend(result)
    }
    wsNotify()
  })
}

const formatNotification = (data: any) => {
  const dataObj = JSON.parse(String(data[1]))
  // console.log("data", dataObj)
switch(dataObj.event) {
  case 'propertyChange':
    // 機器プロパティの通知を成形
    return {
      method: 'publish',
      event: dataObj.event,
      type: dataObj.detailed_device_type,
      device_identifier: dataObj.device_identifier,
      properties: {
        connection: dataObj.connection,
        operation_status: dataObj.operation_status,
        operation_mode: dataObj.operation_mode,
        target_temperature: dataObj.target_temperature,
        humidity: dataObj.humidity,
        room_temperature: dataObj.room_temperature,
        outdoor_temperature: dataObj.outdoor_temperature,
        air_flow_level: dataObj.air_flow_level,
        flow_direction_v: dataObj.flow_direction_v,
        humidification_mode: dataObj.humidification_mode,
        power_saving: dataObj.power_saving,
        off_timer_setting_time: dataObj.off_timer_setting_time,
        pse_correspondence_setting: dataObj.pse_correspondence_setting,
        fault_state: dataObj.fault_state,
        remote_control_setting: dataObj.remote_control_setting
        }
    };
  case 'deviceInfoChange':
    // 機器登録情報の通知を成形
    return {
      method: "publish",
      event: dataObj.event,
      deviceInfo: {
          device_info_list_number: dataObj.device_info_list_number,
          device_info_list: dataObj.device_info_list
      }
          };
  case 'updateHistory':
    // 履歴データの通知を整形
    return {
      method: 'publish',
      event: dataObj.event,
      data:{
        update_history_number:dataObj.update_history_number,
        update_history_list:dataObj.update_history_list
      }
    };
  default:
    // 不明な通知タイプの場合
    console.error('Unknown notification type:', data);
    return null;
}
};

const KEY = def.NOTIFY_KEY
  redis.rpush(KEY, JSON.stringify(updateHistory)).then(() => {
    wsNotify()
  })

return wss
})
}