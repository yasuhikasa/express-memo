module.exports = {
	testEnvironment: "node"
};


// /**
//  * Jestの設定ファイル
//  *
//  * @see https://jestjs.io/docs/ja/configuration
//  */
// module.exports = {
// 	// テスト結果を詳細に表示する
// 	verbose: true,
// 	// テスト対象にしないディレクトリを指定する。
// 	testPathIgnorePatterns: [
// 		"<rootDir>/.next/",
// 		"<rootDir>/node_modules/",
// 		"<rootDir>/src/e2e-tests/",
// 	],
// 	// テストスイート実行前に読ませる必要があるフレームワーク等の設定系スクリプトファイルのパスを記述しているファイルを指定する。
// 	setupFilesAfterEnv: [
// 		"<rootDir>/setupTests.js",
// 		"<rootDir>/src/integration-tests/utils/local-storage-mock.ts",
// 	],
// 	// 正規表現からtransformerへのパスのマップを指定する。
// 	transform: {
// 		"^.+\\.(js|jsx|ts|tsx)$": "<rootDir>/node_modules/babel-jest",
// 	},
// 	// 独自で作成したモジュール名を解決するための設定。
// 	moduleNameMapper: {
// 		"^src/(.+)": "<rootDir>/src/$1",
// 	},
// 	// カバレッジを有効にするか。
// 	collectCoverage: true,
// 	// カバレッジの収集先を設定。
// 	collectCoverageFrom: ["./**/*.ts?(x)"],
// 	// カバレッジを収集しない領域を指定。
// 	coveragePathIgnorePatterns: [
// 		"./node_modules/",
// 		"./dist/",
// 		// テスト専用ファイルはカバレッジ算出対象にしない。
// 		"./src/e2e-tests/",
// 		"./src/integration-tests/utils/",
// 		"./next-env.d.ts",
// 	],
// };
