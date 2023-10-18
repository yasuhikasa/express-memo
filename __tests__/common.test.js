const fs  = require('fs');
const https = require('https');

const common = {
	unitTestHost: "https://localhost:4443/api/v1/controllers/aiseg/",
	emuTestHost: "https://192.168.17.216/api/v1/controllers/aiseg/",

	/**
     * コールするAPIの内部で使用するアドオンに対して任意のスタブを設定する
     * スタブオブジェクトは{ "適用したいアドオン名": 置き換えたいオブジェクト }の形となる。
     * 内部でJSON文字列化するため、書き換えたいオブジェクトはJSON文字列化しないこと。
     * 複数のアドオンに対してスタブ設定も可能。
     * @param {Object} stub スタブオブジェクト
     */
	useStub(stub) {
		const strStub = JSON.stringify(stub);
		return {
			request: {
				headers: {
					'X-Panasonic-Aiseg-TestData': strStub
				}
			}
		};
	},

	/**
     * グローバル設定オブジェクト生成
     * @returns グローバル設定用オブジェクト
     */
	getGlobalSetupSettings() {
		return {
			request: {
				agent: this.createAgentSettings(),
				baseUrl: this.unitTestHost,
			}
		};
	},

	/**
     * エミュレータテスト用グローバル設定オブジェクト生成
     * @returns グローバル設定用オブジェクト
     */
	getEmuGlobalSetupSettings() {
		return {
			request: {
				agent: this.createAgentSettings(),
				baseUrl: this.emuTestHost,
				headers: {
					'x-forwarded-for': '127.0.0.1'
				},
			}
		};
	},

	/**
     * agent設定用オブジェクト生成
     * @returns agent設定用オブジェクト
     */
	createAgentSettings() {
		return new https.Agent({
			pfx: fs.readFileSync('certs/clientadmin.p12'),
			passphrase: 'PESAISEG2',
		});
	},

	/**
     * オブジェクトのディープコピー関数
     * @param {Object} obj コピー対象オブジェクト
     * @returns {Object} コピーしたオブジェクト
     */
	cloneDeep(obj) {
		var copy;
		var that = this;
 
		if (obj === null || typeof obj != "object") return obj;
     
		if (obj instanceof Date) {
			copy = new Date();
			copy.setTime(obj.getTime());
		} else if (obj instanceof Array) {
			copy = [];
			for (var i = 0; i < obj.length; i++) {
				copy.push(that.cloneDeep(obj[i]));
			}
		} else if (obj instanceof Object) {
			copy = Object.create(obj);
			for (var key in obj) {
				if (obj.hasOwnProperty(key)) copy[key] = that.cloneDeep(obj[key]);
			}
		}
		return copy;
	},
};

module.exports = common;
