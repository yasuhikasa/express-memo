import { postRegistration } from './yourModule'; // モジュールの正確なパスに置き換えてください
import { mocked } from 'ts-jest/utils';
import ioRedis from 'yourIoRedisModule'; // 正確なモジュールパスに置き換えてください
import _ from 'yourUtilityModule'; // 正確なモジュールパスに置き換えてください

jest.mock('yourIoRedisModule'); // 正確なモジュールパスに置き換えてください
jest.mock('yourUtilityModule'); // 正確なモジュールパスに置き換えてください

describe('スマートメーターの新規登録', () => {
	const mockRequest: any = {
		body: {
			auth_id: 'sample_auth_id',
			password: 'sample_password',
			device_name: 'sample_device_name',
			set_type: 1,
		},
	};
	const mockResponse: any = {
		json: jest.fn(),
	};
	const mockNext: any = jest.fn();

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('正常に登録が行われる場合', async () => {
		mocked(ioRedis.blpopWithTimeout).mockResolvedValueOnce({ status: 0 }).mockResolvedValueOnce({ status: 0 });

		await postRegistration(mockRequest, mockResponse, mockNext);

		expect(mockResponse.json).toHaveBeenCalledWith(expect.objectContaining({
			auth_id: mockRequest.body.auth_id,
			device_name: mockRequest.body.device_name,
			set_type: mockRequest.body.set_type,
		}));
	});

	it('スキーマのバリデーションエラーの場合', async () => {
		mockRequest.body.set_type = 'invalid_type';

		await postRegistration(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
			message: 'Invalid properties',
		}));
	});

	it('Redisからの1次応答エラーの場合', async () => {
		mocked(ioRedis.blpopWithTimeout).mockResolvedValueOnce({ status: 1 });

		await postRegistration(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
			message: 'Failed to set',
		}));
	});

	it('Redisからの2次応答エラーの場合', async () => {
		mocked(ioRedis.blpopWithTimeout).mockResolvedValueOnce({ status: 0 }).mockResolvedValueOnce({ status: 1 });

		await postRegistration(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
			message: 'Failed to set',
		}));
	});

	it('予期しないエラーの場合', async () => {
		const errorMessage = 'ランダムエラー';
		mocked(_.createReqNumber).mockImplementation(() => {
			throw new Error(errorMessage);
		});

		await postRegistration(mockRequest, mockResponse, mockNext);

		expect(mockNext).toHaveBeenCalledWith(expect.objectContaining({
			message: errorMessage,
		}));
	});
});


    // 入力フィールドのバリデーション」と「正常応答のハンドリング」


// import frisby from 'frisby';

// const baseUrl = 'http://localhost:3000';  // あなたのAPIサーバーのURLに変更してください

// describe('スマートメーターの新規登録', () => {

// 	// 入力フィールドのバリデーション
// 	describe('入力フィールドのバリデーション', () => {

// 		it('auth_idが欠落している場合、400エラーを返す', (done) => {
// 			frisby.post(`${baseUrl}/smartmeter/actions/startRegistration`, {
// 				password: 'sample_password',
// 				device_name: 'sample_device_name',
// 				set_type: 1
// 			})
// 				.expect('status', 400)
// 				.expect('json', 'error', 'Invalid properties')  
// 				.done(done);
// 		});

// 		it('passwordが欠落している場合、400エラーを返す', (done) => {
// 			frisby.post(`${baseUrl}/smartmeter/actions/startRegistration`, {
// 				auth_id: 'sample_auth_id',
// 				device_name: 'sample_device_name',
// 				set_type: 1
// 			})
// 				.expect('status', 400)
// 				.expect('json', 'error', 'Invalid properties')  
// 				.done(done);
// 		});

// 		it('device_nameが欠落している場合、400エラーを返す', (done) => {
// 			frisby.post(`${baseUrl}/smartmeter/actions/startRegistration`, {
// 				auth_id: 'sample_auth_id',
// 				password: 'sample_password',
// 				set_type: 1
// 			})
// 				.expect('status', 400)
// 				.expect('json', 'error', 'Invalid properties')  
// 				.done(done);
// 		});

// 		it('set_typeが欠落している場合、400エラーを返す', (done) => {
// 			frisby.post(`${baseUrl}/smartmeter/actions/startRegistration`, {
// 				auth_id: 'sample_auth_id',
// 				password: 'sample_password',
// 				device_name: 'sample_device_name',
// 			})
// 				.expect('status', 400)
// 				.expect('json', 'error', 'Invalid properties')  
// 				.done(done);
// 		});

// 	});

// 	// 正常応答のハンドリング
// 	describe('正常応答のハンドリング', () => {

// 		it('全ての入力フィールドが正しい場合、202を返す', (done) => {
// 			frisby.post(`${baseUrl}/smartmeter/actions/startRegistration`, {
// 				auth_id: 'sample_auth_id',
// 				password: 'sample_password',
// 				device_name: 'sample_device_name',
// 				set_type: 1
// 			})
// 				.expect('status', 202)
// 				.expect('json', 'auth_id', 'sample_auth_id')  
// 				.expect('json', 'device_name', 'sample_device_name')  
// 				.expect('json', 'set_type', 1)  
// 				.done(done);
// 		});

// 	});

// });


// Redisへの要求PUSHの確認:
// Redisに要求が正しくPUSHされているかを確認するためのテストは、モックライブラリを使用してRedisの関数をモックアップする必要があります。

// 1次応答のエラーハンドリング:
// 1次応答がエラーを返す場合のハンドリングをテストします。

// 2次応答のエラーハンドリング:
// 2次応答がエラーを返す場合のハンドリングをテストします。

// import frisby from 'frisby';
// import * as ioRedis from "@/libs/redis";

// jest.mock('@/libs/redis');

// const baseUrl = 'http://localhost:3000'; 

// describe('スマートメーターの新規登録', () => {

// 	// Redisへの要求PUSHの確認
// 	describe('Redisへの要求PUSH', () => {
// 		it('正常な要求でRedisにPUSHする', async (done) => {
// 			const mockRpush = jest.fn();
// 			(ioRedis.getRedisInstance as jest.Mock).mockReturnValue({ rpush: mockRpush });

// 			await frisby.post(`${baseUrl}/smartmeter/actions/startRegistration`, {
// 				auth_id: 'sample_auth_id',
// 				password: 'sample_password',
// 				device_name: 'sample_device_name',
// 				set_type: 1
// 			});

// 			expect(mockRpush).toBeCalled();
// 			done();
// 		});
// 	});

// 	// 1次応答のエラーハンドリング
// 	describe('1次応答のエラーハンドリング', () => {
// 		it('1次応答でエラーが返された場合、500エラーを返す', async (done) => {
// 			(ioRedis.blpopWithTimeout as jest.Mock).mockResolvedValueOnce({ status: 1 });

// 			await frisby.post(`${baseUrl}/smartmeter/actions/startRegistration`, {
// 				auth_id: 'sample_auth_id',
// 				password: 'sample_password',
// 				device_name: 'sample_device_name',
// 				set_type: 1
// 			})
// 				.expect('status', 500)
// 				.expect('json', 'error', 'Failed to set')
// 				.done(done);
// 		});
// 	});

// 	// 2次応答のエラーハンドリング
// 	describe('2次応答のエラーハンドリング', () => {
// 		it('2次応答でエラーが返された場合、500エラーを返す', async (done) => {
// 			(ioRedis.blpopWithTimeout as jest.Mock).mockResolvedValueOnce({ status: 0 }).mockResolvedValueOnce({ status: 1 });

// 			await frisby.post(`${baseUrl}/smartmeter/actions/startRegistration`, {
// 				auth_id: 'sample_auth_id',
// 				password: 'sample_password',
// 				device_name: 'sample_device_name',
// 				set_type: 1
// 			})
// 				.expect('status', 500)
// 				.expect('json', 'error', 'Failed to set')
// 				.done(done);
// 		});
// 	});

// });
