#!/usr/bin/env node
import commandLineArgs from 'command-line-args';
import { main } from '../lib/cloudflare-zone';

const optionDefinitions = [
	{ name: 'file', type: String },
	{ name: 'authEmail', type: String, defaultValue: process.env.CLOUDFLARE_AUTH_EMAIL },
	{ name: 'authKey', type: String, defaultValue: process.env.CLOUDFLARE_AUTH_KEY },
	{ name: 'autoCreate', type: Boolean, defaultValue: false }
];

const options = commandLineArgs(optionDefinitions);

main(options)
	.catch(err => {
		console.error(err, err.stack);
		process.exit(1);
	}).then(() => {
		process.exit(0);
	});
