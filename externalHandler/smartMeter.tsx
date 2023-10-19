/****************************************************
 * スマートメーター ハンドラ
 * @module smartmeter
 *****************************************************/
import { RequestHandler } from "express"
import logger from "@/libs/logger"
import * as _ from "@/libs/util"
import * as ioRedis from "@/libs/redis"
import * as def from "@/definitions/def"
import * as z from "zod"
import ApiError from "@/types/ApiError"

// 詳細機器種別をキー、機器に対応するスキーマをバリューとした辞書
const schemaDic: { [devName: string]: any } = {}

/**
 * スマートメーター新規登録
 * @method /smartmeter/actions/startRegistration
 **/
export const postRegistration: RequestHandler = async (req, res, next) => {
	const redis = ioRedis.getRedisInstance()
	const funcName = "postRegistration"
	try {
		// 要求生成
		const reqField = {
			request_type: "startSMRegister",
			source_module: def.SOURCE_MODULE,
			request_id: _.createReqNumber(),
			auth_id: req.body.auth_id,
			password: req.body.password,
			device_name: req.body.device_name,
			set_type: req.body.set_type,
		}

		// 対象詳細機器種別のスキーマがなければスキーマを取得しにいく
		if (!schemaDic[funcName]) {
			// スキーマを作成
			const extendSchema = createSmartmeterRegistScheme()
			// メモリ上に保存（2回目以降はメモリを参照）
			schemaDic[funcName] = extendSchema
		}

		let propertyList: any = {}
		// スキーマで指定した型・条件でparse、条件を満たさなければエラー
		try {
			propertyList = schemaDic[funcName].parse(req.body)
		} catch {
			return next(_.createError("Invalid properties", 3003, 400))
		}

		// 要求をPUSH
		await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
		logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))

		// 応答情報生成
		const resKey = def.RES_KEY + reqField.request_id
		// 応答をPOP
		let data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
		logger.debug("BLPOP(1) key: " + resKey + ", field: " + JSON.stringify(data))
		// 1次応答エラー
		if (!data || data.status != 0) {
			return next(_.createError("Failed to set", 3002, 500))
		}
		// 応答をPOP
		data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
		logger.debug("BLPOP(2) key: " + resKey + ", field: " + JSON.stringify(data))
		// 2次応答エラー
		if (!data || data.status != 0) {
			return next(_.createError("Failed to set", 3002, 500))
		}

		// API応答用オブジェクトの作成
		const resultObj = {
			auth_id: req.body.auth_id,
			device_name: req.body.device_name,
			set_type: req.body.set_type,
		}
		_.wrapResJson(req, res, resultObj, 202)
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
 * スマートメーター再登録
 * @method /smartmeter/actions/startReregistration
 **/
export const postReregistration: RequestHandler = async (req, res, next) => {
	const redis = ioRedis.getRedisInstance()
	const funcName = "postReregistration"
	const deviceIdStr: string | undefined = req.get("X-Panasonic-Device-ID")
	res.set("X-Panasonic-Device-ID", deviceIdStr)
	const deviceId = deviceIdStr !== undefined ? parseInt(deviceIdStr, 10) : undefined

	try {
		// 要求生成
		const reqField = {
			request_type: "startSMReRegister",
			source_module: def.SOURCE_MODULE,
			request_id: _.createReqNumber(),
			device_identifier: deviceId,
			device_name: req.body.device_name,
			set_type: req.body.set_type,
		}
		// ヘッダーの機器識別IDが不正
		if (!deviceId) {
			return next(_.createError("Invalid deviceID", 3002, 400))
		}
		// 対象詳細機器種別のスキーマがなければスキーマを取得しにいく
		if (!schemaDic[funcName]) {
			// スキーマを作成
			const extendSchema = createSmartmeterReregistScheme()
			// メモリ上に保存（2回目以降はメモリを参照）
			schemaDic[funcName] = extendSchema
		}
		let propertyList: any = {}
		// スキーマで指定した型・条件でparse、条件を満たさなければエラー
		try {
			propertyList = schemaDic[funcName].parse(req.body)
		} catch {
			return next(_.createError("Invalid properties", 3004, 400))
		}

		// 要求をPUSH
		await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
		logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))

		// 応答情報生成
		const resKey = def.RES_KEY + reqField.request_id
		// 応答をPOP
		let data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
		logger.debug("BLPOP(1) key: " + resKey + ", field: " + JSON.stringify(data))
		// 1次応答エラー
		if (!data || data.status != 0) {
			return next(_.createError("Failed to set", 3003, 500))
		}
		// 応答をPOP
		data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
		logger.debug("BLPOP(2) key: " + resKey + ", field: " + JSON.stringify(data))
		// 2次応答エラー
		if (!data || data.status != 0) {
			return next(_.createError("Failed to set", 3003, 500))
		}

		// API応答用オブジェクトの作成
		const resultObj = {
			device_name: req.body.device_name,
			set_type: req.body.set_type,
		}
		_.wrapResJson(req, res, resultObj, 202)
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
 * スマートメーター再接続
 * @method /smartmeter/actions/reconnection
 **/
export const postReconnection: RequestHandler = async (req, res, next) => {
	const redis = ioRedis.getRedisInstance()
	const deviceIdStr: string | undefined = req.get("X-Panasonic-Device-ID")
	res.set("X-Panasonic-Device-ID", deviceIdStr)
	const deviceId = deviceIdStr !== undefined ? parseInt(deviceIdStr, 10) : undefined
	let retFlg = true
	try {
		// 要求生成
		const reqField = {
			request_type: "startSMReConnect",
			source_module: def.SOURCE_MODULE,
			request_id: _.createReqNumber(),
			device_identifier: deviceId,
		}
		// ヘッダーの機器識別IDが不正
		if (!deviceId) {
			return next(_.createError("Invalid deviceID", 3002, 400))
		}
		// 要求をPUSH
		await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
		logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))

		// 応答情報生成
		const resKey = def.RES_KEY + reqField.request_id
		// 応答をPOP
		let data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
		logger.debug("BLPOP(1) key: " + resKey + ", field: " + JSON.stringify(data))
		// 1次応答エラー
		if (!data || data.status != 0) {
			return next(_.createError("Failed to set", 3003, 500))
		}
		// 応答をPOP
		data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10)
		logger.debug("BLPOP(2) key: " + resKey + ", field: " + JSON.stringify(data))
		// 2次応答エラー
		if (!data) {
			return next(_.createError("Failed to set", 3003, 500))
		}
		// 2次応答が返ってきたけどstatus!=0ならfalse
		if (data.status != 0) {
			retFlg = false
		}

		// API応答用オブジェクトの作成
		const resultObj = {
			result: retFlg,
		}
		_.wrapResJson(req, res, resultObj, 202)
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
 * スマートメーター設定情報取得
 * @method /smartmeter/settings
 **/
export const getSettings: RequestHandler = async (req, res, next) => {
	try {
		const redis = ioRedis.getRedisInstance()

		// 要求生成
		const reqField = {
			request_type: "getSMSetting",
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
			return next(_.createError("Failed to set", 3002, 500))
		}
		// 応答にはstatusをふくめない
		delete data.status
		// 正常応答
		_.wrapResJson(req, res, data)
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
 * スマートメーター設定情報変更
 * @method /smartmeter/settings
 **/
export const putSettings: RequestHandler = async (req, res, next) => {
	try {
		const redis = ioRedis.getRedisInstance()
		const funcName = "putSettings"

		// 要求生成
		const reqField = {
			request_type: "setSMSetting",
			source_module: def.SOURCE_MODULE,
			request_id: _.createReqNumber(),
			smart_meter_number_check_target: req.body.smart_meter_number_check_target,
			smart_meter_mode: req.body.smart_meter_mode,
			smart_meter_collect_setting_2min: req.body.smart_meter_collect_setting_2min,
			smart_meter_collect_setting_measured: req.body.smart_meter_collect_setting_measured,
		}
		// 対象詳細機器種別のスキーマがなければスキーマを取得しにいく
		if (!schemaDic[funcName]) {
			// スキーマを作成
			const extendSchema = createSmartmeterPutSettingsScheme()
			// メモリ上に保存（2回目以降はメモリを参照）
			schemaDic[funcName] = extendSchema
		}
		let propertyList: any = {}
		// スキーマで指定した型・条件でparse、条件を満たさなければエラー
		try {
			propertyList = schemaDic[funcName].parse(req.body)
		} catch {
			return next(_.createError("Invalid properties", 3003, 400))
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
			return next(_.createError("Failed to get", 3002, 500))
		}

		// API応答用オブジェクトの作成
		const resultObj = {
			smart_meter_number_check_target: req.body.smart_meter_number_check_target,
			smart_meter_mode: req.body.smart_meter_mode,
			smart_meter_collect_setting_2min: req.body.smart_meter_collect_setting_2min,
			smart_meter_collect_setting_measured: req.body.smart_meter_collect_setting_measured,
		}
		_.wrapResJson(req, res, resultObj, 202)
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
 * スマートメーター登録情報取得
 * @method /smartmeter/registration
 **/
export const getRegistration: RequestHandler = async (req, res, next) => {
	try {
		const redis = ioRedis.getRedisInstance()

		// 要求生成
		const reqField = {
			request_type: "getSMAuth",
			source_module: def.SOURCE_MODULE,
			request_id: _.createReqNumber(),
		}
		// 要求生成
		const reqNameField = {
			request_type: "getDevInfo",
			source_module: def.SOURCE_MODULE,
			request_id: _.createReqNumber(),
		}

		// 要求をPUSH
		await redis.rpush(def.REQ_KEY, JSON.stringify(reqField))
		logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField))
		// 応答をPOP
		const resKey = def.RES_KEY + reqField.request_id
		const dataList = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20)
		logger.debug("BLPOP key: " + resKey + ", field: " + JSON.stringify(dataList))
		if (!dataList || dataList.status != 0) {
			// データ取得失敗
			throw _.createError("Failed to get", 3002, 500)
		}
		// 機器名称を取得
		// 要求をPUSH
		await redis.rpush(def.REQ_KEY, JSON.stringify(reqNameField))
		logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqNameField))
		// 応答をPOP
		const resNameKey = def.RES_KEY + reqNameField.request_id
		const dataName = await ioRedis.blpopWithTimeout(resNameKey, def.TIMEOUT_20)
		logger.debug("BLPOP key: " + resNameKey + ", field: " + JSON.stringify(dataName))
		if (!dataName || dataName.status != 0) {
			// データ取得失敗
			return next(_.createError("Failed to get", 3002, 500))
		}
		// 取得した機器一覧から該当する名前を取得
		for (let i = 0; i < dataList.smart_meter_auth_list.length; i++) {
			for (let l = 0; l < dataName.device_info_list.length; l++) {
				if (dataList.smart_meter_auth_list[i].device_identifier == dataName.device_info_list[l].device_identifier) {
					dataList.smart_meter_auth_list[i].device_name = dataName.device_info_list[l].device_name
				}
			}
		}

		// 応答にはstatusを含めない
		delete dataList.status
		// 正常応答
		_.wrapResJson(req, res, dataList)
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
 * スマートメーター登録情報変更
 * @method /smartmeter/registration
 **/
export const putRegistration: RequestHandler = async (req, res, next) => {
	try {
		const redis = ioRedis.getRedisInstance()
		const funcName = "putRegistration"
		const deviceIdStr: string | undefined = req.get("X-Panasonic-Device-ID")
		res.set("X-Panasonic-Device-ID", deviceIdStr)
		const deviceId = deviceIdStr !== undefined ? parseInt(deviceIdStr, 10) : undefined

		// 要求生成
		const reqField = {
			request_type: "setSMName",
			source_module: def.SOURCE_MODULE,
			request_id: _.createReqNumber(),
			device_identifier: deviceId,
			set_type: req.body.set_type,
			device_name: req.body.device_name,
		}
		// ヘッダーの機器識別IDが不正
		if (!deviceId) {
			return next(_.createError("Invalid deviceID", 3002, 400))
		}
		// 対象詳細機器種別のスキーマがなければスキーマを取得しにいく
		if (!schemaDic[funcName]) {
			// スキーマを作成
			const extendSchema = createSmartmeterPutRegistrationScheme()
			// メモリ上に保存（2回目以降はメモリを参照）
			schemaDic[funcName] = extendSchema
		}
		let propertyList: any = {}
		// スキーマで指定した型・条件でparse、条件を満たさなければエラー
		try {
			propertyList = schemaDic[funcName].parse(req.body)
		} catch {
			return next(_.createError("Invalid properties", 3004, 400))
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
			return next(_.createError("Failed to set", 3003, 500))
		}

		// API応答用オブジェクトの作成
		const resultObj = {
			set_type: req.body.set_type,
			device_name: req.body.device_name,
		}
		_.wrapResJson(req, res, resultObj, 202)
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
 * 新規登録のスキーマを作る関数
 * @returns コマンドをキー・スキーマをバリューとした辞書
 */
const createSmartmeterRegistScheme = () => {
	// zodによるバリデーションチェック
	const reqForm = z
		.object({
			auth_id: z.string().nonempty(),
			password: z.string().nonempty(),
			device_name: z.string().nonempty(),
			set_type: z.number(),
		})
		.strict()
	return reqForm
}

/**
 * 再登録のスキーマを作る関数
 * @returns コマンドをキー・スキーマをバリューとした辞書
 */
const createSmartmeterReregistScheme = () => {
	// zodによるバリデーションチェック
	const reqForm = z
		.object({
			device_name: z.string().nonempty(),
			set_type: z.number(),
		})
		.strict()
	return reqForm
}

/**
 * スマートメーター設定情報変更のスキーマを作る関数
 * @returns コマンドをキー・スキーマをバリューとした辞書
 */
const createSmartmeterPutSettingsScheme = () => {
	// zodによるバリデーションチェック
	const reqForm = z
		.object({
			smart_meter_number_check_target: z.number(),
			smart_meter_mode: z.number(),
			smart_meter_collect_setting_2min: z.number(),
			smart_meter_collect_setting_measured: z.number(),
		})
		.strict()
	return reqForm
}

/**
 * スマートメーター登録情報変更のスキーマを作る関数
 * @returns コマンドをキー・スキーマをバリューとした辞書
 */
const createSmartmeterPutRegistrationScheme = () => {
	// zodによるバリデーションチェック
	const reqForm = z
		.object({
			set_type: z.number(),
			device_name: z.string().nonempty(),
		})
		.strict()
	return reqForm
}
