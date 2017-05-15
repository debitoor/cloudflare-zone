const mochaEslint = require('mocha-eslint');

mochaEslint([
	'./src/**/*.js',
	'./test/**/*.js'
]);