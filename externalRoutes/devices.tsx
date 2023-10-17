/****************************************************

機器制御 ルーティング
@module devices
*****************************************************/
import { Router } from "express"
import { isStub } from "@/libs/util"
import * as devices from "@/routers/commonHandlers/devices"
import * as stub from "@/stub/stubHandlers/devicesStubHandler"
const router = Router()
/**

登録機器一覧取得(GET)
@method /devices
**/
router.get("/devices", isStub ? devices.getDevices : devices.getDevices)
/**

機器制御コマンド取得(GET)
@method /devices/getCommand/:detailed_device_type
**/
router.get("/devices/getCommand/:detailed_device_type", isStub ? stub.getDevicesCommand : devices.getDevicesCommand)
/**

エアコンプロパティ定義取得(GET)
@method /devices/airConditioner/properties/def
**/
router.get(
	"/devices/airConditioner/properties/def",
	isStub ? stub.getAirConditionerProperties : devices.getAirConditionerProperties
)
/**

個別機器状態取得(GET)
@method /devices/:detailed_device_type/properties/_any
**/
router.get(
	"/devices/:detailed_device_type/properties/_any",
	isStub ? stub.getDevicesProperties : devices.getDevicesProperties
)
/**

個別機器プロパティ状態取得(GET)
@method /devices/:type/properties/:propertyName
**/
router.get(
	"/devices/:type/properties/:propertyName",
	isStub ? devices.getDevicesPropertyName : devices.getDevicesPropertyName
)
/**

個別機器制御要求(PUT)
@method /devices/:detailed_device_type/properties/_any
**/
router.put(
	"/devices/:detailed_device_type/properties/_any",
	isStub ? stub.putDevicesProperties : devices.putDevicesProperties
)
export default router