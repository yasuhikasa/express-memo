// 20年春変更点
const frisby = require('frisby');
const common = require(`${__dirname}/../common.js`);
const Joi = frisby.Joi;

// クライアント証明書設定
frisby.globalSetup(common.getGlobalSetupSettings());

let linkValid = { href: Joi.string().uri(), rel: Joi.valid('replies') };


describe('個別機器制御要求 [PUT: /devices/:type/properties/_any]', () => {
	let reqData = { _any: { operationStatus: true } };
	let normalValid = { state: Joi.string().required() };
	let remoteValid = { ...normalValid, remote_ctrl: Joi.valid('1').required() };
	const createHeader = (id, remote) => {
		return { request: { headers: { 
			"X-Panasonic-Device-ID": id,
			"X-Panasonic-Remote-Control-Setting": String(remote)
		} } };
	};

	{
		it(`正常系 エアコン 遠隔あり In:${JSON.stringify(reqData)}`, function () {
			return frisby
				.setup(createHeader("0130010000000000000004", true))
				.put('/devices/homeAirConditioner/properties/_any', reqData)
				.expect('json', reqData)
				.expect('jsonTypes', 'dbgInfo.device', remoteValid)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('status', 202);
		});
	}
	{
		it(`正常系 エアコン 遠隔なし（true以外の文字列指定） In:${JSON.stringify(reqData)}`, function () {
			return frisby
				.setup(createHeader("0130010000000000000004", "fasdfkj"))
				.put('/devices/homeAirConditioner/properties/_any', reqData)
				.expect('json', reqData)
				.expect('jsonTypes', 'dbgInfo.device', normalValid)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('status', 202);
		});
	}
	{
		it(`正常系 レンジフード 遠隔あり In:${JSON.stringify(reqData)}`, function () {
			return frisby
				.setup(createHeader("0133010000000000000019", true))
				.put('/devices/ventilationFan/properties/_any', reqData)
				.expect('json', reqData)
				.expect('jsonTypes', 'dbgInfo.device', remoteValid)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('status', 202);
		});
	}
	{
		it(`正常系 レンジフード 遠隔なし(false指定) In:${JSON.stringify(reqData)}`, function () {
			return frisby
				.setup(createHeader("0133010000000000000019", false))
				.put('/devices/ventilationFan/properties/_any', reqData)
				.expect('json', reqData)
				.expect('jsonTypes', 'dbgInfo.device', normalValid)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('status', 202);
		});
	}

});

describe('個別機器指定プロパティ制御要求 [PUT: /devices/:type/properties/:propertyName]', () => {
	let reqData = { operationStatus: true };
	let normalValid = { state: Joi.string().required() };
	let remoteValid = { ...normalValid, remote_ctrl: Joi.valid('1').required() };
	const createHeader = (id, remote) => {
		return { request: { headers: { 
			"X-Panasonic-Device-ID": id,
			"X-Panasonic-Remote-Control-Setting": String(remote)
		} } };
	};

	{
		it(`正常系 エアコン 遠隔あり In:${JSON.stringify(reqData)}`, function () {
			return frisby
				.setup(createHeader("0130010000000000000004", true))
				.put('/devices/homeAirConditioner/properties/operationStatus', reqData)
				.expect('json', reqData)
				.expect('jsonTypes', 'dbgInfo.device', remoteValid)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('status', 202);
		});
	}
	{
		it(`正常系 エアコン 遠隔なし（true以外の文字列指定） In:${JSON.stringify(reqData)}`, function () {
			return frisby
				.setup(createHeader("0130010000000000000004", "fasdfkj"))
				.put('/devices/homeAirConditioner/properties/operationStatus', reqData)
				.expect('json', reqData)
				.expect('jsonTypes', 'dbgInfo.device', normalValid)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('status', 202);
		});
	}
	{
		it(`正常系 レンジフード 遠隔あり In:${JSON.stringify(reqData)}`, function () {
			return frisby
				.setup(createHeader("0133010000000000000019", true))
				.put('/devices/ventilationFan/properties/operationStatus', reqData)
				.expect('json', reqData)
				.expect('jsonTypes', 'dbgInfo.device', remoteValid)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('status', 202);
		});
	}
	{
		it(`正常系 レンジフード 遠隔なし(false指定) In:${JSON.stringify(reqData)}`, function () {
			return frisby
				.setup(createHeader("0133010000000000000019", false))
				.put('/devices/ventilationFan/properties/operationStatus', reqData)
				.expect('json', reqData)
				.expect('jsonTypes', 'dbgInfo.device', normalValid)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('status', 202);
		});
	}

});

describe('登録機器一覧取得 [GET: /devices]', () => {
	let url = `/devices`;

	{
		it(`遠隔制御設定と規格バージョン情報のチェック`, () => {
			return frisby
				.get(url)
				.expect('jsonTypes', 'devices.*', {
					hasRemoteControlSetting: Joi.boolean().required(),
					standardVersionInformation: Joi.string().length(1).required(),
				})
				.expect('status', 200);
		});
	}
});

describe('登録機器状態一括取得 [GET: /devices/_any/properties/_any]', () => {
	const url = `/devices/_any/properties/_any`;
	{
		it(`住宅用火災警報器登録時に住宅用火災警報器情報を取得すること`, () => {
			return frisby
				.get(url)
				.expect('json', '_any.?.type', 'fireSensor')
				.expect('status', 200);
		});
	}
});

describe('個別機器制御要求 [GET: /devices/:type/properties/_any]', () => {
	const validPattern = {
		commonStatus: {
			instance: Joi.number(),
			type: Joi.string(),
			deviceName: Joi.string(),
			operationStatus: Joi.boolean(),
			connection: Joi.valid('online', 'offline'),
		},
		firesensorStatus: {
			alarmStatus: Joi.string(),
			alarmingFireSensorId: Joi.forbidden(),
			fireSensors: Joi.array().items(Joi.object()),
		}
	};
	const reqHeader = {
		request: { headers: { "X-Panasonic-Device-ID": "0019010000000000000045" } }
	};

	{
		it(`正常系 住宅用火災警報器`, () => {
			return frisby
				.setup(reqHeader)
				.get('/devices/fireSensor/properties/_any')
				.expect('jsonTypes', '_any', validPattern.commonStatus)
				.expect('jsonTypes', '_any', validPattern.firesensorStatus)
				.expect('status', 200);
		});
	}
});

describe('機器疎通状態通知要求 [POST: /devices/:type/communicationline/normal]', () => {
	const url = `/devices/:type/communicationline/normal`;
	const createHeader = (id, remote) => {
		return { request: { headers: { 
			"X-Panasonic-Device-ID": id,
			"X-Panasonic-Remote-Control-Setting": String(remote)
		} } };
	};

	{
		it(`正常系 エコリンクエアコンに対して疎通確認実行`, () => {
			return frisby
				.setup(createHeader("0130010000000000000004", true))
				.post(url)
				.expect('header', 'X-Panasonic-Device-ID', '0130010000000000000004')
				.expect('status', 200);
		});
	}

	{
		it(`指定機器異常による疎通確認失敗`, () => {
			return frisby
				.setup(createHeader("0130020000000000000004", true))
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid deviceID')
				.expect('status', 400);
		});
	}

	{
		it(`遠隔操作なし指定による疎通確認失敗`, () => {
			return frisby
				.setup(createHeader("0130010000000000000004", false))
				.post(url)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', 'Invalid remoteControlSetting')
				.expect('status', 400);
		});
	}

	{
		it(`機器異常による疎通確認失敗`, () => {
			return frisby
				.setup(createHeader("0130010000000000000004", true))
				.setup(common.useStub({ getReqState_DevControl: { result:"2" } }))
				.post(url)
				.expect('json', 'errNo', 3003)
				.expect('json', 'message', "Can't connect")
				.expect('status', 500);
		});
	}
});

describe('住宅用火災警報器履歴取得 [GET: /sensors/firesensors/history]', () => {
	const url = `/sensors/firesensors/history`;
	const validPattern = {
		commonStatus: {
			id: Joi.string(),
			deviceName: Joi.string(),
		},
	};

	{
		it(`住宅用火災警報器登録時に履歴あり`, function () {
			return frisby
				.get(url)
				.expect('jsonTypes', 'devices', Joi.array().items(Joi.object()))
				.expect('jsonTypes', 'devices', Joi.array().items(validPattern.commonStatus))
				.expect('status', 200);
		});
	}

	{
		it(`住宅用火災警報器登録なし`, function () {
			return frisby
				.setup(common.useStub({ getDeviceNameSetting: { device: []} }))
				.get(url)
				.expect('jsonTypes', 'devices', Joi.array().items(Joi.forbidden()))
				.expect('status', 200);
		});
	}

});

describe('住宅用火災警報器名称取得 [GET: /settings/firesensors/name]', () => {
	const url = `/settings/firesensors/name`;
	const validPattern = {
		commonStatus: {
			id: Joi.string(),
			deviceName: Joi.string(),
		},
	};
	{
		it(`住宅用火災警報器登録あり`, function () {
			return frisby
				.get(url)
				.expect('jsonTypes', 'devices', Joi.array().items(Joi.object()))
				.expect('jsonTypes', 'devices', Joi.array().items(validPattern.commonStatus))
				.expect('status', 200);
		});
	}

	{
		it(`住宅用火災警報器登録なし`, function () {
			return frisby
				.setup(common.useStub({ getDeviceNameSetting: { device: []} }))
				.get(url)
				.expect('jsonTypes', 'devices', Joi.array().items(Joi.forbidden()))
				.expect('status', 200);
		});
	}

});

describe('住宅用火災警報器名称取得 [PUT: /settings/firesensors/name]', () => {
	const url = `/settings/firesensors/name`;
	const createBody = (id, fireSensorId, location, device) => {
		return { "id": id, "fireSensorId": fireSensorId, "locationName": location, "nodeName": device }
	};

	{
		const reqData = createBody("0019010000000000000045", 0, "aa", "bb");
		it(`住宅用火災警報器 名称変更成功 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', reqData)
				.expect('status', 200);
		});
	}

	{
		const reqData = createBody("0019010000000000000445", 0, "aa", "bb");
		it(`住宅用火災警報器 名称変更失敗 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid deviceID')
				.expect('status', 400);
		});
	}

	{
		const reqData = createBody("0019010000000000000045", 0, "aaaaaa", "bb");
		it(`住宅用火災警報器 名称変更失敗 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', 'Invalid fireSensorNames')
				.expect('status', 400);
		});
	}

	{
		const reqData = createBody("0019010000000000000045", 14, "aa", "bb");
		it(`住宅用火災警報器 名称変更成功 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', reqData)
				.expect('status', 200);
		});
	}

	{
		const reqData = createBody("0019010000000000000045", 15, "aaaaa", "bb");
		it(`住宅用火災警報器 名称変更失敗 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'errNo', 3003)
				.expect('json', 'message', 'Invalid fireSensorId')
				.expect('status', 400);
		});
	}

	{
		const reqData = createBody("0019010000000000000045", 7, "aaaaa", "bbbbbb");
		it(`住宅用火災警報器 名称変更失敗 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ setJukeikiNameSetting: { result: "2"} }))
				.put(url, reqData)
				.expect('json', 'errNo', 3004)
				.expect('json', 'message', "Can't set fireSensorName")
				.expect('status', 500);
		});
	}

});

describe('住宅用火災警報器手動試験情報取得 [GET: /settings/firesensors/inspection]', () => {
	const url = `/settings/firesensors/inspection`;
	const validPattern = {
		commonStatus: {
			id: Joi.string(),
			deviceName: Joi.string(),
			active: Joi.boolean(),
			rssi: Joi.number(),
			lastTargetFireSensor: Joi.object(),
		},
	};

	{
		it(`住宅用火災警報器手動試験情報取得 成功`, () => {
			return frisby
				.get(url)
				.expect('jsonTypes', 'devices', Joi.array().items(validPattern.commonStatus))
				.expect('status', 200);
		});
	}

	{
		it(`住宅用火災警報器手動試験情報取得 成功`, () => {
			return frisby
				.setup(common.useStub({ JukeikiCheckInfo: { checkRecord: {nodeId:"45",eoj:"0x001901",checkState:"1",terminalIndex:"15",intensity:"20",threshold:"10"}} }))
				.get(url)
				.expect('jsonTypes', 'devices', Joi.array().items(validPattern.commonStatus))
				.expect('status', 200);
		});
	}

	{
		it(`住宅用火災警報器登録なし`, function () {
			return frisby
				.setup(common.useStub({ getDeviceNameSetting: { device: []} }))
				.get(url)
				.expect('jsonTypes', 'devices', Joi.array().items(Joi.forbidden()))
				.expect('status', 200);
		});
	}

});


describe('住宅用火災警報器手動試験情報取得 [DELETE: /settings/firesensors/inspection]', () => {
	const url = `/settings/firesensors/inspection`;

	{
		const reqData = { id: "0019010000000000000045" };
		it(`住宅用火災警報器手動試験情報消去 成功`, () => {
			return frisby
				.delete(url, reqData)
				.expect('status', 204);
		});
	}

	{
		const reqData = { id: "0019020000000000000045" };
		it(`住宅用火災警報器手動試験情報消去 失敗`, () => {
			return frisby
				.delete(url, reqData)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid deviceID')
				.expect('status', 400);
		});
	}

	{
		const reqData = { id: "0019010000000000000045" };
		const setData = common.useStub({ clearJukeikiCheckInfo: { result:"1" } });
		it(`住宅用火災警報器手動試験情報消去 失敗`, () => {
			return frisby
				.setup(setData)
				.del(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "Can't reset")
				.expect('status', 500);
		});
	}

});

describe('警報通知設定情報取得 [GET: /settings/firesensors/notice]', () => {
	const url = `/settings/firesensors/notice`;

	{
		it(`警報通知設定情報取得 通知有効`, () => {
			return frisby
				.get(url)
				.expect('json', 'notice', 'enabled')
				.expect('status', 200);
		});
	}

	{
		it(`警報通知設定情報取得 通知無効`, () => {
			return frisby
				.setup(common.useStub({ getHouchiFireAlarm: { fireAlarm:"0" } }))
				.get(url)
				.expect('json', 'notice', 'disabled')
				.expect('status', 200);
		});
	}

});


describe('警報通知設定情報変更 [PUT: /settings/firesensors/notice]', () => {
	const url = `/settings/firesensors/notice`;

	{
		const reqData = { notice: "enabled" };
		it(`警報通知設定情報変更 通知有効`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'notice', 'enabled')
				.expect('status', 200);
		});
	}

	{
		const reqData = { notice: "disabled" };
		it(`警報通知設定情報変更 通知無効`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'notice', 'disabled')
				.expect('status', 200);
		});
	}

	{
		const reqData = { notice: "" };
		it(`警報通知設定情報変更 入力情報異常`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid noticeSetting')
				.expect('status', 400);
		});
	}

	{
		const reqData = { notice: "enabled" };
		const setData = common.useStub({ setHouchiFireAlarm: { result:"1" } });
		it(`警報通知設定情報変更 失敗`, () => {
			return frisby
				.setup(setData)
				.put(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "Can't set noticeSetting")
				.expect('status', 500);
		});
	}

});

describe('照明連動設定情報取得 [GET: /settings/firesensors/light/link]', () => {
	const url = `/settings/firesensors/light/link`;

	{
		it(`照明連動設定情報取得 通知無効`, () => {
			return frisby
				.setup(common.useStub({ getFireAlarmLightLinkSetting: { lightLink:"0" } }))
				.get(url)
				.expect('json', 'link', 'disabled')
				.expect('status', 200);
		});
	}

	{
		it(`照明連動設定情報取得 通知有効`, () => {
			return frisby
				.setup(common.useStub({ getFireAlarmLightLinkSetting: { lightLink:"1" } }))
				.get(url)
				.expect('json', 'link', 'enabled')
				.expect('status', 200);
		});
	}

});

describe('照明連動設定情報変更 [PUT: /settings/firesensors/light/link]', () => {
	const url = `/settings/firesensors/light/link`;

	{
		const reqData = { link: "enabled" };
		it(`照明連動設定情報変更 通知有効`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'link', 'enabled')
				.expect('status', 200);
		});
	}

	{
		const reqData = { link: "disabled" };
		it(`照明連動設定情報変更 通知無効`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'link', 'disabled')
				.expect('status', 200);
		});
	}

	{
		const reqData = { link: "" };
		it(`照明連動設定情報変更 入力情報異常`, () => {
			return frisby
				.put(url, reqData)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid linkSetting')
				.expect('status', 400);
		});
	}

	{
		const reqData = { link: "enabled" };
		const setData = common.useStub({ setFireAlarmLightLinkSetting: { result:"1" } });
		it(`照明連動設定情報変更 失敗`, () => {
			return frisby
				.setup(setData)
				.put(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "Can't set linkSetting")
				.expect('status', 500);
		});
	}

	{
		const reqData = { link: "enabled" };
		const setData = common.useStub({ getDeviceNameSetting: { device: [] } });
		it(`照明連動設定情報変更 失敗`, () => {
			return frisby
				.setup(setData)
				.put(url, reqData)
				.expect('json', 'errNo', 3003)
				.expect('json', 'message', 'No registered light devices')
				.expect('status', 500);
		});
	}

});

