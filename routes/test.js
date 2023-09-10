import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';

const app = express();

app.use(bodyParser.json());
app.use(cors());

app.post('/api/airConditioner/properties/def', (req, res) => {
  // リクエストボディを検証する
  if (
    req.body.request_type === 'getAllAirconPropScope' &&
    req.body.source_module === 'ApiServer' &&
    typeof req.body.request_id === 'number'
  ) {
    // テスト用のレスポンスデータ
    const responseData = {
      status: 0,
      aircon_property_scope_list: [
        {
          detailed_device_type: "0x0430000B00000000",
          modes: [
            {
              operation_mode: 1,
              temperature_min: 16,
              temperature_max: 30,
              temperature_setting: true,
              air_flow_level_setting: true,
              humidication_mode: false
            },
            // ...（他のモードについても同様に記述）...
          ],
          air_flow_level: {
            air_flow_level_min: 1,
            air_flow_level_max: 8
          },
          flow_direction_V_setting: false,
          power_saving_operation_setting: false
        },
        // ...（他のdetailed_device_typeについても同様に記述）...
      ]
    };

    res.json(responseData);
  } else {
    res.status(400).json({ error: 'Invalid request' });
  }
});

const port = 3001;
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}/`);
});
