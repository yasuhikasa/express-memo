/****************************************************

機器登録 ルーティング
@module registries
*****************************************************/
import { Router } from "express"
import { isStub } from "@/libs/util"
import * as registries from "@/routers/external/externalHandlers/registries"
import * as stub from "@/stub/stubHandlers/registriesStubHandler"
const router = Router()
/**

一括機器登録開始(POST)
@method /registries/actions/startRegistration
**/
router.post(
"/registries/actions/startRegistration",
isStub ? stub.postStartRegistration : registries.postStartRegistration
)
/**

一括機器登録停止(POST)
@method /registries/actions/stopRegistration
**/
router.post(
"/registries/actions/stopRegistration",
isStub ? stub.postStopRegistration : registries.postStopRegistration
)
export default router