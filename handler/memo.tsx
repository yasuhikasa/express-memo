// // 入力データの型定義
// interface AirconPropertyResponse {
//   status: number;
//   aircon_property_scope_list: Array<{
//     detailed_device_type: string;
//     modes: Array<{
//       operation_mode: number;
//       temperature_min?: number;
//       temperature_max?: number;
//       temperature_setting?: boolean;
//       air_flow_level_setting?: boolean;
//       humidication_mode?: boolean;
//     }>;
//     air_flow_level: {
//       air_flow_level_min: number;
//       air_flow_level_max: number;
//     };
//     flow_direction_V: {
//       flow_direction_V_min: number;
//       flow_direction_V_max: number;
//     };
//     flow_direction_V_setting: boolean;
//     power_saving_operation_setting: boolean;
//   }>;
// }

// // 出力データの型定義
// interface ConvertedAirconProperties {
//   status?: number;
//   AirconPropertyScopeList?: Array<{
//     DetailedDeviceType: string;
//     Modes: Array<{
//       OperationMode: number;
//       TemperatureMin?: number;
//       TemperatureMax?: number;
//       TemperatureSetting?: boolean;
//       AirFlowLevelSetting?: boolean;
//       HumidicationMode?: boolean;
//     }>;
//     AirFlowLevel: {
//       AirFlowLevelMin: number;
//       AirFlowLevelMax: number;
//     };
//     FlowDirectionV: {
//       FlowDirectionVMin: number;
//       FlowDirectionVMax: number;
//     };
//     FlowDirectionVSetting: boolean;
//     PowerSavingOperationSetting: boolean;
//   }>;
// }

// // 関数の定義
// const convertGetAirconPropertiesRes = (obj: AirconPropertyResponse): ConvertedAirconProperties => {
//   const convertedObj: ConvertedAirconProperties = {};

//   if (obj.status !== undefined) {
//     convertedObj.status = obj.status;
//   }

//   if (Array.isArray(obj.aircon_property_scope_list)) {
//     convertedObj.AirconPropertyScopeList = obj.aircon_property_scope_list.map((scope) => {
//       const convertedScope: any = {};
//       convertedScope.DetailedDeviceType = scope.detailed_device_type;

//       if (Array.isArray(scope.modes)) {
//         convertedScope.Modes = scope.modes.map((mode) => {
//           const convertedMode: any = {};
//           convertedMode.OperationMode = mode.operation_mode;
//           convertedMode.TemperatureMin = mode.temperature_min;
//           convertedMode.TemperatureMax = mode.temperature_max;
//           convertedMode.TemperatureSetting = mode.temperature_setting;
//           convertedMode.AirFlowLevelSetting = mode.air_flow_level_setting;
//           convertedMode.HumidicationMode = mode.humidication_mode;

//           return convertedMode;
//         });
//       }

//       if (scope.air_flow_level) {
//         convertedScope.AirFlowLevel = {
//           AirFlowLevelMin: scope.air_flow_level.air_flow_level_min,
//           AirFlowLevelMax: scope.air_flow_level.air_flow_level_max,
//         };
//       }

//       if (scope.flow_direction_V) {
//         convertedScope.FlowDirectionV = {
//           FlowDirectionVMin: scope.flow_direction_V.flow_direction_V_min,
//           FlowDirectionVMax: scope.flow_direction_V.flow_direction_V_max,
//         };
//       }

//       convertedScope.FlowDirectionVSetting = scope.flow_direction_V_setting;
//       convertedScope.PowerSavingOperationSetting = scope.power_saving_operation_setting;

//       return convertedScope;
//     });
//   }

//   return convertedObj;
// };








// // getの例
// export const getAirconProperties: RequestHandler = async (req, res, next) => {
//   try {
//     const redis = ioRedis.getRedisInstance();
//     const reqField = {
//       reqType: "getAirconProperties",
//       srcModule: def.SOURCE_MODULE,
//       reqId: _.createReqNumber(),
//     };

//     await redis.rpush(def.REQ_KEY, JSON.stringify(reqField));

//     const resKey = def.RES_KEY + reqField.reqId;
//     const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20);

//     if (!data) {
//       throw _.createError("Data is NULL", 4002, 500);
//     }

//     const dataObj = JSON.parse(data);

//     if (dataObj.status !== 0) {
//       throw _.createError("Failed to get", 4003, 500);
//     }

//     const result = convertGetAirconPropertiesRes(dataObj);
//     if (!result) {
//       throw _.createError("Invalid data format", 4004, 500);
//     }

//     _.wrapResJson(req, res, result);

//   } catch (err) {
//     if (err instanceof ApiError) {
//       next(err);
//     } else {
//       next(_.createError(`${err}`, 4001, 500));
//     }
//   }
// };





// // postの例
// export const postDevice: RequestHandler = async (req, res, next) => {
//   try {
//   const redis = ioRedis.getRedisInstance();
  
//   // 要求生成
//   const reqField = {
//       reqType: "postDevice",  // これが新しいデバイスを登録する指示になる
//       deviceData: req.body,　// 前提として、リクエストボディにデバイス情報が含まれている
//       srcModule: def.SOURCE_MODULE,
//       reqId: _.createReqNumber(),
//   };
  
//   // 要求をPUSH
//   await redis.rpush(def.REQ_KEY, JSON.stringify(reqField));
  
//   // 応答をPOP
//   const resKey = def.RES_KEY + reqField.reqId;
//   const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20);
  
//   // データの処理、エラーハンドリング等（略）
  
//   // 正常応答
//   .wrapResJson(req, res, data);
//   } catch (err) {
//   // エラーハンドリング（略）
//   }
//   };

//   req.bodyはHTTPリクエストのボディ部分を取得するもので、その内容は通常JSON形式でクライアントから送られてきます。
//   このdeviceData: req.bodyの部分で、そのJSONデータをdeviceDataフィールドに設定しています。

//   ミドルウェア側では、このdeviceDataフィールドを解析し、データベースに対する適切な操作（挿入、更新、削除など）を行います。
//   具体的な操作はreqTypeフィールドに依存する場合が多く、このフィールドによって何をすべきかが指示されます。
  
//   例えば、reqTypeが"registerDevice"であれば、新規デバイス登録が行われ、
//   reqTypeが"updateDevice"であれば、既存のデバイス情報の更新が行われる、といった具体的な処理がミドルウェア側で定義されています。



// // putの例
// export const updateDevice: RequestHandler = async (req, res, next) => {
//   try {
//       const redis = ioRedis.getRedisInstance();
      
//       // デバイス更新の要求を生成
//       const reqField = {
//           reqType: "updateDevice",
//           deviceId: req.params.id,  // 前提として、URLパラメータにデバイスIDが含まれている
//           updateData: req.body,  // リクエストボディに更新するデータが含まれている
//           srcModule: def.SOURCE_MODULE,
//           reqId: _.createReqNumber(),
//       };
      
//       // 要求をPUSH
//       await redis.rpush(def.REQ_KEY, JSON.stringify(reqField));
      
//       // 応答をPOP
//       const resKey = def.RES_KEY + reqField.reqId;
//       const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20);
      
//       // データの処理、エラーハンドリング等（略）
      
//       // 正常応答
//       res.status(200).json(data);  // 200 OK
//   } catch (err) {
//       // エラーハンドリング（略）
//   }
// };




// // deleteの例
// export const deleteDevice: RequestHandler = async (req, res, next) => {
//   try {
//       const redis = ioRedis.getRedisInstance();

//       // デバイス削除の要求を生成
//       const reqField = {
//           reqType: "deleteDevice",
//           deviceId: req.params.id,  // 前提として、URLパラメータにデバイスIDが含まれている
//           srcModule: def.SOURCE_MODULE,
//           reqId: _.createReqNumber(),
//       };
      
//       // 要求をPUSH
//       await redis.rpush(def.REQ_KEY, JSON.stringify(reqField));
      
//       // 応答をPOP
//       const resKey = def.RES_KEY + reqField.reqId;
//       const data = await ioRedis.blpopWithTimeout(resKey, def.TIMEOUT_20);
      
//       // データの処理、エラーハンドリング等（略）
      
//       // 正常応答
//       res.status(204).send();  // 204 No Content
//   } catch (err) {
//       // エラーハンドリング（略）
//   }
// };
