/**
 * @license
 * Copyright (C) Pryv https://pryv.com
 * This file is part of Pryv.io and released under BSD-Clause-3 License
 * Refer to LICENSE file
 */
const nconf = require('nconf');
const fs = require('fs');

module.exports = nconf;

nconf.argv();

let configFile = '';

if (typeof(nconf.get('config')) !== 'undefined') {
  configFile = nconf.get('config');
}

if (fs.existsSync(configFile)) {
  configFile = fs.realpathSync(configFile);
  console.log('Using custom config file: ' + configFile);
  nconf.file({ file: configFile});
} else {
  if (configFile) {
    console.log('Cannot find custom config file: ' + configFile);
  }
}

if (process.env.NODE_ENV === 'dev') {
  nconf.overrides({
    server: {
      port: 8080
    },
    pryv: {
      hostname: false,
      port: 443,
      http: 'https'
    },
    service: {
      defaultFormat: 'html'
    }
  });
}

// Set default values
nconf.defaults({
  server: {
    port : 9000
  },
  pryv: {
    hostname : 'core',
    port: 9000,
    http: 'http',
  },
  service: {
    defaultFormat: 'html'
  }
});