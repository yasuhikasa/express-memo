export function getAirconProperties(req, res) {
	const { request_type, source_module, request_id } = req.body;
  
	if (request_type === 'getAllAirconPropScope' && source_module === 'ApiServer'  && typeof request_id === 'number') {
		// Stub data
		const stubData = {/* ここにスタブデータ */};
		res.json(stubData);
	} else {
		res.status(400).json({ message: 'Invalid request for stub' });
	}
}