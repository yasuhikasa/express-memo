/****************************************************

トークン情報取得 ルーティング
@module token
*****************************************************/
import { Router } from "express"
import * as token from "@/routers/external/externalHandlers/token"
const router = Router()
/**

WebSocket通信用のトークン取得
@method /websocket/token
**/
router.get("/websocket/token", token.getToken)
export default router

