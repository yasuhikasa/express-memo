/****************************************************
 * ログ管理 ライブラリ
 * @module logger
 *****************************************************/
import Log4js from "log4js"

Log4js.configure({
	appenders: {
		console: {
			type: "console",
		},
	},
	categories: {
		default: {
			appenders: ["console"],
			level: "all",
		},
	},
})

const logger = Log4js.getLogger("auth")

export default logger
