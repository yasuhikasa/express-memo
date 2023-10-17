export function getAirconProperties(req, res) {
	const { request_type, source_module, request_id } = req.body;
  
	if (request_type === 'getAllAirconPropScope' && source_module === 'ApiServer') {
		// 実際のデータ取得処理
		// 以下はダミー
		const data = {/* 実際のデータ */};
		res.json(data);
	} else {
		res.status(400).json({ message: 'Invalid request' });
	}
}