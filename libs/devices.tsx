/****************************************************
 * 機器制御 ハンドラ
 * @module devices
 *****************************************************/
import { RequestHandler } from "express"
import ApiError from "@/types/ApiError"
import logger from "@/libs/logger"
import * as _ from "@/libs/util"
import * as ioRedis from "@/libs/redis"
import * as def from "@/definitions/def"
import * as z from "zod"
import * as controlDefs from "@/definitions/controlDefs"
import { airconOperationModeEnum } from "@/definitions/controlDefs"

/**
 * 個別機器制御APIの型定義
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
 * 登録機器一覧取得APIの応答情報生成
 * @method convertGetDevicesRes
 * @param {object} obj Redisから取得した応答データ
 * @returns {object} API応答オブジェクト
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
 * 登録機器一覧取得
 * @method /devices
 **/
export const getDevices: RequestHandler = async (req, res, next) => {
	try {
		const data = await getRegDevInfo()
		const result = convertGetDevicesRes(data)
		if (!result) {
			// データに必須のプロパティが含まれていない
			throw _.createError("Invalid data format", 3003, 500)
		}
		// 正常応答
		_.wrapResJson(req, res, result)
	} catch (err) {
		// エラー応答
		if (err instanceof ApiError) {
			next(err)
		} else {
			next(_.createError(`${err}`, 3001, 500))
		}
	}
}

/**
 * 機器制御コマンド取得(GET)
 * @method /devices/getCommand/:detailed_device_type
 **/
export const getDevicesCommand: RequestHandler = async (req, res, next) => {
	const deviceType = req.params.detailed_device_type
	// 詳細機器種別が不正
	if (!deviceType) {
		return next(_.createError("Invalid device type", 3003, 400))
	}
	try {
		// 対象詳細機器種別コマンドリスト取得
		if (!commandListTable[deviceType]) {
			const commandList = await getCommandList(deviceType)
			if (commandList) {
				commandListTable[deviceType] = commandList
			} else {
				return next(_.createError("Failed to get", 3002, 500))
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
		_.wrapResJson(req, res, resultObj)
	} catch (err) {
		logger.error(err)
		// エラー応答
		if (err instanceof ApiError) {
			next(err)
		} else {
			next(_.createError(`${err}`, 3001, 500))
		}
	}
}

/**
 * エアコンプロパティ定義取得(GET)
 * @method /devices/airConditioner/properties/def
 **/
export const getAirConditionerProperties: RequestHandler = async (req, res, next) => {
	try {
		// エアコンプロパティ定義リストが空の場合はRedisからデータを取得する
		if (Object.keys(airconPropertyList).length <= 0) {
			// エアコンプロパティ定義リストに格納
			airconPropertyList = await getAirconProp()
		}
		// 正常応答
		_.wrapResJson(req, res, airconPropertyList)
	} catch (err) {
		// エラー応答
		if (err instanceof ApiError) {
			next(err)
		} else {
			next(_.createError(`${err}`, 3001, 500))
		}
	}
}

/**
 * 個別機器プロパティ状態取得(GET)
 * @method /devices/:type/properties/:propertyName
 **/
export const getDevicesPropertyName: RequestHandler = async (req, res, next) => {
	/*
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
    next(createError(`${err}`, 3001, 500))
  } finally {
    if (redisPop !== undefined) {
      logger.debug("disconnectRedis")
      disconnectRedis(redisPop)
    }
  }*/
}

/**
 * 個別機器取得要求(GET)
 * @method /devices/:detailed_device_type/properties/_any
 */
export const getDevicesProperties: RequestHandler = async (req, res, next) => {
	/**
   * 取得結果をAPI応答用に整形する関数
   * @method convertGetDevicesPropRes
   * @param {deviceCommonProp} obj Redisから取得した機器情報データ
   * @param {object} result Redisから取得した機器状態データ
   * @returns {object} API応答オブジェクト
   */
	const convertGetDevicesPropRes = (obj: deviceCommonProp, result: object) => {
		const convertedObj: { _any: object } = { _any: {} }

		// 機器登録情報
		const regObj = {
			device_identifier: obj.device_identifier,
			detailed_device_type: obj.detailed_device_type,
			device_name: obj.device_name,
			place_name: obj.place_name,
			connection: obj.connection,
		}

		// API応答用のオブジェクト
		convertedObj._any = { ...regObj, ...result }
		return convertedObj
	}

	// 応答ヘッダに機器識別ID追加
	const deviceIdStr: string | undefined = req.get("X-Panasonic-Device-ID")
	res.set("X-Panasonic-Device-ID", deviceIdStr)
	const deviceId = deviceIdStr !== undefined ? parseInt(deviceIdStr, 10) : undefined
	const deviceType = req.params.detailed_device_type
	const enableCache = req.get("Cache-Control") !== "no-cache"

	// ヘッダーの機器識別IDが不正
	if (!deviceId) {
		return next(_.createError("Invalid device ID", 3003, 400))
	}
	// 詳細機器種別が不正
	if (!deviceType) {
		return next(_.createError("Invalid device type", 3004, 400))
	}
	// 機器詳細種別から機器種別を示す2バイト目の文字列を取得
	const devTypeHex = _.getDevTypeHex(deviceType)

	// 対象の機器がコントロール状態でなければエラー
	if (!controlDefs.devType[devTypeHex]?.control) {
		return next(_.createError("Not supported type", 3006, 400))
	}

	try {
		// 対象詳細機器種別コマンドリスト取得
		if (!commandListTable[deviceType]) {
			const commandList = await getCommandList(deviceType)
			if (commandList) {
				commandListTable[deviceType] = commandList
			} else {
				throw _.createError("Failed to get", 3002, 500)
			}
		}

		const result = await getDevProp(deviceType, deviceId, enableCache)
		// 対象機器識別IDの情報を取得
		const deviceInfo = await getRegDevInfo(deviceId)

		// 正常応答
		const resultObj = convertGetDevicesPropRes(deviceInfo, result)
		_.wrapResJson(req, res, resultObj)
	} catch (err) {
		logger.error(err)
		// エラー応答
		if (err instanceof ApiError) {
			next(err)
		} else {
			next(_.createError(`${err}`, 3001, 500))
		}
	}
}

/**
 * 個別機器制御要求(PUT)
 * @method /devices/:detailed_device_type/properties/_any
 **/
export const putDevicesProperties: RequestHandler = async (req, res, next) => {
	const redis = ioRedis.getRedisInstance()
	// 要求情報生成
	const deviceIdStr: string | undefined = req.get("X-Panasonic-Device-ID")
	res.set("X-Panasonic-Device-ID", deviceIdStr)
	const deviceId = deviceIdStr !== undefined ? parseInt(deviceIdStr, 10) : undefined
	const remoteCtrl = req.get("X-Panasonic-Remote-Control-Setting") === "true" ? true : false
	const devType = req.params.detailed_device_type
	const param = req.body
	let command = param.command
	const ZODValidationProperties: any = {}
	const enableCache = req.get("Cache-Control") !== "no-cache"
	const reqField: any = {
		request_type: "funcCtrl",
		source_module: def.SOURCE_MODULE,
		request_id: _.createReqNumber(),
		device_identifier: deviceId,
		detailed_device_type: devType,
		parameter: {
			command_type: "set",
			control_command: "",
			control_command_argument: {},
			option: {
				remote_control: remoteCtrl,
			},
		},
	}
	// 機器詳細種別から機器種別を示す2バイト目の文字列を取得
	const devTypeHex = _.getDevTypeHex(devType)

	// ヘッダーの機器識別IDが不正
	if (!deviceId) {
		return next(_.createError("Invalid deviceID", 3003, 400))
	}
	// 機器詳細種別が不正
	if (!devType) {
		return next(_.createError("Invalid device type", 3004, 400))
	}
	// 対象の機器がコントロール状態でなければエラー
	if (!controlDefs.devType[devTypeHex]?.control) {
		return next(_.createError("Not supported type", 3005, 400))
	}

	try {
		// 対象詳細機器種別コマンドリスト取得
		if (!commandListTable[devType]) {
			const commandList = await getCommandList(devType, true)
			if (commandList) {
				commandListTable[devType] = commandList
			} else {
				return next(_.createError("Failed to set", 3002, 500))
			}
		}

		// 個別機器状態取要求
		const deviceCurrentValue = await getDevProp(devType, deviceId, enableCache, true)

		// requestパラメーターで受け取ったプロパティの不正をチェック
		try {
			checkRequestParam(devTypeHex, param)
		} catch (err) {
			if (err) {
				return next(err)
			}
		}

		// 対象コマンドの先頭文字列を特定
		const { targetCommandHead, responseCommand } = findCommandHead(devTypeHex, param, deviceCurrentValue)

		// 対象のコマンドリストを特定(リストの要素は一つが正常)
		const targetComamndList = commandListTable[devType].controlCommandList.filter((command: any) => {
			const splitCommand = command.control_command.split("_")
			const commandHead = splitCommand[0]
			return commandHead === targetCommandHead
		})

		// 期待されるコマンドが一つに特定できていない場合エラー
		if (targetComamndList.length !== 1) {
			return next(_.createError("Invalid properties", 3006, 400))
		}
		command = targetComamndList[0].control_command

		/**
     * 要求するコマンドに必要なプロパティリスト(Redisから取得)と比較して、requestパラメーターに不足しているプロパティを現在値で補完する。
     * 意味は同じで名称が異なるプロパティ(air_flow_levelとair_flow_level_pなど)に関してはRedisが受け付けるプロパティ名称に変換してRedisに要求する必要がある。
     * その場合Redisから取得したプロパティリストを元にしてRedisに要求可能なプロパティに名称を変換する。
     */
		for (const controlCommandArgument of targetComamndList[0].control_command_argument_list) {
			// Redisへの要求に必要なプロパティ
			const targetProperty = controlCommandArgument.property
			// 変換対象となりうるプロパティ
			const replaceTargetProperty: string | undefined = controlDefs.replaceTargetProperties[targetProperty]

			if (param[targetProperty] === undefined) {
				if (!replaceTargetProperty) {
					// requestパラメーターにRedisの入力に必要なプロパティが不足しており、かつ変換対象となりうるプロパティでない場合は現在値で補完
					ZODValidationProperties[targetProperty] = deviceCurrentValue[targetProperty]
				} else if (param[replaceTargetProperty]) {
					// 不足したプロパティが変換対象となりうるものであり、requestパラメーターに存在する場合はパラメーターの値を使用
					// EX) 要求するコマンドに必要なプロパティリストに存在するプロパティ: air_flow_level_p, requestパラメーター: air_flow_levelが存在する
					// →air_flow_level_pにrequestパラメーターの値を入れて要求
					ZODValidationProperties[targetProperty] = param[replaceTargetProperty]
				} else {
					// 不足したプロパティが変換対象となりうるものであり、requestパラメーター内で不足している場合は現在値で補完
					// EX) 要求するコマンドに必要なプロパティリストに存在するプロパティ: air_flow_level_p, requestパラメーター: air_flow_levelが不足している
					// →air_flow_level_pに現在値を入れて要求
					ZODValidationProperties[targetProperty] = deviceCurrentValue[targetProperty]
				}
			} else {
				// 対象のプロパティがrequestパラメーターに存在する場合はrequestパラメーターで受け取ったプロパティの値を使用
				ZODValidationProperties[targetProperty] = param[targetProperty]
			}
		}

		// Redisに設定するコマンド及びプロパティの最終確認
		for (const property in ZODValidationProperties) {
			if (ZODValidationProperties[property] === undefined) {
				return next(_.createError("Invalid properties", 3006, 400))
			}
		}

		// 対象詳細機器種別のスキーマがなければスキーマを取得しにいく
		if (!schemaDic[devType]) {
			// Redisのコマンドリストを元にスキーマを作成
			const extendSchema = createSchema(devTypeHex, commandListTable[devType])
			// メモリ上に保存（2回目以降はメモリを参照）
			schemaDic[devType] = extendSchema
		}

		let requestRedisPropertyList: any = {}
		// スキーマで指定した型・条件でparse、条件を満たさなければエラー
		try {
			requestRedisPropertyList = schemaDic[devType][command].parse(ZODValidationProperties)
		} catch {
			return next(_.createError("Invalid properties", 3006, 400))
		}

		// 値域判定
		try {
			await checkPropertyRange(devType, command, requestRedisPropertyList)
		} catch (err) {
			if (err) {
				return next(err)
			}
		}

		reqField.parameter.control_command = command
		Object.assign(reqField.parameter.control_command_argument, requestRedisPropertyList)

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
			return next(_.createError("Failed to set", 3002, 500))
		}
		// 応答をPOP
		data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
		logger.debug("BLPOP(2) key: " + resKey + ", field: " + JSON.stringify(data))
		// 2次応答エラー
		if (!data || data.status != "0") {
			return next(_.createError("Failed to set", 3002, 500))
		}

		// 受け取ったプロパティの形でレスポンスを返すよう変換
		for (const property in reqField.parameter.control_command_argument) {
			// 補完したプロパティはresponseで返さない
			if (!(property in param)) {
				delete reqField.parameter.control_command_argument[property]
			}
			// requestパラメーターで受け取ったプロパティの名称を変換して要求した場合、変換元の名称でresponseを返す
			const replaceTargetProperty: string | undefined = controlDefs.replaceTargetProperties[property]
			if (replaceTargetProperty in param && property in controlDefs.replaceTargetProperties) {
				reqField.parameter.control_command_argument[controlDefs.replaceTargetProperties[property]] =
          requestRedisPropertyList[property]
			}
		}

		// API応答用オブジェクトの作成
		const resultObj = {
			_any: {
				...responseCommand,
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
			next(_.createError(`${err}`, 3001, 500))
		}
	}
}

/**
 * 機器種別IDが指定されていれば、登録機器一覧から対象の機器が登録されているか確認し、
 * 登録されている場合は対象の機器情報配列を取得する。
 * 機器種別IDが指定されていなければ、登録機器一覧を全件取得する。
 * @param {number} deviceId 機器識別ID
 * @returns {object} 対象機器識別IDの情報オブジェクト
 */
const getRegDevInfo = async (deviceId?: number) => {
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

		// 機器種別IDが指定されていれば単体の値を返す
		if (deviceId) {
			// データに対象機器の登録情報があるか確認
			const targetDeviceInfo = data.device_info_list.find(
				(obj: { device_identifier: number }) => obj.device_identifier === deviceId
			)
			if (!targetDeviceInfo) {
				throw _.createError("Invalid device ID", 3003, 400)
			}
			return targetDeviceInfo
		} else {
			return data
		}
	} catch (err) {
		logger.error(err)
		if (err instanceof ApiError) {
			throw err
		} else {
			throw _.createError(`${err}`, 3001, 500)
		}
	}
}

/**
 * Redisから詳細機器種別コマンドリストを取得する
 * @param {string} deviceType 詳細機器種別
 * @param {boolean} isSet 呼び出し元がSET要求かどうか
 * @return {object} 対象詳細機器種別のコマンドリスト
 */
const getCommandList = async (deviceType: string, isSet = false) => {
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
			if (isSet) {
				// データ取得失敗
				throw _.createError("Failed to set", 3002, 500)
			} else {
				// データ取得失敗
				throw _.createError("Failed to get", 3002, 500)
			}
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
			throw _.createError(`${err}`, 3001, 500)
		}
	}
}

/**
 * 個別機器状態取要求理実行
 * @param {string} devType 詳細機器種別
 * @param {number} deviceId 機器識別ID
 * @param {boolean} enableCache キャッシュ利用可否
 * @param {boolean} isSet 呼び出し元がSET要求かどうか
 * @returns {object} 個別機器状態
 */
const getDevProp = async (devType: string, deviceId: number, enableCache: boolean, isSet = false) => {
	try {
		const redis = ioRedis.getRedisInstance()
		let result

		// キャッシュを使用する場合
		if (enableCache) {
			const data: any = await redis.hget(def.CACHE_KEY, deviceId.toString())
			result = JSON.parse(data)
		}
		// キャッシュを使用しない、またはキャッシュデータが存在しない
		if (!enableCache || !result) {
			// 要求生成
			const paramList = {
				command_type: "get",
				property_number: commandListTable[devType].propertyList.length,
				property_list: commandListTable[devType].propertyList,
			}
			const reqField = {
				request_type: "funcCtrl",
				source_module: def.SOURCE_MODULE,
				request_id: _.createReqNumber(),
				device_identifier: deviceId,
				detailed_device_type: devType,
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
				if (isSet) {
					// 呼び出し元がSET要求の場合
					throw _.createError("Failed to set", 3002, 500)
				} else {
					throw _.createError("Failed to get", 3002, 500)
				}
			}
			// 応答をPOP
			data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
			logger.debug("BLPOP(2) key: " + resKey + ", field: " + JSON.stringify(data))
			// API応答を生成（2次応答エラー）
			if (!data || data.status != "0") {
				if (isSet) {
					// 呼び出し元がSET要求の場合
					throw _.createError("Failed to set", 3002, 500)
				} else {
					throw _.createError("Failed to get", 3002, 500)
				}
			}
			result = data.property.property_list
		}
		return result
	} catch (err) {
		logger.error(err)
		// エラー応答
		if (err instanceof ApiError) {
			throw err
		} else {
			throw _.createError(`${err}`, 3001, 500)
		}
	}
}

/**
 * 機器種別ごとのルールでrequestパラメーターで受け取ったプロパティの不正をチェックする
 * @param {string} devTypeHex 詳細機器種別内に存在する、機器種別を示す文字列
 * @param {any} param requestパラメーター
 */
const checkRequestParam = (devTypeHex: string, param: any) => {
	if (param.operation_status !== undefined && typeof param.operation_status !== "boolean") {
		throw _.createError("Invalid properties", 3006, 400)
	}

	switch (devTypeHex) {
	case controlDefs.AIR_CONDITIONER:
		// コマンド及び運転モードのいずれも指定がない場合、またはコマンド、運転モード、ステータスのいずれも指定がなく、温度などその他のプロパティも指定がない
		// 条件1-command:指定あり,operation_mode:指定あり
		// 条件2-command:指定なし,operation_mode:指定なし,operation_status:指定なし(温度などその他のプロパティ:指定なし)
		if ((param.command && param.operation_mode) || Object.keys(param).length === 0) {
			throw _.createError("Invalid properties", 3006, 400)
		}
		break

	default:
		break
	}
}

/**
 * 機器種別ごとのルールでコマンドの先頭文字列を特定する
 * @param {string} devTypeHex 詳細機器種別内に存在する、機器種別を示す文字列
 * @param {any} param requestパラメーター
 * @param {any} deviceCurrentValue 現在値
 * @returns {any} コマンドの先頭文字列と、API応答用オブジェクト
 */
const findCommandHead = (devTypeHex: string, param: any, deviceCurrentValue: any) => {
	let targetCommandHead
	let responseCommand

	if (param.command) {
		targetCommandHead = param.command.split("_")[0]
		responseCommand = { command: param.command }
		return { targetCommandHead, responseCommand }
	}

	switch (devTypeHex) {
	case controlDefs.AIR_CONDITIONER:
		if (!param.operation_mode && param.operation_status === undefined) {
			// コマンド、運転モード、ステータスのいずれも指定がなく、温度などその他のプロパティが指定されている場合は現在の運転モードを補完して適用
			// 条件-command:指定なし,operation_mode:指定なし,operation_status:指定なし(温度などその他のプロパティ:指定あり)
			targetCommandHead = airconOperationModeEnum[deviceCurrentValue.operation_mode]
		} else if (param.operation_status === false) {
			// ステータスを適用し電源オフ
			// 条件-command:指定なし,operation_status:false
			targetCommandHead = airconOperationModeEnum[0]
			// API応答用にステータスを保存
			responseCommand = { operation_status: param.operation_status }
		} else if (param.operation_mode) {
			// 運転モードを適用
			// 条件1-command:指定なし,operation_mode:指定あり,operation_status:true
			// 条件2-command:指定なし,operation_mode:指定あり,operation_status:指定なし
			targetCommandHead = airconOperationModeEnum[param.operation_mode]
			// API応答用に運転モードを保存
			responseCommand = { operation_mode: param.operation_mode }
		} else if (param.operation_status === true) {
			// 現在の運転モードを補完して適用
			// 条件-command:指定なし,operation_mode:指定なし,operation_status:true
			targetCommandHead = airconOperationModeEnum[deviceCurrentValue.operation_mode]
			responseCommand = { operation_status: param.operation_status }
		}
		break

	default:
		break
	}

	return { targetCommandHead, responseCommand }
}

/**
 * 値域チェック用のスキーマを作成する
 * @param {string} devTypeHex 詳細機器種別内に存在する、機器種別を示す文字列
 * @param {any} commandListTable コマンドリスト
 */
const createSchema = (devTypeHex: string, commandListTable: any) => {
	let schema
	switch (devTypeHex) {
	case controlDefs.AIR_CONDITIONER:
		schema = createAirconSchema(commandListTable)
		break

	default:
		break
	}
	return schema
}

/**
 * 値域をチェックする
 * @param {string} devType 詳細機器種別
 * @param {string} command コマンド
 * @param {any} requestRedisPropertyList 値域判定対象オブジェクト
 */
const checkPropertyRange = async (devType: string, command: string, requestRedisPropertyList: any) => {
	try {
		// 機器詳細種別から機器種別を示す2バイト目の文字列を取得
		const devTypeHex = _.getDevTypeHex(devType)

		switch (devTypeHex) {
		case controlDefs.AIR_CONDITIONER: {
			// エアコンプロパティ値域テーブルに値が存在しない場合取得する
			if (Object.keys(airconPropertyList).length <= 0) {
				airconPropertyList = await getAirconProp(true)
			}

			// 対象機器がエアコンプロパティ一覧に存在するか判定
			const validAirconDevice = airconPropertyList.aircon_property_list.some(
				(airconProperty: { detailed_device_type: string }) => {
					// 詳細機器種別の「分類」「機器種別」「メーカーコード」まで(0xを除く先頭4Byte)を比較
					return _.checkAirconDevType(airconProperty.detailed_device_type, devType)
				}
			)
			if (!validAirconDevice) {
				throw _.createError("Not supported type", 3006, 400)
			}

			// エアコンプロパティ値域チェック
			const checkRangeResult = checkAirconPropRange(
				airconPropertyList.aircon_property_list,
				command,
				requestRedisPropertyList,
				devType
			)
			if (!checkRangeResult) {
				throw _.createError("Property out of range", 3007, 400)
			}
			break
		}
		default:
			break
		}
	} catch (err) {
		if (err instanceof ApiError) {
			throw err
		} else {
			throw _.createError(`${err}`, 3001, 500)
		}
	}
}

/**
 * エアコンプロパティ定義取得要求実行
 * @param {boolean} isSet 関数呼び出し元がSET要求かどうか
 * @returns {object} エアコンプロパティ定義
 */
const getAirconProp = async (isSet = false) => {
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

		// 応答をPOP
		const resKey = def.RES_KEY + reqField.request_id
		const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20)
		logger.debug("BLPOP key: " + resKey + ", field: " + JSON.stringify(data))
		if (!data) {
			if (isSet) {
				// SET要求ならば
				// データ制御失敗
				throw _.createError("Failed to set", 3002, 500)
			} else {
				// データ取得失敗
				throw _.createError("Failed to get", 3002, 500)
			}
		}
		// API応答用にデータを変換
		const result: any = {}
		result.aircon_property_list = data.aircon_property_scope_list
		if (!result || data.status != "0") {
			if (isSet) {
				// SET要求ならば
				// データ制御失敗
				throw _.createError("Failed to set", 3002, 500)
			} else {
				// データ取得失敗
				throw _.createError("Invalid airconditioner property", 3004, 500)
			}
		}
		return result
	} catch (err) {
		// エラー応答
		if (err instanceof ApiError) {
			throw err
		} else {
			throw _.createError(`${err}`, 3001, 500)
		}
	}
}

/**
 * エアコン用のスキーマを作る関数
 * @param {any} decvicesControlCommandList コマンドリスト
 * @returns コマンドをキー・スキーマをバリューとした辞書
 */
const createAirconSchema = (decvicesControlCommandList: any) => {
	const schemaAirconDic: { [command: string]: any } = {}
	for (const commandList of decvicesControlCommandList.controlCommandList) {
		// スキーマを初期化
		let commandSchema = z.object({})
		// Redisを参照してコマンドに対して必要なプロパティスキーマを作る
		for (const commandArgList of commandList.control_command_argument_list) {
			switch (commandArgList.property) {
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

/**
 * エアコンプロパティ値域チェック
 * @param {any[]} airconPropertyList エアコンプロパティ値域テーブル
 * @param {string} command コマンド
 * @param {{[param: string]: any}} param プロパティ
 * @param {string} devType 詳細機器種別
 * @returns {boolean} エアコンプロパティ値域チェック結果
 */
const checkAirconPropRange = (
	airconPropertyList: any[],
	command: string,
	param: { [param: string]: any },
	devType: string
): boolean => {
	// エアコンプロパティ値域チェック結果
	let checkRangeResult = true
	const operationMode = command.substring(0, command.indexOf("_"))
	if (operationMode === "OFF") {
		return checkRangeResult
	}

	for (const airconProperty of airconPropertyList) {
		if (_.checkAirconDevType(airconProperty.detailed_device_type, devType)) {
			// コマンドから、対応する運転モードを取得
			const operationMode: any = command.substring(0, command.indexOf("_"))
			const targetProrerty = airconProperty.modes.filter((i: any) => {
				return i.operation_mode === controlDefs.airconOperationModeEnum[operationMode]
			})

			// 温度が値域外であれば要求情報から除外する
			if (param.target_temperature !== undefined) {
				const temperature = Number(param.target_temperature)
				const temperatureMin = targetProrerty[0].temperature_min
				const temperatureMax = targetProrerty[0].temperature_max
				if (temperature < temperatureMin || temperature > temperatureMax) {
					checkRangeResult = false
				}
			}
			// 風量が値域外であれば要求情報から除外する
			if (param.air_flow_level !== undefined) {
				const airFlowLevel = Number(param.air_flow_level)
				const airFlowLevelMin = airconProperty.air_flow_level?.air_flow_level_min
				const airFlowLevelMax = airconProperty.air_flow_level?.air_flow_level_max
				if (airFlowLevel < airFlowLevelMin || airFlowLevel > airFlowLevelMax) {
					checkRangeResult = false
				}
			}
			// 風量が値域外であれば要求情報から除外する
			if (param.air_flow_level_p !== undefined) {
				const airFlowLevel = Number(param.air_flow_level_p)
				const airFlowLevelMin = airconProperty.air_flow_level?.air_flow_level_min
				const airFlowLevelMax = airconProperty.air_flow_level?.air_flow_level_max
				if (airFlowLevel < airFlowLevelMin || airFlowLevel > airFlowLevelMax) {
					checkRangeResult = false
				}
			}
			// 風向が値域外であれば要求情報から除外する
			if (param.flow_direction_v !== undefined) {
				const flowDirectionV = Number(param.flow_direction_v)
				const flowDirectionVMin = airconProperty.flow_direction_V?.flow_direction_V_min
				const flowDirectionVMax = airconProperty.flow_direction_V?.flow_direction_V_max
				if (flowDirectionV < flowDirectionVMin || flowDirectionV > flowDirectionVMax) {
					checkRangeResult = false
				}
			}
		}
	}
	return checkRangeResult
}
