/****************************************************

機器制御 ハンドラ
@module devices
*****************************************************/
import { RequestHandler } from "express"
import ApiError from "@/types/ApiError"
import logger from "@/libs/logger"
import * as _ from "@/libs/util"
import * as ioRedis from "@/libs/redis"
import * as def from "@/definitions/def"
import { checkAirConPropertyRange } from "./devicesValueRange"
import * as z from "zod"
import * as controlDefs from "@/definitions/controlDefs"
/**

個別機器制御APIの型定義
**/
// 個別機器制御取得共通プロパティ
type deviceCommonProp = {
device_identifier: number
detailed_device_type: string
device_name: string
place_name: string
connection: boolean
property_list: object
}
// 機器制御コマンドリスト（詳細機器種別をキー、機器の持つプロパティとコマンドリストをバリューとした辞書。GW起動中は保持し続ける。）
const commandListTable: { [deviceType: string]: any } = {}
// エアコンプロパティ定義リスト（GW起動中は保持し続ける）
let airconPropertyList: any = {}
// 詳細機器種別をキー、機器に対応するスキーマをバリューとした辞書
const schemaDic: { [deviceType: string]: any } = {}

/**

登録機器一覧取得APIの応答情報生成
@method convertGetDevicesRes
@param {object} obj Redisから取得した応答データ
@returns {object} API応答オブジェクト
**/
const convertGetDevicesRes = (obj: any) => {
const convertedObj: any = {}
let remote_control_setting = false
if (!obj.device_info_list_number || !obj.device_info_list) {
return convertedObj
}
// API応答用にプロパティのキー名を置き換える
convertedObj.device_info_list_number = obj.device_info_list_number
convertedObj.device_info_list = obj.device_info_list.map((device: any) => {
const convertedDevice: any = {}
convertedDevice.protocol_kind = device.protocol_kind
convertedDevice.device_identifier = device.device_identifier
convertedDevice.detailed_device_type = device.detailed_device_type
convertedDevice.place_name = device.place_name
convertedDevice.device_name = device.device_name

// "*device_info"オブジェクトが存在する場合はそのまま代入する
for (const key in device) {
  if (typeof device[key] === "object" && device[key] !== null && key.includes("device_info")) {
    // SETプロパティマップに0x93が存在する場合は遠隔操作設定プロパティを追加する
    if (device[key].echonetlite_set_property_map) {
      remote_control_setting = device[key].echonetlite_set_property_map.includes("0x93")
      convertedDevice.remote_control_setting = remote_control_setting
    }
    convertedDevice[key] = device[key]
    break
  }
}
return convertedDevice
})

return convertedObj
}

/**

登録機器一覧取得

@method /devices
**/
export const getDevices: RequestHandler = async (req, res, next) => {
try {
const redis = ioRedis.getRedisInstance()
// 要求生成
const reqField = {
request_type: "getDevInfo",
source_module: def.SOURCE_MODULE,
request_id: _.createReqNumber(),
}

// 要求をPUSH
await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))
// 応答をPOP
const resKey = def.RES_KEY + reqField.request_id
const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20)
logger.debug("BLPOP key: " + resKey + ", field: " + JSON.stringify(data))
if (!data || data.status != 0) {
// データ取得失敗
throw _.createError("Failed to get", 3002, 500)
}
const result = convertGetDevicesRes(data)
if (!result) {
// データに必須のプロパティが含まれていない
throw _.createError("Invalid data format", 3003, 500)
}
// 正常応答
.wrapResJson(req, res, result)
} catch (err) {
// エラー応答
if (err instanceof ApiError) {
next(err)
} else {
next(.createError(${err}, 3001, 500))
}
}
}

/**

機器制御コマンド取得(GET)
@method /devices/getCommand/:detailed_device_type
**/
export const getDevicesCommand: RequestHandler = async (req, res, next) => {
const deviceType = req.params.detailed_device_type
// 詳細機器種別が不正
if (!deviceType) {
return next(.createError("Invalid device type", 3003, 400))
}
try {
// 対象詳細機器種別コマンドリスト取得
if (!commandListTable[deviceType]) {
const commandList = await getCommandList(deviceType)
if (commandList) {
commandListTable[deviceType] = commandList
} else {
return next(.createError("Failed to get", 3002, 500))
}
}
// 正常応答
const resultObj: any = {}
if (
commandListTable[deviceType].propertyNumber &&
commandListTable[deviceType].propertyList &&
commandListTable[deviceType].controlCommandNumber &&
commandListTable[deviceType].controlCommandList
) {
resultObj.property_number = commandListTable[deviceType].propertyNumber
resultObj.property_list = commandListTable[deviceType].propertyList
resultObj.control_command_number = commandListTable[deviceType].controlCommandNumber
resultObj.control_command_list = commandListTable[deviceType].controlCommandList.map((controlCommand: any) => {
const convertedControlCommand: any = {}
convertedControlCommand.control_command = controlCommand.control_command
if (!controlCommand.control_command_argument_list) {
return convertedControlCommand
}
convertedControlCommand.control_command_argument_list = controlCommand.control_command_argument_list.map(
(commandArg: any) => {
const convertedCommandArg = commandArg
// enum_countが含まれていたらその要素を削除して返す
if (commandArg.enum_count) {
delete convertedCommandArg.enum_count
}
return convertedCommandArg
}
)
return convertedControlCommand
})
}
// commandListTableに適切なプロパティがなかった場合
if (Object.keys(resultObj).length === 0) {
// データ取得失敗
throw _.createError("Invalid data format", 3004, 500)
}
.wrapResJson(req, res, resultObj)
} catch (err) {
logger.error(err)
// エラー応答
if (err instanceof ApiError) {
next(err)
} else {
next(.createError(${err}, 3001, 500))
}
}
}
/**

エアコンプロパティ定義取得(GET)

@method /devices/airConditioner/properties/def
**/
export const getAirConditionerProperties: RequestHandler = async (req, res, next) => {
try {
// エアコンプロパティ定義リストが空の場合はRedisからデータを取得する
if (Object.keys(airconPropertyList).length <= 0) {
const redis = ioRedis.getRedisInstance()
// 要求生成
const reqField = {
request_type: "getAllAirconPropScope",
source_module: def.SOURCE_MODULE,
request_id: _.createReqNumber(),
}

// 要求をPUSH
await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))
// 応答をPOP
const resKey = def.RES_KEY + reqField.request_id
const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20)
logger.debug("BLPOP key: " + resKey + ", field: " + JSON.stringify(data))
if (!data || data.status != 0) {
// データ取得失敗
throw _.createError("Failed to get", 3002, 500)
}
// API応答用にデータを変換
const result: any = {}
result.aircon_property_list = data.aircon_property_scope_list
if (!result) {
// データ取得失敗
throw _.createError("Invalid data format", 3003, 500)
}
// エアコンプロパティ定義リストに格納
airconPropertyList = result
}
// 正常応答
.wrapResJson(req, res, airconPropertyList)
} catch (err) {
// エラー応答
if (err instanceof ApiError) {
next(err)
} else {
next(.createError(${err}, 3001, 500))
}
}
}

/**

個別機器プロパティ状態取得(GET)
@method /devices/:type/properties/:propertyName
*/
export const getDevicesPropertyName: RequestHandler = async (req, res, next) => {
/
let redisPop
try {
const redis = getRedisInstance()
// MQDB要求情報生成
const reqType = "funcCtrl"
const reqId = createReqNumber()
const deviceIdStr: string | undefined = req.get("X-Panasonic-Device-ID")
const deviceId =
deviceIdStr !== undefined ? parseInt(deviceIdStr, 10) : next(createError("Can't get devices", 3001, 500))
const reqField = {
reqType: reqType,
srcModule: API_SERVER,
reqId: reqId,
devId: deviceId,
devType: req.params.type,
param: {
cmdType: GET,
propNum: 1,
propList: [req.params.propertyName],
},
}
// MQDB要求をPUSH
await redis.rpush(REQ_KEY, JSON.stringify(reqField))
logger.debug("RPUSH redis key: " + REQ_KEY + ", field: " + JSON.stringify(reqField))
// MQDB応答情報生成
const resKey = RES_KEY + reqId
// MQDB応答をPOP
redisPop = newRedisInstance()
let data = await redisPop.blpop(resKey, TIMEOUT_10)
if (data) {
const dataObj = JSON.parse(String(data[1]))
logger.debug("Get from redis key: " + resKey + ", field: " + JSON.stringify(dataObj))
// API応答を生成
if (dataObj.status != "0") {
next(createError("Can't get devices invalid status 1st", 3001, 500))
} else {
// MQDB応答をPOP
data = await redisPop.blpop(resKey, TIMEOUT_10)
if (data) {
const dataObj = JSON.parse(String(data[1]))
logger.debug("Get from redis key: " + resKey + ", field: " + JSON.stringify(dataObj))
// API応答を生成
if (dataObj.status != "0") {
next(createError("Can't get devices invalid status 2nd", 3001, 500))
} else {
wrapResJson(req, res, dataObj)
}
} else {
next(createError("Can't get devices data none 2nd", 3001, 500))
}
}
} else {
next(createError("Can't get devices data none 1st", 3001, 500))
}
} catch (err) {
logger.error(err)
next(createError(${err}, 3001, 500))
} finally {
if (redisPop !== undefined) {
logger.debug("disconnectRedis")
disconnectRedis(redisPop)
}
}*/
}
/**

個別機器取得要求(GET)

@method /devices/:detailed_device_type/properties/_any
/
export const getDevicesProperties: RequestHandler = async (req, res, next) => {
/*

取得結果をAPI応答用に整形する関数
@method convertGetDevicesPropRes
@param {deviceCommonProp} obj Redisから取得した応答データ
@returns {object} API応答オブジェクト
*/
const convertGetDevicesPropRes = (obj: deviceCommonProp) => {
const convertedObj: { _any: object } = { _any: {} }
// 機器登録情報
const regObj = {
device_identifier: obj.device_identifier,
detailed_device_type: obj.detailed_device_type,
device_name: obj.device_name,
place_name: obj.place_name,
connection: obj.connection,
}
// 個別機器制御情報
const propObj = obj.property_list

// API応答用のオブジェクト
convertedObj._any = { ...regObj, ...propObj }
return convertedObj
}

// 応答ヘッダに機器識別ID追加
const deviceIdStr: string | undefined = req.get("X-Panasonic-Device-ID")
res.set("X-Panasonic-Device-ID", deviceIdStr)
const deviceId = deviceIdStr !== undefined ? parseInt(deviceIdStr, 10) : undefined
const deviceType = req.params.detailed_device_type

// ヘッダーの機器識別IDが不正
if (!deviceId) {
return next(.createError("Invalid device ID", 3003, 400))
}
// 詳細機器種別が不正
if (!deviceType) {
return next(.createError("Invalid device type", 3004, 400))
}

try {
// 対象機器識別IDの情報を取得
const deviceInfo = await getRegDevInfo(deviceId)
// 対象の機器がコントロール対象でなければエラー
if (!deviceInfo.agreement_status.device_control) {
return next(_.createError("Not supported type", 3005, 400))
}

// 対象詳細機器種別コマンドリスト取得
if (!commandListTable[deviceType]) {
  const commandList = await getCommandList(deviceType)
  if (commandList) {
    commandListTable[deviceType] = commandList
  } else {
    return next(_.createError("Failed to get", 3002, 500))
  }
}

// 個別機器状態取得
const redis = ioRedis.getRedisInstance()
// 要求生成
const paramList = {
  command_type: "get",
  property_number: commandListTable[deviceType].propertyList.length,
  property_list: commandListTable[deviceType].propertyList,
}
const reqField = {
  request_type: "funcCtrl",
  source_module: def.SOURCE_MODULE,
  request_id: _.createReqNumber(),
  device_identifier: deviceId,
  detailed_device_type: deviceType,
  parameter: paramList,
}
// 要求をPUSH
await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))
// 応答をPOP
const resKey = def.RES_KEY + reqField.request_id
let data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
logger.debug("BLPOP(1) key: " + resKey + ", field: " + JSON.stringify(data))
// API応答を生成（1次応答エラー）
if (!data || data.status != "0") {
  return next(_.createError("Failed to get", 3002, 500))
}
// 応答をPOP
data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
logger.debug("BLPOP(2) key: " + resKey + ", field: " + JSON.stringify(data))
// API応答を生成（2次応答エラー）
if (!data || data.status != "0") {
  return next(_.createError("Failed to get", 3002, 500))
}
// 正常応答
const msgObj: deviceCommonProp = { ...deviceInfo, ...data.property }
const resultObj = convertGetDevicesPropRes(msgObj)
_.wrapResJson(req, res, resultObj)
} catch (err) {
logger.error(err)
// エラー応答
if (err instanceof ApiError) {
next(err)
} else {
next(_.createError(${err}, 3001, 500))
}
}
}

/**

個別機器制御要求(PUT)
@method /devices/:detailed_device_type/properties/_any
**/
export const putDevicesProperties: RequestHandler = async (req, res, next) => {
const redis = ioRedis.getRedisInstance()
// 要求情報生成
const deviceIdStr: string | undefined = req.get("X-Panasonic-Device-ID")
res.set("X-Panasonic-Device-ID", deviceIdStr)
const deviceId = deviceIdStr !== undefined ? parseInt(deviceIdStr, 10) : undefined
const remoteCtrl = req.get("X-Panasonic-Remote-Control-Setting") === "true" ? true : false
const devType = req.params.detailed_device_type
const { command, ...param } = req.body
const reqField = {
request_type: "funcCtrl",
source_module: def.SOURCE_MODULE,
request_id: _.createReqNumber(),
device_identifier: deviceId,
detailed_device_type: devType,
parameter: {
command_type: "SET",
control_command: command,
control_command_argument: {},
option: {
remote_control: remoteCtrl,
},
},
}
// ヘッダーの機器識別IDが不正
if (!deviceId) {
return next(.createError("Invalid deviceID", 3003, 400))
}
// 機器詳細種別が不正
if (!devType) {
return next(.createError("Invalid device type", 3005, 400))
}

try {
// 対象機器IDの情報を取得
const deviceInfo = await getRegDevInfo(deviceId)
// 対象の機器がコントロール状態でなければエラー
if (!deviceInfo.agreement_status.device_control) {
return next(_.createError("Not supported type", 3006, 400))
}

// 対象詳細機種別コマンドリスト取得
if (!commandListTable[devType]) {
  const commandList = await getCommandList(devType)
  if (commandList) {
    commandListTable[devType] = commandList
  } else {
    return next(_.createError("Failed to get", 3002, 500))
  }
}

// 対象詳細機器種別のスキーマがなければスキーマを取得しにいく
if (!schemaDic[devType]) {
  // エアコンの場合・コマンドリストを元にスキーマを作成
  const extendSchema = createAirconSchema(commandListTable[devType])
  // メモリ上に保存（2回目以降はメモリを参照）
  schemaDic[devType] = extendSchema
}
// コマンドチェック（クライアント側の指定したコマンドが間違えていればバリューはundefined）
if (!schemaDic[devType][command]) {
  return next(_.createError("Invalid command", 3007, 400))
}

let propertyList: any = {}
// スキーマで指定した型・条件でparse、条件を満たさなければエラー
try {
  propertyList = schemaDic[devType][command].parse(req.body)
} catch {
  return next(_.createError("Incorrect properties", 3011, 400))
}
// 要求用プロパティリストからコマンドを削除
delete propertyList[command]

// 機器詳細種別から機器種別を示す2バイト目の文字列を取得
const devTypeHex = _.getDevTypeHex(devType)

if (devTypeHex === controlDefs.AIR_CONDITIONER) {
  // 対象機器の種類がエアコンの場合
  // エアコンプロパティ値域テーブルに値が存在しない場合取得する
  if (Object.keys(airconPropertyList).length <= 0) {
    try {
      const redis = ioRedis.getRedisInstance()
      // 要求生成
      const reqField = {
        request_type: "getAllAirconPropScope",
        source_module: def.SOURCE_MODULE,
        request_id: _.createReqNumber(),
      }

      // 要求をPUSH
      await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
      logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))

      // 応答をPOP
      const resKey = def.RES_KEY + reqField.request_id
      const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20)
      logger.debug("BLPOP key: " + resKey + ", field: " + JSON.stringify(data))
      if (!data) {
        // データ取得失敗
        throw _.createError("Failed to get", 3002, 500)
      }
      // API応答用にデータを変換
      const result: any = {}
      result.aircon_property_list = data.aircon_property_scope_list
      if (!result || data.status != "0") {
        // データ取得失敗
        throw _.createError("Invalid airconditioner property", 3004, 500)
      }
      // エアコンプロパティ定義リストに格納
      airconPropertyList = result
    } catch (err) {
      // エラー応答
      if (err instanceof ApiError) {
        next(err)
      } else {
        next(_.createError(`${err}`, 3001, 500))
      }
    }
  }

  // 対象機器がエアコンプロパティ一覧に存在するか判定
  const validAirconDevice = airconPropertyList.aircon_property_list.some(
    (airconProperty: { detailed_device_type: string }) => {
      return airconProperty.detailed_device_type === devType
    }
  )
  if (!validAirconDevice) {
    return next(_.createError("Not supported type", 3006, 400))
  }

  // エアコンプロパティ値域チェック
  const checkRangeResult = checkAirConPropertyRange(
    airconPropertyList.aircon_property_list,
    command,
    param,
    devType
  )

  if (!checkRangeResult) {
    return next(_.createError("Property out of range", 3009, 400))
  }
}

Object.assign(reqField.parameter.control_command_argument, propertyList)

// 要求をPUSH
await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))

// 応答情報生成
const resKey = def.RES_KEY + reqField.request_id
// 応答をPOP
let data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
logger.debug("BLPOP(1) key: " + resKey + ", field: " + JSON.stringify(data))
// 1次応答エラー
if (!data || data.status != "0") {
  return next(_.createError("Failed to set", 3010, 500))
}
// 応答をPOP
data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
logger.debug("BLPOP(2) key: " + resKey + ", field: " + JSON.stringify(data))
// 2次応答エラー
if (!data || data.status != "0") {
  return next(_.createError("Failed to set", 3010, 500))
}

// API応答用オブジェクトの作成
const resultObj = {
  _any: {
    command: command,
    ...reqField.parameter.control_command_argument,
  },
}
_.wrapResJson(req, res, resultObj, 202)
} catch (err) {
logger.error(err)
// エラー応答
if (err instanceof ApiError) {
next(err)
} else {
next(_.createError(${err}, 3001, 500))
}
}
}

/**

登録機器一覧から機器識別IDが登録されているか確認し、

登録されている場合は対象の機器情報配列を取得する。

@param {number} deviceId 機器識別ID

@returns {object} 対象機器識別IDの情報オブジェクト
*/
const getRegDevInfo = async (deviceId: number) => {
try {
// 機器登録情報取得
const redis = ioRedis.getRedisInstance()
// 要求生成
const reqField = {
request_type: "getDevInfo",
source_module: def.SOURCE_MODULE,
request_id: _.createReqNumber(),
}

// 要求をPUSH
await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))
// 応答をPOP
const resKey = def.RES_KEY + reqField.request_id
const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20)
logger.debug("BLPOP key: " + resKey + ", field: " + JSON.stringify(data))
if (!data || data.status != 0) {
// データ取得失敗
throw _.createError("Failed to get", 3002, 500)
}
// データに対象機器の登録情報があるか確認
const targetDeviceInfo = data.device_info_list.find(
(obj: { device_identifier: number }) => obj.device_identifier === deviceId
)
if (!targetDeviceInfo) {
throw _.createError("Invalid device ID", 3003, 400)
}

return targetDeviceInfo
} catch (err) {
logger.error(err)
if (err instanceof ApiError) {
throw err
} else {
throw _.createError(${err}, 3001, 500)
}
}
}

/**

Redisから詳細機器種別コマンドリストを取得する

@param {string} deviceType 詳細機器種別

@return {object} 対象詳細機器種別のコマンドリスト
*/
const getCommandList = async (deviceType: string) => {
try {
const redis = ioRedis.getRedisInstance()
// 要求生成
const reqField = {
request_type: "getCtrlCmd",
source_module: def.SOURCE_MODULE,
request_id: _.createReqNumber(),
detailed_device_type: deviceType,
}

// 要求をPUSH
await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))
// 応答をPOP
const resKey = def.RES_KEY + reqField.request_id
const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20)
logger.debug("BLPOP key: " + resKey + ", field: " + JSON.stringify(data))
if (!data || data.status != 0) {
// データ取得失敗
throw _.createError("Failed to get", 3002, 500)
}
// 取得したデータからstatus以外を取り出してコマンドリストに追加する
const commandList = {
propertyNumber: data.property_number,
propertyList: data.property_list,
controlCommandNumber: data.control_command_number,
controlCommandList: data.control_command_list,
}
return commandList
} catch (err) {
logger.error(err)
if (err instanceof ApiError) {
throw err
} else {
throw _.createError(${err}, 3001, 500)
}
}
}

/**

エアコン用のスキーマを作る関数
@param {any} decvicesControlCommandList コマンドリスト
@returns コマンドをキー・スキーマをバリューとした辞書
*/
const createAirconSchema = (decvicesControlCommandList: any) => {
const schemaAirconDic: { [command: string]: any } = {}
for (const commandList of decvicesControlCommandList.controlCommandList) {
// コマンドは共通で必須
let commandSchema = z
.object({
command: z.string().nonempty(),
})
.strict()
// Redisを参照してコマンドに対して必要なプロパティスキーマを作る
for (const commandArgList of commandList.control_command_argument_list) {
switch (commandArgList.property) {
case "operation_status":
commandSchema = commandSchema.extend({
operation_status: z.boolean(),
})
break
case "target_temperature":
commandSchema = commandSchema.extend({
target_temperature: z.number(),
})
break
case "air_flow_level":
commandSchema = commandSchema.extend({
air_flow_level: z.number(),
})
break
case "air_flow_level_p":
commandSchema = commandSchema.extend({
air_flow_level_p: z.number(),
})
break
case "flow_direction_v":
commandSchema = commandSchema.extend({
flow_direction_v: z.number(),
})
break
case "room_temperature":
commandSchema = commandSchema.extend({
room_temperature: z.number(),
})
break
case "humidity":
commandSchema = commandSchema.extend({
humidity: z.number(),
})
break
case "outdoor_temperature":
commandSchema = commandSchema.extend({
outdoor_temperature: z.number(),
})
break
case "humidification_mode":
commandSchema = commandSchema.extend({
humidification_mode: z.number(),
})
break
case "humidification_level":
commandSchema = commandSchema.extend({
humidification_level: z.string(),
})
break
case "power_saving_operation_setting":
commandSchema = commandSchema.extend({
power_saving_operation_setting: z.boolean(),
})
break
default:
break
}
}
// コマンドごとにスキーマをバリューとして記録
schemaAirconDic[commandList.control_command] = commandSchema
}
return schemaAirconDic
}