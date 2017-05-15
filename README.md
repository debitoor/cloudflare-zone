# cloudflare-zone
Syncronizes a [zone bind file](https://en.wikipedia.org/wiki/Zone_file) with [Cloudflare](https://cloudflare.com/).

[![Build Status](https://travis-ci.org/debitoor/cloudflare-zone.svg?branch=master)](https://travis-ci.org/debitoor/cloudflare-zone)
[![NPM Version](https://img.shields.io/npm/v/cloudflare-zone.svg)](https://www.npmjs.com/package/cloudflare-zone)

## Install
``` bash
$ npm install cloudflare-zone --save
```

## Usage

``` bash
$ cloudflare-zone --file ./debitoor.com.bind --authEmail ... --authKey ...
```

Defaults to environment variables `CLOUDFLARE_AUTH_EMAIL` and `CLOUDFLARE_AUTH_KEY`.

## License
MIT License

Copyright (c) 2017 [Debitoor](https://debitoor.com/)

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.