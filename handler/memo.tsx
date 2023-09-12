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
