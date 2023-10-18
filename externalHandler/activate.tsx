/****************************************************
 * WebAPI 有効化 ハンドラ
 * @module activate
 *****************************************************/
import { Request, Response, NextFunction, RequestHandler } from "express"
import * as _ from "@/libs/util"
import { wrapResJson } from "@/libs/util"
import activationInfo from "@/libs/activationInfo"
import logger from "@/libs/logger"

/**
 * アクティベート情報取得(GET)
 * @method /activate
 **/
export const getActivate: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	const ret = {
		activation: activationInfo.status,
		organizationalUnitName: activationInfo.organizationalUnitName,
	}
	res.json(_.removeEmpty(ret))
}

/**
 * アクティベート情報変更(PUT)
 * @method /activate
 **/
export const putActivate: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
	logger.info("putActivate start")
	const booleanList: { [key: string]: boolean } = {
		true: true,
		false: false,
	}

	const activation = booleanList[req.body.activation]
	if (_.isEmpty(activation)) {
		logger.error("Invalid activation")
		wrapResJson(req, res, { result: { err: _.createError("Invalid activation", 3001, 400) } })
		return
	}

	const { err } = activationInfo.change(req, activation)
	if (err) {
		wrapResJson(req, res, { result: err })
	} else {
		res.json(
			_.removeEmpty({
				activation: activationInfo.status,
				organizationalUnitName: activationInfo.organizationalUnitName,
			})
		)
	}
}
