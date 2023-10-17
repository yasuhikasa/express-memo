// 機器登録
let frisby = require('frisby');
let path = require('path');
let common = require(path.join(__dirname, '..', 'common.js'));
let Joi = frisby.Joi;

// クライアント証明書設定
frisby.globalSetup(common.getGlobalSetupSettings());

let linkValid = { href: Joi.string().uri(), rel: Joi.valid('replies') };

// サンプル
// describe('API [PUT: /aaa/bbb]', () => {
//   let url = `/aaa/bbb`;
//   let baseData = { period: "hour" };

//   {
//     let reqData = Object.assign({}, baseData, { bbb: [1,2,3] });
//     it(`description In:${JSON.stringify(reqData)}`, () => {
//       return frisby
//         .put(url, reqData)
//         .expect('jsonTypes', {
//           aaa: Joi.string(),
//           bbb: Joi.array().items(Joi.string()),
//         })
//         .expect('status', 200);
//     });
//   }
// });

describe('エコリンク機器登録 [POST: /registries/ecolink/actions/startRegistration]', () => {
	let url = `/registries/ecolink/actions/startRegistration`;

	{
		it(`正常系`, () => {
			return frisby
				.post(url)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('jsonTypes', {
					acceptId: Joi.string(),
				})
				.expect('status', 202);
		});
	}

});

describe('エコリンク機器登録処理 [POST: /registries/ecolink/actions/getRegistrationResult]', () => {
	let url = `/registries/ecolink/actions/getRegistrationResult`;
	let baseData = { acceptId: "1" };

	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.post(url, reqData)
				.expect('jsonTypes', {
					status: Joi.valid('completed', 'inProgress'),
				})
				.expect('status', 200);
		});
	}
	{
		it(`異常系 ID指定なし`, () => {
			return frisby
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid acceptId')
				.expect('status', 400);
		});
	}
});

describe('エコリンク機器登録終了 [POST: /registries/ecolink/actions/stopRegistration]', () => {
	let url = `/registries/ecolink/actions/stopRegistration`;
	let baseData = { acceptId: "1" };

	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.post(url, reqData)
				.expect('json', reqData)
				.expect('status', 200);
		});
	}
	{
		it(`異常系 ID指定なし`, () => {
			return frisby
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid acceptId')
				.expect('status', 400);
		});
	}
});

describe('LAN機器検出開始 [POST: /registries/lan/actions/startSearch]', () => {
	let url = `/registries/lan/actions/startSearch`;

	{
		it(`正常系`, () => {
			return frisby
				.post(url)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('jsonTypes', {
					acceptId: Joi.string(),
				})
				.expect('status', 202);
		});
	}
});

describe('LAN機器検出処理結果取得 [POST: /registries/lan/actions/getSearchResult]', () => {
	let url = `/registries/lan/actions/getSearchResult`;
	let baseData = { acceptId: "1001" };

	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.post(url, reqData)
				.expect('jsonTypes', {
					status: Joi.valid('completed', 'inProgress'),
				})
				.expect('status', 202);
		});
	}
	{
		it(`異常系 ID指定なし`, () => {
			return frisby
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid acceptId')
				.expect('status', 400);
		});
	}
});

describe('LAN機器検出終了 [POST: /registries/lan/actions/stopSearch]', () => {
	let url = `/registries/lan/actions/stopSearch`;
	let baseData = { acceptId: "1001" };

	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.post(url, reqData)
				.expect('json', reqData)
				.expect('status', 200);
		});
	}
	{
		it(`異常系 ID指定なし`, () => {
			return frisby
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid acceptId')
				.expect('status', 400);
		});
	}
});

describe('LAN機器登録準備開始 [POST: /registries/lan/actions/requestRegistration]', () => {
	let url = `/registries/lan/actions/requestRegistration`;
	let baseData = { acceptId: "1001", devices: ["創蓄連携システムA"] };

	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.post(url, reqData)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('jsonTypes', {
					acceptId: Joi.string(),
				})
				.expect('status', 202);
		});
	}
	{
		let reqData = { devices: baseData.devices };
		it(`異常系 ID指定なし In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.post(url, reqData)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid acceptId')
				.expect('status', 400);
		});
	}
	{
		let reqData = { acceptId: baseData.acceptId };
		it(`異常系 機器指定なし In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.post(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', 'Invalid devices')
				.expect('status', 400);
		});
	}
});

describe('LAN機器登録準備処理取得 [POST: /registries/lan/actions/getRequestRegistrationResult]', () => {
	let url = `/registries/lan/actions/getRequestRegistrationResult`;
	let baseData = { acceptId: "2001" };

	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.post(url, reqData)
				.expect('jsonTypes', {
					status: Joi.valid('prepared', 'inProgress'),
				})
				.expect('status', 202);
		});
	}
	{
		it(`異常系 ID指定なし`, () => {
			return frisby
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid acceptId')
				.expect('status', 400);
		});
	}
});

describe('スマートメーター登録開始 [POST: /registries/smartmeter/actions/startRegistration]', () => {
	let url = `/registries/smartmeter/actions/startRegistration`;
	let baseData = {
		"setType": "normal",
		"name": "スマートメーター１",
		"authId": "1111AAAA2222BBBB3333CCCC4444DDDD"
	};

	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup({ request: { headers: { "X-Panasonic-Aiseg-Smartmeter-Password": "5555EEEE6666" } } })
				.post(url, reqData)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('jsonTypes', {
					acceptId: Joi.string(),
				})
				.expect('status', 202);
		});
	}
	{
		it(`異常系 リクエストボディが不適切`, () => {
			return frisby
				.setup({ request: { headers: { "X-Panasonic-Aiseg-Smartmeter-Password": "5555EEEE6666" } } })
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid smartMeterSetting')
				.expect('status', 400);
		});
	}
	{
		let reqData = Object.assign({}, baseData);
		it(`異常系 認証パスワードなし In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.post(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', 'Invalid password')
				.expect('status', 400);
		});
	}
	{
		let reqData = Object.assign({}, baseData);
		it(`異常系 登録受付失敗（アドオンエラー） In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup({ request: { headers: { "X-Panasonic-Aiseg-Smartmeter-Password": "5555EEEE6666" } } })
				.setup(common.useStub({ registerStart: { result: "1", accId: "-" } }))
				.post(url, reqData)
				.expect('json', 'errNo', 3003)
				.expect('json', 'message', "Can't accept")
				.expect('status', 500);
		});
	}
});

describe('スマートメーター登録結果取得 [POST: /registries/smartmeter/actions/getRegistrationResult]', () => {
	let url = `/registries/smartmeter/actions/getRegistrationResult`;
	let baseData = { "acceptId": "1" };

	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 登録完了 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ getStatus: { status: "1" } }))
				.post(url, reqData)
				.expect('json', 'status', 'completed')
				.expect('status', 200);
		});
	}
	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 登録中 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ getStatus: { status: "0" } }))
				.post(url, reqData)
				.expect('json', 'status', 'inProgress')
				.expect('status', 200);
		});
	}
	{
		let reqData = Object.assign({}, baseData);
		it(`異常系 登録総数上限オーバー In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ getStatus: { status: "5" } }))
				.post(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', 'deviceLimit')
				.expect('status', 500);
		});
	}
	{
		let reqData = Object.assign({}, baseData);
		it(`異常系 登録失敗 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ getStatus: { status: "2" } }))
				.post(url, reqData)
				.expect('json', 'errNo', 3003)
				.expect('json', 'message', "Can't register")
				.expect('status', 500);
		});
	}
	{
		it(`異常系 リクエストボディが不適切`, () => {
			return frisby
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', "Invalid acceptId")
				.expect('status', 400);
		});
	}

});

describe('電波到達確認開始 [POST: /registries/actions/startNetworkCheck]', () => {
	let url = `/registries/actions/startNetworkCheck`;
	const requestHeader = { request: { headers: { "X-Panasonic-Device-ID": "0263030000000000000003" } } };

	{
		it(`正常系`, () => {
			return frisby
				.setup(requestHeader)
				.setup(common.useStub({ reqCheckNetworkDevice: { result: "0", acceptId: "0" } }))
				.post(url)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('jsonTypes', 'acceptId', Joi.string())
				.expect('status', 202);
		});
	}
	{
		it(`異常系 開始失敗（アドオンエラー）`, () => {
			return frisby
				.setup(requestHeader)
				.setup(common.useStub({ reqCheckNetworkDevice: { result: "1" } }))
				.post(url)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "Can't start networkCheck")
				.expect('status', 500);
		});
	}

	{
		it(`異常系 ID指定なし`, () => {
			return frisby
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', "Invalid deviceID")
				.expect('status', 400);
		});
	}

});


describe('電波到達処理取得 [POST: /registries/actions/getNetworkCheckResult]', () => {
	let url = `/registries/actions/getNetworkCheckResult`;
	let baseData = { acceptId: "0" };

	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ getReqState_CheckNetworkDevice: { result: ["0"] } }))
				.post(url, reqData)
				.expect('json', 'status', 'success')
				.expect('status', 200);
		});
	}
	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 処理中 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ getReqState_CheckNetworkDevice: { result: ["1"] } }))
				.post(url, reqData)
				.expect('json', 'status', 'inProgress')
				.expect('status', 200);
		});
	}
	{
		let reqData = Object.assign({}, baseData);
		it(`異常系 電波到達失敗 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ getReqState_CheckNetworkDevice: { result: ["2"] } }))
				.post(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "Not connect network")
				.expect('status', 500);
		});
	}
	{
		it(`異常系 ID指定なし`, () => {
			return frisby
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid acceptId')
				.expect('status', 400);
		});
	}

});


describe('機器削除開始 [POST: /registries/actions/requestDelete]', () => {
	let url = `/registries/actions/requestDelete`;
	const requestHeader = { request: { headers: { "X-Panasonic-Device-ID": "0263030000000000000003" } } };

	{
		it(`正常系`, () => {
			return frisby
				.setup(requestHeader)
				.setup(common.useStub({ "getEcoDeviceList": { "deviceList": [{ "nodeId": "3", "eoj": "0x026303" }] } }))
				.post(url)
				.expect('jsonTypes', 'links.*', linkValid)
				.expect('jsonTypes', {
					acceptId: Joi.string(),
				})
				.expect('status', 202);
		});
	}
	{
		it(`異常系 ID指定なし`, () => {
			return frisby
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', "Invalid deviceID")
				.expect('status', 400);
		});
	}
	{
		it(`異常系 登録機器なし`, () => {
			return frisby
				.setup(requestHeader)
				.setup(common.useStub({ "getEcoDeviceList": { "deviceList": [] } }))
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', "Invalid deviceID")
				.expect('status', 400);
		});
	}
	{
		it(`異常系 削除開始失敗`, () => {
			return frisby
				.setup(requestHeader)
				.setup(common.useStub({
					getEcoDeviceList: { deviceList: [{ nodeId: "3", eoj: "0x026303" }] },
					deleteStart: { result: "1", accId: "-" }
				}))
				.post(url)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "Can't request delete")
				.expect('status', 500);
		});
	}

});

describe('削除準備処理結果取得 [POST: /registries/actions/getRequestDeleteResult]', () => {
	let url = `/registries/actions/getRequestDeleteResult`;
	let baseData = { acceptId: "1" };

	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ getDeleteStatus: { status: "1" } }))
				.post(url, reqData)
				.expect('jsonTypes', 'acceptId', Joi.string())
				.expect('json', 'status', 'prepared')
				.expect('status', 202);
		});
	}
	{
		let reqData = Object.assign({}, baseData);
		it(`正常系 処理中 In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ getDeleteStatus: { status: "0" } }))
				.post(url, reqData)
				.expect('jsonTypes', 'acceptId', Joi.string())
				.expect('json', 'status', 'inProgress')
				.expect('status', 202);
		});
	}
	{
		let reqData = Object.assign({}, baseData);
		it(`異常系 削除失敗（アドオンエラー） In:${JSON.stringify(reqData)}`, () => {
			return frisby
				.setup(common.useStub({ getDeleteStatus: { status: "2" } }))
				.post(url, reqData)
				.expect('json', 'errNo', 3002)
				.expect('json', 'message', "Can't delete")
				.expect('status', 500);
		});
	}
	{
		it(`異常系 ID指定なし`, () => {
			return frisby
				.post(url)
				.expect('json', 'errNo', 3001)
				.expect('json', 'message', 'Invalid acceptId')
				.expect('status', 400);
		});
	}

});
