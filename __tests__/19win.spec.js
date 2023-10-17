// 19年冬変更点
const frisby = require('frisby');
const common = require(`${__dirname}/../common.js`);
const Joi = frisby.Joi;

// クライアント証明書設定
frisby.globalSetup(common.getGlobalSetupSettings());

describe('無線機器ファーム更新情報取得 [GET: /settings/firmware/wireless/update]', () => {
	const url = `/settings/firmware/wireless/update`;

	{
		it(`正常系 無線AP更新あり、予約あり`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "10" }] },  // type="10":無線AP更新あり 25:コスモ 35:照明直下 36:照明配下
					getReserveFirmUpdate: { state: "1", time: "20181203", target: "0", split: "0" } // state=1:予約あり, target=0:無線AP 1:新計測UT 2:照明直下 3:照明配下
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": true,
					"ecolinkSmartCosmo": false,
					"linkPlusLighting": false
				})
				.expect('json', 'schedule', {
					"reserved": true,
					"type": "adapter",
					"date": "2018-12-02T15:00:00.000Z"
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 無線AP更新あり、予約なし`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "10" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": true,
					"ecolinkSmartCosmo": false,
					"linkPlusLighting": false
				})
				.expect('json', 'schedule', {
					"reserved": false,
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 無線更新なし`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "1" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": false,
					"ecolinkSmartCosmo": false,
					"linkPlusLighting": false
				})
				.expect('json', 'schedule', {
					"reserved": false,
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 コスモ更新あり、予約あり`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "25" }] },
					getReserveFirmUpdate: { state: "1", time: "20181203", target: "1", split: "0" }
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": false,
					"ecolinkSmartCosmo": true,
					"linkPlusLighting": false
				})
				.expect('json', 'schedule', {
					"reserved": true,
					"type": "ecolinkSmartCosmo",
					"date": "2018-12-02T15:00:00.000Z"
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 コスモ更新あり、予約なし`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "25" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": false,
					"ecolinkSmartCosmo": true,
					"linkPlusLighting": false
				})
				.expect('json', 'schedule', {
					"reserved": false,
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 コスモ・リンクプラス照明未登録時はプロパティがないことの確認`, () => {
			return frisby
				.setup(common.useStub({
					getRegDevList: { num: "0", list: [] },
					getInfoMessage: { message: [{ type: "1" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.get(url)
				.expect('jsonTypes', 'update', {
					adapter: Joi.valid(false).required(),
					ecolinkSmartCosmo: Joi.forbidden(),
					linkPlusLighting: Joi.forbidden(),
				})
				.expect('json', 'schedule', {
					"reserved": false,
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 リンクプラス照明直下と配下両方登録時、直下更新あり(両方未更新)、予約あり`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "35" }] },
					getReserveFirmUpdate: { state: "1", time: "20181203", target: "2", split: "1" }
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": false,
					"ecolinkSmartCosmo": false,
					"linkPlusLighting": true
				})
				.expect('json', 'schedule', {
					"reserved": true,
					"type": "linkPlusLighting",
					"date": "2018-12-02T15:00:00.000Z"
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 リンクプラス照明直下と配下両方登録時、直下更新あり(両方未更新)、予約なし`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "35" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": false,
					"ecolinkSmartCosmo": false,
					"linkPlusLighting": true
				})
				.expect('json', 'schedule', {
					"reserved": false,
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 リンクプラス照明直下と配下両方登録時、配下更新あり(直下更新済)、予約あり`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "36" }] },
					getReserveFirmUpdate: { state: "1", time: "20181203", target: "3", split: "0" }
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": false,
					"ecolinkSmartCosmo": false,
					"linkPlusLighting": true
				})
				.expect('json', 'schedule', {
					"reserved": true,
					"type": "linkPlusLighting",
					"date": "2018-12-02T15:00:00.000Z"
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 リンクプラス照明直下と配下両方登録時、配下更新あり(直下更新済)、予約なし`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "36" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": false,
					"ecolinkSmartCosmo": false,
					"linkPlusLighting": true
				})
				.expect('json', 'schedule', {
					"reserved": false,
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 リンクプラス照明直下のみ登録時、直下更新あり、予約あり`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "35" }] },
					getReserveFirmUpdate: { state: "1", time: "20181203", target: "2", split: "0" }
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": false,
					"ecolinkSmartCosmo": false,
					"linkPlusLighting": true
				})
				.expect('json', 'schedule', {
					"reserved": true,
					"type": "linkPlusLighting",
					"date": "2018-12-02T15:00:00.000Z"
				})
				.expect('status', 200);
		});
	}
	{
		it(`正常系 リンクプラス照明直下のみ登録時、直下更新あり、予約なし`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "35" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.get(url)
				.expect('json', 'update', {
					"adapter": false,
					"ecolinkSmartCosmo": false,
					"linkPlusLighting": true
				})
				.expect('json', 'schedule', {
					"reserved": false,
				})
				.expect('status', 200);
		});
	}

});

describe('無線機器ファーム更新予約実行 [POST: /settings/firmware/wireless/update]', () => {
	const url = `/settings/firmware/wireless/update`;

	{
		const reqData = { target: "adapter" };
		it(`正常系 無線AP更新実行 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "10" }] },  // type="10":無線AP更新あり 25:コスモ 35:照明直下 36:照明配下
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" } // state=1:予約あり, target=0:無線AP 1:新計測UT 2:照明直下 3:照明配下
				}))
				.post(url, reqData)
				.expect('json', reqData)
				.expect('status', 200);
		});
	}
	{
		const reqData = { target: "ecolinkSmartCosmo" };
		it(`正常系 コスモ更新実行 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "25" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.post(url, reqData)
				.expect('json', reqData)
				.expect('status', 200);
		});
	}
	{
		const reqData = { target: "linkPlusLighting" };
		it(`正常系 リンクプラス照明(直下)更新実行 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "35" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.post(url, reqData)
				.expect('json', reqData)
				.expect('status', 200);
		});
	}
	{
		const reqData = { target: "linkPlusLighting" };
		it(`正常系 リンクプラス照明(配下)更新実行 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "36" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.post(url, reqData)
				.expect('json', reqData)
				.expect('status', 200);
		});
	}
	{
		const reqData = { target: "sdfadfe" };
		it(`異常系 更新予約対象の種別指定が不適切 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.post(url, reqData)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', "Invalid target")
				.expect('status', 400);
		});
	}
	{
		const reqData = { target: "adapter" };
		it(`異常系 更新予約が既に存在している In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "10" }] },
					getReserveFirmUpdate: { state: "1", time: "20181203", target: "0", split: "0" }
				}))
				.post(url, reqData)
				.expect('json', 'errNo', 3004)
				.expect('json', 'message', "Update schedule already exists")
				.expect('status', 500);
		});
	}
	{
		const reqData = { target: "ecolinkSmartCosmo" };
		it(`異常系 種別指定した対象機器が登録されていない In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({
					getRegDevList: { num: "0", list: [] },
					getInfoMessage: { message: [{ type: "10" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.post(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "Target device is not registered")
				.expect('status', 400);
		});
	}
	{
		const reqData = { target: "adapter" };
		it(`異常系 種別指定した更新予約対象機器はバージョンアップ不要 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "1" }] },
					getReserveFirmUpdate: { state: "0", time: "20181203", target: "0", split: "0"  }
				}))
				.post(url, reqData)
				.expect('json', 'errNo', 3003)
				.expect('json', 'message', "No need for update")
				.expect('status', 500);
		});
	}
	{
		const reqData = { target: "adapter" };
		it(`異常系 内部エラー(3005エラー) In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({
					reqInfoFirmUpdate: { result: "1" },
					getInfoMessage: { message: [{ type: "10" }] },
					getReserveFirmUpdate: { state: "0", time: null, target: "0", split: "0" }
				}))
				.post(url, reqData)
				.expect('json', 'errNo', 3005)
				.expect('json', 'message', "Can't set update schedule")
				.expect('status', 500);
		});
	}

});

describe('無線機器ファーム更新予約削除 [DELETE: /settings/firmware/wireless/update]', () => {
	const url = `/settings/firmware/wireless/update`;

	{
		it(`正常系 予約あり`, () => {
			return frisby
				.setup(common.useStub({
					getReserveFirmUpdate: { state: "1", time: "20181203", target: "0" } // state=1:予約あり, target=1:新計測UT 0:無線AP
				}))
				.del(url)
				.expect('status', 204);
		});
	}
	{
		it(`異常系 予約なし`, () => {
			return frisby
				.setup(common.useStub({
					getReserveFirmUpdate: { state: "0", time: "20181203", target: "0" } // state=1:予約あり, target=1:新計測UT 0:無線AP
				}))
				.del(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', "No update reservation")
				.expect('status', 500);
		});
	}
	{
		it(`異常系 削除失敗 内部エラー(3002エラー)`, () => {
			return frisby
				.setup(common.useStub({
					reqDeleteReserveFirmUpdate: { result: "1" },
					getReserveFirmUpdate: { state: "1", time: "20181203", target: "0" } // state=1:予約あり, target=1:新計測UT 0:無線AP
				}))
				.del(url)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "Can't delete reservation")
				.expect('status', 500);
		});
	}

});

describe('LAN通信型スマートコスモファーム更新確認要求 [POST: /settings/firmware/lan/cosmo/actions/checkUpdate]', () => {
	const url = `/settings/firmware/lan/cosmo/actions/checkUpdate`;
	const getRegDevList = {
		num: "1",
		list: [{ devType: "0x29" }]
	};

	{
		it(`正常系 更新あり`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "9" }] },  // type="9":コスモ更新あり
					getRegDevList
				}))
				.post(url)
				.expect('json', { "update": true })
				.expect('status', 200);
		});
	}
	{
		it(`正常系 更新なし`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "1" }] },  // type="9":コスモ更新あり
					getRegDevList
				}))
				.post(url)
				.expect('json', { "update": false })
				.expect('status', 200);
		});
	}
	{
		it(`異常系 LANコスモ登録なし`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "9" }] },  // type="9":コスモ更新あり
					getRegDevList: { num: "1", list: [{ devType: "0x0a" }] }
				}))
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', "lanSmartCosmo is not registered")
				.expect('status', 500);
		});
	}

});

describe('LAN通信型スマートコスモファーム更新実行要求 [POST: /settings/firmware/lan/cosmo/actions/requestUpdate]', () => {
	const url = `/settings/firmware/lan/cosmo/actions/requestUpdate`;
	const getRegDevList = {
		num: "1",
		list: [{ devType: "0x29" }]
	};

	{
		it(`正常系 更新実行成功`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "9" }] },  // type="9":コスモ更新あり
					getRegDevList,
					reqInfoFirmUpdate: { result: "0" }  // 0:成功, 1:失敗
				}))
				.post(url)
				.expect('json', { "result": "success" })
				.expect('status', 200);
		});
	}
	{
		it(`正常系 更新実行失敗`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "9" }] },  // type="9":コスモ更新あり
					getRegDevList,
					reqInfoFirmUpdate: { result: "1" }  // 0:成功, 1:失敗
				}))
				.post(url)
				.expect('json', { "result": "failure" })
				.expect('status', 200);
		});
	}
	{
		it(`異常系 LANコスモ登録なし`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "9" }] },  // type="9":コスモ更新あり
					getRegDevList: { num: "1", list: [{ devType: "0x0a" }] }
				}))
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', "lanSmartCosmo is not registered")
				.expect('status', 500);
		});
	}
	{
		it(`異常系 更新不要`, () => {
			return frisby
				.setup(common.useStub({
					getInfoMessage: { message: [{ type: "1" }] },  // type="9":コスモ更新あり
					getRegDevList
				}))
				.post(url)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "No need for update")
				.expect('status', 500);
		});
	}
});

describe('LAN通信型スマートコスモファーム更新進捗確認 [GET: /settings/firmware/lan/cosmo/update/progress]', () => {
	const url = `/settings/firmware/lan/cosmo/update/progress`;

	{
		it(`正常系 更新完了`, () => {
			return frisby
				.setup(common.useStub({
					getReqState_InfoFirmUpdateCosmo: { result: "0" },  // 0:完了, 1:実行中, 2:失敗
				}))
				.get(url)
				.expect('json', { "status": "completed" })
				.expect('status', 200);
		});
	}
	{
		it(`正常系 更新実行中`, () => {
			return frisby
				.setup(common.useStub({
					getReqState_InfoFirmUpdateCosmo: { result: "1" },  // 0:完了, 1:実行中, 2:失敗
				}))
				.get(url)
				.expect('json', { "status": "inProgress" })
				.expect('status', 200);
		});
	}
	{
		it(`正常系 更新失敗`, () => {
			return frisby
				.setup(common.useStub({
					getReqState_InfoFirmUpdateCosmo: { result: "2" },  // 0:完了, 1:実行中, 2:失敗
				}))
				.get(url)
				.expect('json', { "status": "failed" })
				.expect('status', 200);
		});
	}

});

describe('地域情報取得 [GET: /settings/area]', () => {
	const url = `/settings/area`;

	{
		it(`正常系 地域情報あり`, () => {
			return frisby
				.setup(common.useStub({
					getServerRegistration: { state: "1" },  // 0:登録なし, 1:登録あり
					getSettingArea: { code: "2710000", area: "Osaka"}
				}))
				.get(url)
				.expect('json', { "area": "Osaka" })
				.expect('status', 200);
		});
	}
	{
		it(`正常系 地域情報なし`, () => {
			return frisby
				.setup(common.useStub({
					getServerRegistration: { state: "1" },  // 0:登録なし, 1:登録あり
					getSettingArea: { code: "-", area: "-"}
				}))
				.get(url)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "No Area Setting")
				.expect('status', 500);
		});
	}
	{
		it(`異常系 サーバーサービス登録なし`, () => {
			return frisby
				.setup(common.useStub({
					getServerRegistration: { state: "0" },  // 0:登録なし, 1:登録あり
					getSettingArea: { code: "2710000", area: "Osaka"}
				}))
				.get(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', "No Server Registration")
				.expect('status', 400);
		});
	}

});


describe('機器種別情報変更 [PUT: /settings/devices/type]', () => {
	const url = `/settings/devices/type`;
	const electricLockObj = {
		"deviceId": "05fd010000000000000032",
		"type": "electricLock"
	};

	{
		const reqData = Object.assign({}, electricLockObj);
		it(`正常系 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.put(url, reqData)
				.expect('jsonTypes', {
					deviceId: Joi.string(),
					type: Joi.valid("electricLock"),
					deviceName: Joi.string(),
				})
				.expect('status', 200);
		});
	}
	{
		const reqData = { deviceId: "spdifuajwseo3rhsef", type: "electricLock" };
		it(`異常系 不適切なdeviceID(3001エラー) In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', "Invalid deviceID")
				.expect('status', 400);
		});
	}
	{
		const reqData = { deviceId: "03b9010000000000000025", type: "cookingHeater" };
		it(`異常系 リクエストのtype指定が不適切(3002エラー) In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "Invalid type")
				.expect('status', 400);
		});
	}
	{
		const reqData = { deviceId: "0133010000000000000019", type: "electricLock" };
		it(`異常系 指定された機器はクラス名の変更不可(3003エラー) In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'errNo', 3003)
				.expect('json', 'message', "The type of target device cannot be changed")
				.expect('status', 400);
		});
	}
	{
		const reqData = Object.assign({}, electricLockObj);
		it(`異常系 内部エラー(機器種別情報変更失敗)(3004エラー) In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({
					setDeviceTypeSetting: { result: "1" },
				}))
				.put(url, reqData)
				.expect('json', 'errNo', 3004)
				.expect('json', 'message', "Cannot set type")
				.expect('status', 500);
		});
	}
});

describe('トークン情報取得 [GET: /websocket/token]', () => {
	const url = `/websocket/token`;

	{
		it(`正常系`, () => {
			return frisby
				.get(url)
				.expect('jsonTypes', "token", Joi.string().length(10).required())
				.expect('status', 200);
		});
	}

});