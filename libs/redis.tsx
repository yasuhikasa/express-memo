/****************************************************
 * Redis ライブラリ
 * @module redis
 *****************************************************/
import IORedis from "ioredis"
import * as def from "../definitions/def"

const redisPort = 6379
const redisAddress = "redis"
let RedisInstance: IORedis

/**
 * 接続インスタンス取得(初回に生成したインスタンスを返す)
 * @returns {IORedis} 接続インスタンス
 */
export const getRedisInstance = () => {
	if (RedisInstance) {
		return RedisInstance
	} else {
		RedisInstance = new IORedis(redisPort, redisAddress)
		return RedisInstance
	}
}

/**
 * 接続インスタンス取得(要求毎にインスタンスを生成して返す)
 * @returns {IORedis} 接続インスタンス
 */
export const newRedisInstance = () => {
	return new IORedis(redisPort, redisAddress)
}

/**
 * 接続インスタンス取得(要求毎にインスタンスを生成して返す)
 * @param {IORedis} redis 接続インスタンス
 */
export const disconnectRedis = (redis: IORedis) => {
	redis.disconnect()
}

/**
 * タイムアウトを指定してRedisからBLPOPを行う
 * IORedis標準のBLPOPタイムアウトを使用するとシステム時刻を変更した際に
 * タイムアウトが正しく動作しないためBLPOPにはこの関数を使用する
 * @param {string} key Redisキー
 * @param {number} timeout タイムアウト(秒)
 * @return {Promise} BLPOP取得値もしくはエラーメッセージ
 */
export const blpopWithTimeout = async (key: string, timeout: number): Promise<any> => {
	const redis = newRedisInstance()
	let timeoutId: NodeJS.Timeout | null = null
	try {
		const result = await new Promise((resolve, reject) => {
			timeoutId = setTimeout(() => {
				reject("Timeout")
			}, timeout * 1000)
			redis.blpop(key, 0, (err, data) => {
				if (timeoutId) {
					clearTimeout(timeoutId)
					timeoutId = null
				}
				if (err) {
					reject(err)
				}
				if (data) {
					try {
						resolve(JSON.parse(data[1]))
					} catch {
						reject("Invalid data")
					}
				}
			})
		})
		return result
		// eslint-disable-next-line no-useless-catch
	} catch (err) {
		// 呼び出し元で例外処理するためエラーを再スローする
		throw err
	} finally {
		disconnectRedis(redis)
	}
}
