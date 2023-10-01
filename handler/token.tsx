/****************************************************

WebScketトークン取得 ハンドラ
@module wsToken
*****************************************************/
import fs from "fs/promises"
import { Request, Response, NextFunction, RequestHandler } from "express"
import { createError, wrapResJson } from "@/libs/util"
import * as def from "@/definitions/def"
/**

コンテンツ用WebScketのトークン情報取得
@method readContentsWsTokenFile
@returns {object} WebSocketのトークン情報
**/
const readContentsWsTokenFile = async () => {
try {
const hashData = await fs.readFile(def.CONTENTS_WS_TOKEN_HASH_FILE, "utf-8")
return { err: null, hashData }
} catch (err) {
return { err: createError("contents ws token file read error", 3001), hashData: "" }
}
}
/**

コンテンツ用WebSocketトークン取得(GET)
@method /token/wsToken
**/
export const getContentsWsToken: RequestHandler = async (req: Request, res: Response, next: NextFunction) => {
const { err, hashData } = await readContentsWsTokenFile()
if (err) {
return next(err)
} else {
return wrapResJson(req, res, { wsToken: hashData })
}
}