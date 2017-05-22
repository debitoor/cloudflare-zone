#!/usr/bin/env node
'use strict';

var _commandLineArgs = require('command-line-args');

var _commandLineArgs2 = _interopRequireDefault(_commandLineArgs);

var _cloudflareZone = require('../lib/cloudflare-zone');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

const optionDefinitions = [{ name: 'file', type: String }, { name: 'authEmail', type: String, defaultValue: process.env.CLOUDFLARE_AUTH_EMAIL }, { name: 'authKey', type: String, defaultValue: process.env.CLOUDFLARE_AUTH_KEY }, { name: 'autoCreate', type: Boolean, defaultValue: false }];

const options = (0, _commandLineArgs2.default)(optionDefinitions);

(0, _cloudflareZone.main)(options).catch(err => {
	console.error(err, err.stack);
	process.exit(1);
}).then(() => {
	process.exit(0);
});