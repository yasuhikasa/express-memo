/****************************************************

ユーティリティ ライブラリ（認証サーバ全体で使用する関数を定義）
サーバーサイドでのみ使用する関数を定義（参考用）
@module util
*****************************************************/
import crypto from "crypto"
import ipaddr from "ipaddr.js"
import { execSync } from "child_process"
// デフォルトゲートウェイのIPアドレス
let defaultGateWayIpAddress = "0.0.0.0"

/**

MD5変換関数
@param {string} word MD5変換対象の文字列
@example
md5("abc") => "900150983cd24fb0d6963f7d28e17f72"
*/
export const md5 = (word: string) => crypto.createHash("MD5").update(word).digest("hex")
/**

ローカルホスト判定
@param {any} request リクエストオブジェクト
@return {boolean} ローカルホスト判定(true/false)
*/
export const isLocalhost = function (request: any) {
	const ip = getClientIp(request)
	const ipv4Addr = cnvIpv4MappedAddressToIpv4Address(ip)
	return ipv4Addr === "127.0.0.1" || ipv4Addr === "::1";
}
/**

クライアントIP取得
@param {any} request リクエストオブジェクト
@return {any} クライアントIPアドレス
*/
export const getClientIp = function (request: any) {
	return request.connection && request.connection.remoteAddress
		? request.connection.remoteAddress
		: request.connection.socket && request.connection.socket.remoteAddress
			? request.connection.socket.remoteAddress
			: request.socket && request.socket.remoteAddress
				? request.socket.remoteAddress
				: "0.0.0.0"
}
/**

IPv4射影アドレス変換処理
@param {string} ipv4MappedAddr IPv4射影アドレス
@returns {string} IPv4アドレス
*/
export const cnvIpv4MappedAddressToIpv4Address = (ipv4MappedAddr: string): string => {
	let ipv4Addr = "0.0.0.0"
	if (ipaddr.IPv6.isIPv6(ipv4MappedAddr) === true) {
		const addr = ipaddr.IPv6.parse(ipv4MappedAddr)
		ipv4Addr = addr.toIPv4Address().toString()
	}
	return ipv4Addr
}



/**

デフォルトゲートウェイ IPアドレス取得
起動時に実行し取得したIPアドレスを変数に保持する
*/
function getDefaultGateWayIpAddress() {
	const utf8decorder = new TextDecoder()
	const result = execSync("ip route show")
	const nets = utf8decorder.decode(result).split(" ")
	defaultGateWayIpAddress = nets[2]
}
// 起動時に実行
getDefaultGateWayIpAddress()