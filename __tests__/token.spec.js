const frisby = require('frisby');
const common = require(`${__dirname}/../common.js`);
const Joi = frisby.Joi;

// クライアント証明書設定
frisby.globalSetup(common.getGlobalSetupSettings());

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