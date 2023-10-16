# GETの例

#!/usr/bin/env python3
import threading
from concurrent.futures import ThreadPoolExecutor
import requests
from func.mqtt_comm import mqttc_event, mqttc_func
from func.serverapl import trtb_event, pdpcif_event, trth_event

def send_get_request_to_express():
    url = "http://express_server_address:endpoint"
    headers = {
        "Accept": "application/json"
    }

    response = requests.get(url, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        return None

def initialize():
    # ... 既存のコード ...

def main():
    # ... 既存のコード ...
    response_data = send_get_request_to_express()
    if response_data:
        print(response_data)

if __name__ == '__main__':
    main()



# PUTの例

#!/usr/bin/env python3
import threading
from concurrent.futures import ThreadPoolExecutor
import requests
from func.mqtt_comm import mqttc_event, mqttc_func
from func.serverapl import trtb_event, pdpcif_event, trth_event

def send_put_request_to_express(data):
    url = "http://express_server_address:endpoint"
    headers = {
        "Content-Type": "application/json"
    }

    response = requests.put(url, json=data, headers=headers)

    if response.status_code == 200:
        return response.json()
    else:
        print(f"Error: {response.status_code}")
        return None

def initialize():
    # ... 既存のコード ...

def main():
    # ... 既存のコード ...
    data_to_update = {
        "key": "new_value",
        # ... 他のデータ ...
    }

    response = send_put_request_to_express(data_to_update)
    if response:
        print(response)

if __name__ == '__main__':
    main()


