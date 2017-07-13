import fs from 'fs';
import nodeFetch from 'node-fetch';
import qs from 'qs';
import dnsZonefile from 'dns-zonefile';

async function callCloudflareApi ({method, path, query, body, auth}) {
	method = method || 'GET';
	const reqBody = body;
	if (method === 'GET') {
		query = query || {};
		query.per_page = 100;
	}

	let queryString = query ? '?' + qs.stringify(query) : '';
	let url = `https://api.cloudflare.com${path}${queryString}`;

	console.log(`fetching: ${url}`);

	return nodeFetch(url, {
		method,
		headers: {
			'Accept': 'application/json',
			'Content-Type': 'application/json',
			'X-Auth-Email': auth.email,
			'X-Auth-Key': auth.key
		},
		body: body && typeof body === 'string' ? body : JSON.stringify(body)
	})
	.then(parseResponseBody)
	.then(handlePaging);

	function parseResponseBody (response) {
		return response.json();
	}

	function handlePaging (body) {
		if (body.errors.length > 0) {
			let error = new Error('Cloudflare API Error');
			error.body = body;
			error.bodyJSON = JSON.stringify(body, null, 4);
			error.args = {method, path, query, reqBody};
			error.argsJSON = JSON.stringify({method, path, query, reqBody}, null, 4);

			throw error;
		}

		let result = body.result;
		let {page, total_pages} = body.result_info || {};

		if (page < total_pages) {
			let nextPage = page + 1;
			let nextQuery = Object.assign({}, query, {page: nextPage});

			return callCloudflareApi({method, path, query: nextQuery, body, auth})
				.then(nextResult => [...result, ...nextResult]);
		} else {
			return result;
		}
	}
}

async function getCloudflareZone (name, auth) {
	console.log('getCloudflareZone', name);
	return callCloudflareApi({
		method: 'GET',
		path: '/client/v4/zones',
		query: {name},
		auth: auth
	}).then(result => result[0]);
}

async function createCloudflareZone (name, auth) {
	console.log('createCloudflareZone', name);
	return callCloudflareApi({
		method: 'POST',
		path: '/client/v4/zones',
		body: {name, jump_start: false},
		auth: auth
	});
}

async function getCloudflareZoneDnsRecords (cloudflareZoneId, auth) {
	console.log('getCloudflareZoneDnsRecords', cloudflareZoneId);
	return callCloudflareApi({method: 'GET', path: `/client/v4/zones/${cloudflareZoneId}/dns_records`, auth: auth});
}

async function createCloudflareZoneDnsRecord (cloudflareZoneId, parameters, auth) {
	console.log('createCloudflareZoneDnsRecord', cloudflareZoneId, parameters);
	return callCloudflareApi({method: 'POST', path: `/client/v4/zones/${cloudflareZoneId}/dns_records`, body: parameters, auth: auth});
}

async function updateCloudflareZoneDnsRecord (cloudflareZoneId, dnsRecordId, parameters, auth) {
	console.log('updateCloudflareZoneDnsRecord', cloudflareZoneId, dnsRecordId, parameters);
	return callCloudflareApi({method: 'PUT', path: `/client/v4/zones/${cloudflareZoneId}/dns_records/${dnsRecordId}`, body: parameters, auth: auth});
}

async function deleteCloudflareZoneDnsRecord (cloudflareZoneId, dnsRecordId, auth) {
	console.log('deleteCloudflareZoneDnsRecord', cloudflareZoneId, dnsRecordId);
	return callCloudflareApi({method: 'DELETE', path: `/client/v4/zones/${cloudflareZoneId}/dns_records/${dnsRecordId}`, auth: auth});
}

// Alias records are not supported by dns-zonefile
function stripAliasRecords(string) {
	return string
		.split(/[\r\n]/g)
		.filter(function(record) {
			return record.indexOf(' ALIAS ') === -1;
		})
		.join('\n');
}

function removeTrailingDot (str) {
	return str.replace(/\.$/, '');
}

function fixName (name, zoneName) {
	return (name + '.' + zoneName).replace(/^@./, '').toLowerCase();
}

function getLocalZone (zoneFile) {
	let zoneFileContents = stripAliasRecords(fs.readFileSync(zoneFile, 'utf8'));
	let zone = dnsZonefile.parse(zoneFileContents);

	return zone;
}

function getLocalZoneName (zone) {
	return removeTrailingDot(zone.$origin);
}

function getLocalZoneDnsRecords (zone) {
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

export async function main ({file, authEmail, authKey, autoCreate}) {
	try {
		const auth = {
			email: authEmail,
			key: authKey
		};

		let localZone = getLocalZone(file);
		let localZoneDnsRecords = getLocalZoneDnsRecords(localZone);
		let localZoneName = getLocalZoneName(localZone);
		let cloudflareZone = await getCloudflareZone(localZoneName, auth);

		if (!cloudflareZone) {
			if (autoCreate) {
				cloudflareZone = await createCloudflareZone(localZoneName, auth);
			} else {
				throw new Error('Zone not found. Create it manually or specify --autoCreate');
			}
		}

		let cloudflareZoneId = cloudflareZone.id;
		let cloudflareZoneDnsRecords = await getCloudflareZoneDnsRecords(cloudflareZoneId, auth);

		// Create
		let cloudflareZoneDnsRecordsToCreate = localZoneDnsRecords.reduce((cloudflareZoneDnsRecordsToCreate, localZoneDnsRecord) => {
			let cloudflareZoneDnsRecord = cloudflareZoneDnsRecords.find(cloudflareZoneDnsRecord => compareDnsRecords(cloudflareZoneDnsRecord, localZoneDnsRecord));

			if (cloudflareZoneDnsRecord === undefined) {
				cloudflareZoneDnsRecordsToCreate.push(() => createCloudflareZoneDnsRecord(cloudflareZoneId, {
					type: localZoneDnsRecord.type,
					name: localZoneDnsRecord.name,
					priority: localZoneDnsRecord.priority,
					content: localZoneDnsRecord.content,
					ttl: localZoneDnsRecord.ttl
				}, auth));
			}

			return cloudflareZoneDnsRecordsToCreate;
		}, []);

		// Update
		let cloudflareZoneDnsRecordsToUpdate = cloudflareZoneDnsRecords.reduce((cloudflareZoneDnsRecordsToUpdate, cloudflareZoneDnsRecord) => {
			let localZoneDnsRecord = localZoneDnsRecords.find(localZoneDnsRecord => compareDnsRecords(cloudflareZoneDnsRecord, localZoneDnsRecord));

			if (localZoneDnsRecord !== undefined && (cloudflareZoneDnsRecord.content !== localZoneDnsRecord.content || cloudflareZoneDnsRecord.ttl !== localZoneDnsRecord.ttl)) {
				cloudflareZoneDnsRecordsToUpdate.push(() => updateCloudflareZoneDnsRecord(cloudflareZoneId, cloudflareZoneDnsRecord.id, {
					type: cloudflareZoneDnsRecord.type,
					name: cloudflareZoneDnsRecord.name,
					priority: localZoneDnsRecord.priority,
					content: localZoneDnsRecord.content,
					ttl: localZoneDnsRecord.ttl,
					proxied: cloudflareZoneDnsRecord.proxied
				}, auth));
			}

			return cloudflareZoneDnsRecordsToUpdate;
		}, []);

		// Delete
		let cloudflareZoneDnsRecordsToDelete = cloudflareZoneDnsRecords.reduce((cloudflareZoneDnsRecordsToDelete, cloudflareZoneDnsRecord) => {
			let localZoneDnsRecord = localZoneDnsRecords.find(localZoneDnsRecord => compareDnsRecords(cloudflareZoneDnsRecord, localZoneDnsRecord));

			if (localZoneDnsRecord === undefined) {
				cloudflareZoneDnsRecordsToDelete.push(() => deleteCloudflareZoneDnsRecord(cloudflareZoneId, cloudflareZoneDnsRecord.id, auth));
			}

			return cloudflareZoneDnsRecordsToDelete;
		}, []);

		let tasks = [
			...cloudflareZoneDnsRecordsToCreate,
			...cloudflareZoneDnsRecordsToUpdate,
			...cloudflareZoneDnsRecordsToDelete
		].map(action => action());

		await Promise.all(tasks);
	} catch (err){
		throw err;
	}
}
