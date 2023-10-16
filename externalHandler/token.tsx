/****************************************************

トークン情報取得 ハンドラ
@module token
*****************************************************/
import { RequestHandler } from "express"
import tokenInfo from "@/libs/tokenInfo"
import * as _ from "@/libs/util"
/**

WebSocket通信用のトークン取得
@method /websocket/token
**/
export const getToken: RequestHandler = async (req, res, next) => {
const token = tokenInfo.getToken()
const ret = token ? { token: token } : {}
_.wrapResJson(req, res, ret)
}
