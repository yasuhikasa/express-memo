import { isStub } from "@/libs/util";
import * as stub from "@/stub/stubHandlers/airconPropertiesStubHandler";
import * as production from "@/production/productionAirconPropertiesHandler";

const router = Router();

router.post(
	"/devices/airConditioner/properties/def",
	isStub ? stub.getAirconProperties : production.getAirconProperties
);

export default router;