import frisby from 'frisby';
import { postStartRegistration, postStopRegistration } from './your-module-path'; // 実際のモジュールのパスに変更してください
import express from 'express';

// Expressアプリのインスタンスを作成
const app = express();

// JSONのリクエストボディを解析するためのミドルウェアを適用
app.use(express.json());

// 機器登録の開始と停止のエンドポイントを設定
app.post('/registries/actions/startRegistration', postStartRegistration);
app.post('/registries/actions/stopRegistration', postStopRegistration);

// テスト用のExpressサーバーを起動（ポート3000で待機）
const server = app.listen(3000);

// モック化の設定
// このテストでRedisの実際のインスタンスを使用するのを避けるために、Redis関連の関数をモック化
jest.mock('@/libs/redis', () => ({
	getRedisInstance: jest.fn().mockReturnValue({
		// rpushメソッドは常にtrueを返すようにモック化
		rpush: jest.fn().mockResolvedValue(true),
		// blpopWithTimeoutメソッドは指定したJSONレスポンスを返すようにモック化
		blpopWithTimeout: jest.fn().mockResolvedValue({ status: 'success' }),
	}),
}));

describe('Registries Handlers', () => {
	// 全てのテストケースが終了した後にサーバーを終了
	afterAll(() => {
		server.close();
	});

	// 機器登録開始のエンドポイントのテスト
	it('should start registration', async () => {
		return frisby
			.post('http://localhost:3000/registries/actions/startRegistration', {})
			.expect('status', 200)  // HTTPステータスが200であることを期待
			.expect('json', 'result', 'success');  // レスポンスのJSONにresultプロパティが'success'であることを期待
	});

	// 機器登録停止のエンドポイントのテスト
	it('should stop registration', async () => {
		return frisby
			.post('http://localhost:3000/registries/actions/stopRegistration', {})
			.expect('status', 200)  // HTTPステータスが200であることを期待
			.expect('json', 'result', 'success');  // レスポンスのJSONにresultプロパティが'success'であることを期待
	});
});
