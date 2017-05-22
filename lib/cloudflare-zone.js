'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
exports.main = undefined;

let callCloudflareApi = (() => {
	var _ref = _asyncToGenerator(function* ({ method, path, query, body, auth }) {
		method = method || 'GET';

		if (method === 'GET') {
			query = query || {};
			query.per_page = 100;
		}

		let queryString = query ? '?' + _qs2.default.stringify(query) : '';
		let url = `https://api.cloudflare.com${path}${queryString}`;

		console.log(`fetching: ${url}`);

		return (0, _nodeFetch2.default)(url, {
			method,
			headers: {
				'Accept': 'application/json',
				'Content-Type': 'application/json',
				'X-Auth-Email': auth.email,
				'X-Auth-Key': auth.key
			},
			body: body && typeof body === 'string' ? body : JSON.stringify(body)
		}).then(parseResponseBody).then(handlePaging);

		function parseResponseBody(response) {
			return response.json();
		}

		function handlePaging(body) {
			if (body.errors.length > 0) {
				throw body.errors;
			}

			let result = body.result;
			let { page, total_pages } = body.result_info || {};

			if (page < total_pages) {
				let nextPage = page + 1;
				let nextQuery = Object.assign({}, query, { page: nextPage });

				return callCloudflareApi({ method, path, query: nextQuery, body, auth }).then(nextResult => [...result, ...nextResult]);
			} else {
				return result;
			}
		}
	});

	return function callCloudflareApi(_x) {
		return _ref.apply(this, arguments);
	};
})();

let getCloudflareZone = (() => {
	var _ref2 = _asyncToGenerator(function* (name, auth) {
		console.log('getCloudflareZone', name);
		return callCloudflareApi({
			method: 'GET',
			path: '/client/v4/zones',
			query: { name },
			auth: auth
		}).then(function (result) {
			return result[0];
		});
	});

	return function getCloudflareZone(_x2, _x3) {
		return _ref2.apply(this, arguments);
	};
})();

let createCloudflareZone = (() => {
	var _ref3 = _asyncToGenerator(function* (name, auth) {
		console.log('createCloudflareZone', name);
		return callCloudflareApi({
			method: 'POST',
			path: '/client/v4/zones',
			body: { name, jump_start: false },
			auth: auth
		});
	});

	return function createCloudflareZone(_x4, _x5) {
		return _ref3.apply(this, arguments);
	};
})();

let getCloudflareZoneDnsRecords = (() => {
	var _ref4 = _asyncToGenerator(function* (cloudflareZoneId, auth) {
		console.log('getCloudflareZoneDnsRecords', cloudflareZoneId);
		return callCloudflareApi({ method: 'GET', path: `/client/v4/zones/${cloudflareZoneId}/dns_records`, auth: auth });
	});

	return function getCloudflareZoneDnsRecords(_x6, _x7) {
		return _ref4.apply(this, arguments);
	};
})();

let createCloudflareZoneDnsRecord = (() => {
	var _ref5 = _asyncToGenerator(function* (cloudflareZoneId, parameters, auth) {
		console.log('createCloudflareZoneDnsRecord', cloudflareZoneId, parameters);
		return callCloudflareApi({ method: 'POST', path: `/client/v4/zones/${cloudflareZoneId}/dns_records`, body: parameters, auth: auth });
	});

	return function createCloudflareZoneDnsRecord(_x8, _x9, _x10) {
		return _ref5.apply(this, arguments);
	};
})();

let updateCloudflareZoneDnsRecord = (() => {
	var _ref6 = _asyncToGenerator(function* (cloudflareZoneId, dnsRecordId, parameters, auth) {
		console.log('updateCloudflareZoneDnsRecord', cloudflareZoneId, dnsRecordId, parameters);
		return callCloudflareApi({ method: 'PUT', path: `/client/v4/zones/${cloudflareZoneId}/dns_records/${dnsRecordId}`, body: parameters, auth: auth });
	});

	return function updateCloudflareZoneDnsRecord(_x11, _x12, _x13, _x14) {
		return _ref6.apply(this, arguments);
	};
})();

let deleteCloudflareZoneDnsRecord = (() => {
	var _ref7 = _asyncToGenerator(function* (cloudflareZoneId, dnsRecordId, auth) {
		console.log('deleteCloudflareZoneDnsRecord', cloudflareZoneId, dnsRecordId);
		return callCloudflareApi({ method: 'DELETE', path: `/client/v4/zones/${cloudflareZoneId}/dns_records/${dnsRecordId}`, auth: auth });
	});

	return function deleteCloudflareZoneDnsRecord(_x15, _x16, _x17) {
		return _ref7.apply(this, arguments);
	};
})();

// Alias records are not supported by dns-zonefile


let main = exports.main = (() => {
	var _ref8 = _asyncToGenerator(function* ({ file, authEmail, authKey, autoCreate }) {
		try {
			const auth = {
				email: authEmail,
				key: authKey
			};

			let localZone = getLocalZone(file);
			let localZoneDnsRecords = getLocalZoneDnsRecords(localZone);
			let localZoneName = getLocalZoneName(localZone);
			let cloudflareZone = yield getCloudflareZone(localZoneName, auth);

			if (!cloudflareZone) {
				if (autoCreate) {
					cloudflareZone = yield createCloudflareZone(localZoneName, auth);
				} else {
					throw new Error('Zone not found. Create it manually or specify --autoCreate');
				}
			}

			let cloudflareZoneId = cloudflareZone.id;
			let cloudflareZoneDnsRecords = yield getCloudflareZoneDnsRecords(cloudflareZoneId, auth);

			// Create
			let cloudflareZoneDnsRecordsToCreate = localZoneDnsRecords.reduce(function (cloudflareZoneDnsRecordsToCreate, localZoneDnsRecord) {
				let cloudflareZoneDnsRecord = cloudflareZoneDnsRecords.find(function (cloudflareZoneDnsRecord) {
					return compareDnsRecords(cloudflareZoneDnsRecord, localZoneDnsRecord);
				});

				if (cloudflareZoneDnsRecord === undefined) {
					cloudflareZoneDnsRecordsToCreate.push(function () {
						return createCloudflareZoneDnsRecord(cloudflareZoneId, {
							type: localZoneDnsRecord.type,
							name: localZoneDnsRecord.name,
							priority: localZoneDnsRecord.priority,
							content: localZoneDnsRecord.content,
							ttl: localZoneDnsRecord.ttl
						}, auth);
					});
				}

				return cloudflareZoneDnsRecordsToCreate;
			}, []);

			// Update
			let cloudflareZoneDnsRecordsToUpdate = cloudflareZoneDnsRecords.reduce(function (cloudflareZoneDnsRecordsToUpdate, cloudflareZoneDnsRecord) {
				let localZoneDnsRecord = localZoneDnsRecords.find(function (localZoneDnsRecord) {
					return compareDnsRecords(cloudflareZoneDnsRecord, localZoneDnsRecord);
				});

				if (localZoneDnsRecord !== undefined && (cloudflareZoneDnsRecord.content !== localZoneDnsRecord.content || cloudflareZoneDnsRecord.ttl !== localZoneDnsRecord.ttl)) {
					cloudflareZoneDnsRecordsToUpdate.push(function () {
						return updateCloudflareZoneDnsRecord(cloudflareZoneId, cloudflareZoneDnsRecord.id, {
							type: cloudflareZoneDnsRecord.type,
							name: cloudflareZoneDnsRecord.name,
							priority: localZoneDnsRecord.priority,
							content: localZoneDnsRecord.content,
							ttl: localZoneDnsRecord.ttl,
							proxied: cloudflareZoneDnsRecord.proxied
						}, auth);
					});
				}

				return cloudflareZoneDnsRecordsToUpdate;
			}, []);

			// Delete
			let cloudflareZoneDnsRecordsToDelete = cloudflareZoneDnsRecords.reduce(function (cloudflareZoneDnsRecordsToDelete, cloudflareZoneDnsRecord) {
				let localZoneDnsRecord = localZoneDnsRecords.find(function (localZoneDnsRecord) {
					return compareDnsRecords(cloudflareZoneDnsRecord, localZoneDnsRecord);
				});

				if (localZoneDnsRecord === undefined) {
					cloudflareZoneDnsRecordsToDelete.push(function () {
						return deleteCloudflareZoneDnsRecord(cloudflareZoneId, cloudflareZoneDnsRecord.id, auth);
					});
				}

				return cloudflareZoneDnsRecordsToDelete;
			}, []);

			let tasks = [...cloudflareZoneDnsRecordsToCreate, ...cloudflareZoneDnsRecordsToUpdate, ...cloudflareZoneDnsRecordsToDelete].map(function (action) {
				return action();
			});

			yield Promise.all(tasks);
		} catch (err) {
			throw err;
		}
	});

	return function main(_x18) {
		return _ref8.apply(this, arguments);
	};
})();

var _fs = require('fs');

var _fs2 = _interopRequireDefault(_fs);

var _nodeFetch = require('node-fetch');

var _nodeFetch2 = _interopRequireDefault(_nodeFetch);

var _qs = require('qs');

var _qs2 = _interopRequireDefault(_qs);

var _dnsZonefile = require('dns-zonefile');

var _dnsZonefile2 = _interopRequireDefault(_dnsZonefile);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

function stripAliasRecords(string) {
	return string.split(/[\r\n]/g).filter(function (record) {
		return record.indexOf(' ALIAS ') === -1;
	}).join('\n');
}

function removeTrailingDot(str) {
	return str.replace(/\.$/, '');
}

function fixName(name, zoneName) {
	return (name + '.' + zoneName).replace(/^@./, '').toLowerCase();
}

function getLocalZone(zoneFile) {
	let zoneFileContents = stripAliasRecords(_fs2.default.readFileSync(zoneFile, 'utf8'));
	let zone = _dnsZonefile2.default.parse(zoneFileContents);

	return zone;
}

function getLocalZoneName(zone) {
	return removeTrailingDot(zone.$origin);
}

function getLocalZoneDnsRecords(zone) {
	let dnsRecords = [];
	let zoneName = removeTrailingDot(zone.$origin);

	zone.a && zone.a.forEach(a => {
		dnsRecords.push({
			type: 'A',
			name: fixName(a.name, zoneName),
			content: a.ip,
			ttl: a.ttl
		});
	});

	zone.cname && zone.cname.forEach(cname => {
		dnsRecords.push({
			type: 'CNAME',
			name: fixName(cname.name, zoneName),
			content: removeTrailingDot(cname.alias).toLowerCase(),
			ttl: cname.ttl
		});
	});

	zone.mx && zone.mx.forEach(mx => {
		dnsRecords.push({
			type: 'MX',
			name: fixName(mx.name, zoneName),
			priority: mx.preference,
			content: removeTrailingDot(mx.host).toLowerCase(),
			ttl: mx.ttl
		});
	});

	zone.txt && zone.txt.forEach(txt => {
		dnsRecords.push({
			type: 'TXT',
			name: fixName(txt.name, zoneName),
			content: txt.txt,
			ttl: txt.ttl
		});
	});

	return dnsRecords;
}

function compareDnsRecords(a, b) {
	if (a.type === 'MX' && b.type === 'MX') {
		return a.name === b.name && a.content === b.content;
	} else {
		return a.type === b.type && a.name === b.name;
	}
}