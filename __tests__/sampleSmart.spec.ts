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
