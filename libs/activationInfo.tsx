/****************************************************
 * WebAPIアクティベート ライブラリ
 * @module activationInfo
 *****************************************************/
import { Request } from "express"
import logger from "@/libs/logger"
import fs from "fs"
import path from "path"
import * as _ from "@/libs/util"
import * as def from "@/definitions/def"

// WebAPIアクティベート管理オブジェクト
const activationInfo = {
	status: false, // アクティベート状態
	organizationalUnitName: "", // 事業者略称
	activationFile: def.ACTIVATION_FILE_PATH, // アクティベート状態管理ファイル
	dir: def.ACTIVATION_FILE_DIR, // アクティベート状態管理ディレクトリ

	/**
   * アクティベート状態管理ファイルを読み込み
   * アクティベート状態と事業者略称を更新する。
   */
	update: function () {
		if (fs.existsSync(this.activationFile)) {
			try {
				this.organizationalUnitName = JSON.parse(fs.readFileSync(this.activationFile, "utf8")).ou
				if (this.organizationalUnitName) {
					this.status = true
				} else {
					this.organizationalUnitName = ""
					this.status = false
				}
			} catch (e) {
				this.organizationalUnitName = ""
				this.status = false
			}
		} else {
			this.organizationalUnitName = ""
			this.status = false
		}
	},

	/**
   * アクティベート有効時は「AiSEG2(A)」
   * 無効時・取得失敗時は「AiSEG2」を返す。
   * ※新GWの品名決定後に修正予定
   * @returns {string} アクティベート有効時「AiSEG2(A)」、無効時・取得失敗時は「AiSEG2」
   */
	getAiSEGName: function () {
		let AiSEGName = "AiSEG2"
		if (this.status) {
			AiSEGName += "(A)"
		}
		return AiSEGName
	},

	/**
   * 事業者名称(organizationalUnitName)を返す。
   * 異常時は3002(Can't change activation)エラーを返す。
   * @param {Request} req
   * @returns {String|Error} 正常時はorganizationalUnitNameを返す。異常時はErrorを返す。
   */
	getOrganizationalUnitName: function (req: Request) {
		// 評価用クライアント証明書の場合はorganizationalUnitNameをHX_Sとする。
		let ouName = undefined
		for (let i = 0; i < req.rawHeaders.length; i++) {
			if (req.rawHeaders[i] === def.CERTIFICATE_OU) {
				ouName = req.rawHeaders[i + 1]
			}
		}

		logger.info(`getOrganizationalUnitName ouName:${ouName}`)
		if (!ouName) {
			logger.error(`getOrganizationalUnitName No permission to change activation`)
			return { err: _.createError("No permission to change activation", 3003, 500) }
		}
		const organizationalUnitName: string = ouName === "AiSEG2 WebAPI" ? "HX_S" : ouName
		if (!organizationalUnitName) {
			logger.error(`getOrganizationalUnitName No permission to change activation`)
			return { err: _.createError("No permission to change activation", 3003, 500) }
		}
		return { err: null, organizationalUnitName: organizationalUnitName }
	},

	/**
   * 事業者名称(OU)を解析し、SDM切り替えを実施する証明書であれば
   * アクティベート状態管理ファイルのOUを書き換える。
   * @param {string} organizationalUnitName 事業者名称(OU)
   */
	writeFile: function (organizationalUnitName: any) {
		try {
			fs.writeFileSync(this.activationFile, JSON.stringify({ ou: organizationalUnitName }))
		} catch (err) {
			logger.error("Failed to change activation")
			return { err: _.createError("Failed to change activation", 3002, 500) }
		}
	},

	/**
   * アクティベート状態を変更する
   * @param {Request} req
   * @param {Boolean} activation アクティベート有効:true, 無効:false
   * @returns {undefined|Error} 正常時は何も返さない。異常時は3002,3003エラーを返す。
   */
	change: function (req: Request, activation: boolean) {
		// 保存するディレクトリがない場合は作成
		if (!fs.existsSync(this.dir)) {
			const createDirResult = makeDirectoryRecursivelySync(this.dir)
			if (createDirResult instanceof Error) {
				logger.error("Failed to change activation")
				return { err: _.createError("Failed to change activation", 3002, 500) }
			}
		}

		// クライアント証明書をパースして、事業者名称を取得。
		const { err, organizationalUnitName } = this.getOrganizationalUnitName(req)
		if (err instanceof Error) {
			return { err: _.createError("Failed to change activation", 3002) }
		}

		// ファイル書き込み・削除
		if (activation) {
			// アクティベート有効にする場合(activation=true)
			const result = this.writeFile(organizationalUnitName)
			if (result instanceof Error) {
				return { err: _.createError("Failed to change activation", 3002, 500) }
			}
			this.update()
			return { err: null }
		} else {
			// アクティベート無効にする場合(activation=false)
			if (fs.existsSync(this.activationFile)) {
				// ファイルがある場合。ない場合は何もしない
				try {
					fs.unlinkSync(this.activationFile)
					this.update()
					return { err: null }
				} catch (err) {
					logger.error("Failed to change activation")
					return { err: _.createError("Failed to change activation", 3002, 500) }
				}
			}
		}
		return { err: null }
	},
}

/**
 * ディレクトリを再帰的に作成する関数
 * @param {string} url 再帰的に作成したいディレクトリパス
 * @returns {Error} 成功時は何も返さない。失敗時はError。
 */
function makeDirectoryRecursivelySync(url: string): any {
	let dir = ""
	const list = path.normalize(url).split(path.sep)
	const max = list.length - 1

	dir = list.slice(0, max).join(path.sep)
	try {
		fs.mkdirSync(dir)
	} catch (error: any) {
		if (error.code === "ENOENT") {
			const result = makeDirectoryRecursivelySync(list.slice(0, max - 1).join(path.sep) + path.sep)
			if (result instanceof Error) return result
			fs.mkdirSync(dir)
		} else {
			return error
		}
	}
}

activationInfo.update() // モジュール読み込み時に更新

export default activationInfo