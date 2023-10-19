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
}