const request = require('supertest');
const app = require('../app'); // あなたの Express アプリのメインファイルへのパスを指定

describe('GET /', () => {
  it('should respond with a message', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.text).toBe('Hello, world!'); // 期待するレスポンスを指定
  });
});
