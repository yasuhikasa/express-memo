/****************************************************
機器登録 ハンドラ
@module registries
*****************************************************/
import { RequestHandler } from "express";
import ApiError from "@/types/ApiError";
import logger from "@/libs/logger";
import * as _ from "@/libs/util";
import * as ioRedis from "@/libs/redis";
import * as def from "@/definitions/def";

/**
 * 一括機器登録開始(POST)
 * @method /registries/actions/startRegistration
 **/
export const postStartRegistration: RequestHandler = async (req, res, next) => {
	try {
		const redis = ioRedis.getRedisInstance();
		// 要求生成
		const reqField = {
			reqType: "registerBulk",
			srcModule: def.SOURCE_MODULE,
			reqId: _.createReqNumber(),
			param: {
				command: "start",
			},
		};
		// 要求をPUSH
		await redis.rpush(def.REQ_KEY, JSON.stringify(reqField));
		logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField));
		// 応答をPOP
		const resKey = def.RES_KEY + reqField.reqId;
		const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_10);
		if (!data) {
			// データがNULL
			throw _.createError("Failed to start registration", 3002, 500);
		}
		logger.debug("BLPOP key: " + resKey + ", field: " + JSON.stringify(data));
		const dataObj = JSON.parse(JSON.stringify(data));
		// API応答を生成
		if ("status" in dataObj) {
			_.wrapResJson(req, res, { result: dataObj.status });
		} else {
			// statusプロパティが存在しない場合エラーとする
			throw _.createError("Failed to start registration", 3002, 500);
		}
	} catch (err) {
		if (err instanceof ApiError) {
			next(err);
		} else {
			next(_.createError(`${err}`, 3001, 500));
		}
	}
};

/**
 * 一括機器登録停止(POST)
 * @method /registries/actions/stopRegistration
 **/
export const postStopRegistration: RequestHandler = async (req, res, next) => {
	try {
		const redis = ioRedis.getRedisInstance();
		// 要求生成
		const reqField = {
			reqType: "registerBulk",
			srcModule: def.SOURCE_MODULE,
			reqId: _.createReqNumber(),
			param: {
				command: "stop",
			},
		};
		// 要求をPUSH
		await redis.rpush(def.REQ_KEY, JSON.stringify(reqField));
		logger.debug("RPUSH key: " + def.REQ_KEY + ", field: " + JSON.stringify(reqField));
		// 応答をPOP
		const resKey = def.RES_KEY + reqField.reqId;
		const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20);
		if (!data) {
			// データがNULL
			throw _.createError("Failed to stop registration", 3002, 500);
		}
		logger.debug("BLPOP key: " + resKey + ", field: " + JSON.stringify(data));
		const dataObj = JSON.parse(JSON.stringify(data));
		// API応答を生成
		if ("status" in dataObj) {
			_.wrapResJson(req, res, { result: dataObj.status });
		} else {
			// statusプロパティが存在しない場合エラーとする
			throw _.createError("Failed to stop registration", 3002, 500);
		}
	} catch (err) {
		if (err instanceof ApiError) {
			next(err);
		} else {
			next(_.createError(`${err}`, 3001, 500));
		}
	}
};
