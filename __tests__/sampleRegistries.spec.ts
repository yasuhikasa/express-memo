// import frisby from 'frisby';
// import { postStartRegistration, postStopRegistration } from './your-module-path'; // 実際のモジュールのパスに変更してください
// import express from 'express';

// // Expressアプリのインスタンスを作成
// const app = express();

// // JSONのリクエストボディを解析するためのミドルウェアを適用
// app.use(express.json());

// // 機器登録の開始と停止のエンドポイントを設定
// app.post('/registries/actions/startRegistration', postStartRegistration);
// app.post('/registries/actions/stopRegistration', postStopRegistration);

// // テスト用のExpressサーバーを起動（ポート3000で待機）
// const server = app.listen(3000);

// // モック化の設定
// // このテストでRedisの実際のインスタンスを使用するのを避けるために、Redis関連の関数をモック化
// jest.mock('@/libs/redis', () => ({
// 	getRedisInstance: jest.fn().mockReturnValue({
// 		// rpushメソッドは常にtrueを返すようにモック化
// 		rpush: jest.fn().mockResolvedValue(true),
// 		// blpopWithTimeoutメソッドは指定したJSONレスポンスを返すようにモック化
// 		blpopWithTimeout: jest.fn().mockResolvedValue({ status: 'success' }),
// 	}),
// }));

// describe('Registries Handlers', () => {
// 	// 全てのテストケースが終了した後にサーバーを終了
// 	afterAll(() => {
// 		server.close();
// 	});

// 	// 機器登録開始のエンドポイントのテスト
// 	it('should start registration', async () => {
// 		return frisby
// 			.post('http://localhost:3000/registries/actions/startRegistration', {})
// 			.expect('status', 200)  // HTTPステータスが200であることを期待
// 			.expect('json', 'result', 'success');  // レスポンスのJSONにresultプロパティが'success'であることを期待
// 	});

// 	// 機器登録停止のエンドポイントのテスト
// 	it('should stop registration', async () => {
// 		return frisby
// 			.post('http://localhost:3000/registries/actions/stopRegistration', {})
// 			.expect('status', 200)  // HTTPステータスが200であることを期待
// 			.expect('json', 'result', 'success');  // レスポンスのJSONにresultプロパティが'success'であることを期待
// 	});
// });


// import frisby from 'frisby';
// import * as yourModule from 'path-to-your-module'; 

// beforeAll(() => {
// 	jest.mock("tls", () => {
// 		return {
// 			TLSSocket: jest.fn().mockImplementation(() => {
// 				return {
// 					authorized: true,
// 				};
// 			}),
// 		};
// 	});

// 	jest.mock("@/libs/digestAuth", () => {
// 		return () => (req, res, next) => next();
// 	});
	

// 	const mockChange = jest.fn();
// 	yourModule.change = mockChange;
// 	mockChange.mockReturnValue({ activation: true, organizationalUnitName: "HX_S" });
// });


// describe('機器登録', () => {
// 	it('機器登録開始', async () =>
// 	{
// 		await frisby
// 			.get('http://localhost:443/api/v1/controllers/gw/devices/airConditioner/properties/def')
// 			.expect('status', 200).promise();

// 	});

// 	it('機器登録中止', async () => {
// 		await frisby
// 			.post('http://localhost:443/api/v1/controllers/gw/registries/actions/stopRegistration')
// 			.expect('status', 200).promise();
        
// 	});
// });






// const mockAuthMiddleware = jest.fn((req, res, next) => next());
// authModule.authMiddleware = mockAuthMiddleware;


// import nock from 'nock';

// beforeAll(() => {
// 	// digestAuthがリクエストを送る認証サーバのURLをモック
// 	nock('https://authserver.com')
// 		.post('/digest-auth-endpoint')  // このエンドポイントにPOSTリクエストが来たら
// 		.reply(200, { status: 'authenticated' });  // このレスポンスを返す
// });




import frisby from 'frisby';
import * as ioRedis from "@/libs/redis";

describe('機器登録', () => {

	beforeAll(async () => {
		// 必要なセットアップ処理
	});

	afterAll(async () => {
		// クリーンアップ処理
	});

	it('機器登録開始', async () => {
		const res = await frisby
			.post('http://localhost:443/api/v1/controllers/gw/registries/actions/startRegistration')
			.expect('status', 200);

		expect(res.json.result).toBe('some_expected_value'); // 応答の具体的な値に基づいて修正してください
	});

	it('機器登録中止', async () => {
		const res = await frisby
			.post('http://localhost:443/api/v1/controllers/gw/registries/actions/stopRegistration')
			.expect('status', 200);

		expect(res.json.result).toBe('some_expected_value'); // 応答の具体的な値に基づいて修正してください
	});

	describe('Error scenarios', () => {
		beforeEach(() => {
			jest.resetModules(); // エラーシナリオのテストケースの前にモジュールの状態をリセット
		});

		it('Redisが応答しない場合のエラー', async () => {
			jest.doMock('@/libs/redis', () => ({
				getRedisInstance: jest.fn().mockImplementation(() => {
					throw new Error("Redis connection error");
				}),
			}));

			const res = await frisby
				.post('http://localhost:443/api/v1/controllers/gw/registries/actions/startRegistration')
				.expect('status', 500);

			expect(res.json.message).toBe('Failed to start registration');
		});
	});

	it('statusが応答に含まれていない場合のエラー', async () => {
    // Redisの応答をモックして、statusプロパティを含まないデータを返すように設定
    const mockResponseWithoutStatus = { someOtherProperty: "value" }; // 実際のデータ構造に応じて修正してください

    jest.doMock('@/libs/redis', () => ({
        getRedisInstance: jest.fn().mockImplementation(() => ({
            rpush: jest.fn(),
            blpopWithTimeout: jest.fn().mockResolvedValue(mockResponseWithoutStatus)
        }))
    }));

    const res = await frisby
        .post('http://localhost:443/api/v1/controllers/gw/registries/actions/startRegistration')
        .expect('status', 500);

    expect(res.json.message).toBe('Failed to start registration');
});

	});

});
