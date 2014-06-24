var crc = require('crc');

module.exports.dispatch = function(uid, connectors) {
	var index = Math.abs(crc.crc32(uid.substring(0,19))) % connectors.length;
	return connectors[index];
};