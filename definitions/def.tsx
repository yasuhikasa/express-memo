/****************************************************

APIサーバ 定数定義
*****************************************************/
// アクティベートファイルディレクトリ
export const ACTIVATION_FILE_PATH = "/tmp/activation.json"
export const ACTIVATION_FILE_DIR = "/tmp"

// APIベースパス
export const API_BASE_PATH = "/api/v1/controllers/gw"

// APIリクエストのヘッダキー
export const CERTIFICATE_OU = "certificate-ou"

// Digest認証用ハッシュデータの保存先
export const AUTH_USER_HASH_FILE = "assets/authUserHash.txt"
export const AUTH_NON_USER_HASH_FILE = "assets/authNonUserHash.txt"
export const CONTENTS_WS_TOKEN_HASH_FILE = "assets/contentsWsTokenHash.txt"

// MQDB・Redisキー
export const TIMEOUT_10 = 10
export const TIMEOUT_20 = 20
export const MQDB = "msgQueDataBase"
export const NOTIFY_MQDB_MEMBER_KEY = "ntf/" + MQDB
export const SOURCE_MODULE = "ApiServer"
export const NOTIFY_KEY = "ntf/" + SOURCE_MODULE
export const REQ_KEY = "req/" + MQDB
export const RES_KEY = "res/" + MQDB + "/" + SOURCE_MODULE + "/"

