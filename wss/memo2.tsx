// Node.jsはシングルスレッドのため、while無限ループを使用すると他の操作がブロックされてしまいます。

// redis.blpopはブロッキング操作で、キーに新しいデータが追加されるまで待機します。したがって、実際には再帰的に呼び出す必要はありません。

// ただし、懸念として再帰的に呼び出すことによるスタックの消費があるため、再帰を使わずにasync/awaitとwhileループを組み合わせて、イベントループがブロックされることなくblpopを繰り返し実行することができます。

// 以下のように実装できます：



// const wsNotify = async () => {
//   const KEY = def.NOTIFY_KEY;
  
//   while (true) {
//       await new Promise(resolve => {
//           redis.blpop(KEY, 0, (_err, data) => {
//               if (data) {
//                   const dataObj = JSON.parse(String(data[1]));
//                   logger.debug("BLPOP key: " + KEY + ", field: " + JSON.stringify(dataObj));
//                   // 認証済みの場合にWebSocket送信
//                   wsSend(dataObj);
//               }
//               resolve();
//           });
//       });
//   }
// }

// wsNotify();

// この方法で、blpopは常に待機していますが、再帰呼び出しを使わないため、スタックの問題は発生しません。また、async/awaitとPromiseを使用することで、イベントループがブロックされることもありません。





