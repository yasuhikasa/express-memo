// /**
//  * エアコンプロパティ取得APIの応答情報生成
//  * @method convertGetAirconPropertiesRes
//  * @param {AirconPropertyResponse} obj Redisから取得した応答データ
//  * @returns {object} API応答オブジェクト
//  */
// const convertGetAirconPropertiesRes = (obj: AirconPropertyResponse) => {
//   const convertedObj: any = {};

//   // statusプロパティが存在する場合はそのまま代入する
//   if (obj.status !== undefined) {
//     convertedObj.status = obj.status;
//   }

//   // aircon_property_scope_listが存在する場合
//   if (Array.isArray(obj.aircon_property_scope_list)) {
//     convertedObj.AirconPropertyScopeList = obj.aircon_property_scope_list.map((scope) => {
//       const convertedScope: any = {};

//       // キー名をAPI応答用に置き換える
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
