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



// redis.blpop(KEY, 0, (_err, data) 
// blpopはRedisのコマンドの一つで、Blocking Left POPの略です。このコマンドは、リストからの要素の取得と、必要に応じてブロック（待機）する機能を提供します。

// blpopの主な動作は次のとおりです：

// 指定されたキーに関連するリストが空でない場合、リストの左端（最初）の要素を取得して削除します。
// リストが空の場合、新しい要素が追加されるまでブロックします。ブロックの期間はタイムアウト値によって指定されます。
// 関数redis.blpopの引数について説明します：

// KEY: 監視するRedisのリストのキー名です。
// 0: タイムアウト値（秒）。この場合、0が指定されているので、新しい要素がリストに追加されるまで無限にブロックします。非ゼロの値を指定すると、その秒数だけブロックした後にタイムアウトします。
// コールバック関数: blpopの操作が完了したとき（要素を取得したときやタイムアウトしたとき）に呼び出される関数。この関数は2つの引数を受け取ります：
// _err: エラーオブジェクト（エラーが発生した場合）。
// data: 取得された要素。リストが空でタイムアウトした場合、この値はnullになります。
// 上記のコードでは、blpopが新しいデータを検出するたびにコールバック関数が呼び出されます。そして、そのデータを処理し、WebSocketを介して通知を送信しています。




// その２

/**
* Redisの状態変化通知キーを監視し、フィールドが追加されたらWebSocket通知を発信する
*/
// const wsNotify = () => {
//   const KEY = def.NOTIFY_KEY;
//   redis.blpop(KEY, 0, (_err, data) => {
//       if (data) {
//           const dataObj = JSON.parse(String(data[1]));
//           logger.debug("BLPOP key: " + KEY + ", field: " + JSON.stringify(dataObj));
//           // 認証済みの場合にWebSocket送信
//           wsSend(dataObj);
//       }
//       // イベントループが完了した後、再度 wsNotify を実行
//       setImmediate(wsNotify);
//   });
// }

// wsNotify();




// async/awaitのコードとsetImmediateを使用したコードの主な違いは、関数の実行の仕方とそのタイミングです。

// async/awaitのコード:

// while (true)によって、無限ループを作成します。
// await new Promiseの部分で、redis.blpopの結果を待っています。
// redis.blpopがデータを受信すると、resolve()が呼ばれ、次のループのイテレーションに進みます。
// この方法は、イベントループをブロックしない非同期ループを作成します。Node.jsの非同期処理とイベントループの性質により、他のタスクがイベントキューにある場合、それらが実行されるのを待って、次のループのイテレーションに進みます。
// setImmediateのコード:

// redis.blpopの結果を待ちます。
// データが受信されたら、その後でsetImmediate(wsNotify)を呼び出して、次のredis.blpopの呼び出しをスケジュールします。
// setImmediateは、現在のイベントループイテレーションの後に指定された関数を実行するようにスケジュールします。
// この方法も、イベントループをブロックせずに継続的にredis.blpopを実行します。
// 両方の違い:

// 実装の視点から見れば、async/awaitのコードは、明示的なループ構造を使用しています。一方、setImmediateのコードは、関数の呼び出しをスケジュールすることで、暗黙的なループ構造を使用しています。
// 動作の視点から見れば、両方の方法は似たような動作をします。しかし、setImmediateは、他のタスクがイベントキューにある場合、それらが完了するのを確実に待ってから次の操作を実行します。






