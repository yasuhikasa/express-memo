/****************************************************
 * 認証サーバ 定数定義
 *****************************************************/

// URL
export const EXTERNAL_API_URL = "http://di_webapisrv:4000"
export const EXTERNAL_API_WS_URL = "ws://di_webapisrv:4000"
export const INTERNAL_API_URL = "http://di_webapisrv:5000"
export const INTERNAL_API_WS_URL = "ws://di_webapisrv:5000"
export const CONTENTS_URL = "http://di_webcontentssrv:3000"
export const CONTENTS_WS_URL = "ws://di_webapisrv:5000"
export const HMR_URL = "ws://di_webcontentssrv:3000"

// Path
// WebAPIのベースパス
export const API_BASE_PATH = "/api/v1/controllers/gw"
// ブラウザ・PDPv2クライアント用(内部用)のWebSocketのベースパス
export const CONTENTS_WS_BASE_PATH = "/api/v1/controllers/gw/websocket"
// WebAPIの外部クライアント用のWebSocketのベースパス
export const API_WS_BASE_PATH = "/api/v1/controllers/gw/websocket"
// WebAPI有効化(アクティベート)URL
export const API_ACTIVATE_PATH = API_BASE_PATH + "/activate"
// Webpackのホットモジュールリローディングのパス（開発用）
export const HMR_PATH = "/_next/webpack-hmr"

// Header
export const CERTIFICATE_OU = "certificate-ou"
