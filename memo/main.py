#!/usr/bin/env python3
import threading
from concurrent.futures import ThreadPoolExecutor
from func.mqtt_comm import mqttc_event, mqttc_func
from func.serverapl import trtb_event, pdpcif_event, trth_event

def initialize() -> None:
"""プロセス初期化処理
サブスレッドを起動する

Parameters
----------
なし

Returns
-------
なし

Notes
-----
なし

"""

# MQTT通信部用永続スレッド
mqtt_comm_thread = threading.Thread(target=mqttc_event.mqttc_event_thread)
mqtt_comm_thread.daemon = True
mqtt_comm_thread.start()

# Trait送信部用永続スレッド
trait_send_thread = threading.Thread(target=trtb_event.trtb_event_thread)
trait_send_thread.daemon = True
trait_send_thread.start()

# サーバ送信処理実行部用永続スレッド
server_send_exec_thread = threading.Thread(target=pdpcif_event.pdpcif_event_thread)
server_send_exec_thread.daemon = True
server_send_exec_thread.start()

return
def main() -> None:
"""メイン処理

Parameters
----------
なし

Returns
-------
なし

Notes
-----
なし

"""
# サブスレッドの起動、キューの共有設定
initialize()

with ThreadPoolExecutor(max_workers=68) as executor:
    while True:
        recv_queue = mqttc_func.MQTTReceiveQueueData()
        try:
            trait_binary = recv_queue.deque(1.0)
        except:
            continue
        # サーバ受信処理実行
        executor.submit(trth_event.trth_event_server_recv, trait_binary)
if name == 'main':
main()