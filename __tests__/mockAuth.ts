// mockAuth.ts

export function getMockedAuthHeaders(): Record<string, string> {
	// ダイジェスト認証をバイパスするためのヘッダーを返す
	return {
		'Authorization': 'Digest username="testUser", realm="testRealm", nonce="testNonce", uri="/test", response="testResponse"'
	};
}


// テストファイル
import * as frisby from 'frisby';
import { getMockedAuthHeaders } from './mockAuth';

// ダイジェスト認証のモックヘッダーを取得
const mockHeaders = getMockedAuthHeaders();

frisby.create('Your test description')
	.get('Your API endpoint', { headers: mockHeaders })
// その他のテスト条件や検証
	.toss();
