const JSONStream = require('JSONStream');
const through = require('through');
const http = require('http');
const querystring = require('querystring');
const config = require('./config');
const destHttp = require(config.get('pryv:http'));


// -- internal -- //

// the querystring parameter with the filter
let FIELDS_PROPERTY_NAME = 'fields[]';


let supportedFormats = {
  html : {
    separator : '</td><td>',
    headers: false,
    contentType: 'text/html',
    wrapping: ['<html><body><table border=1>', '</table></body></html>'],  // header and trailer
    block: ['<tr><td>', '</td></tr>', '\n']  // header, trailer and separator of each block (event)
  },
  csv : {
    separator : ';',
    headers: false,
    contentType: 'text/csv',
    wrapping: ['', ''],  // header and trailer of the all document
    block: ['', '', '\n']  // header, trailer and separator of each block (event)
  },
  json : {
    separator : ',',
    headers: false,
    contentType: 'application/json',
    wrapping: ['[', ']'],  // header and trailer of the all document
    block: ['', '', ',']  // header, trailer and separator of each block (event)
  },
  jsonMap : {
    separator : ',',
    headers: false,
    contentType: 'application/json',
    wrapping: ['[', ']'],  // header and trailer of the all document
    block: ['[',']', ',']  // header, trailer and separator of each block (event)
  }
};




// -- launching server -- //
http.createServer(onRequest).listen(config.get('server:port'));

function onRequest(client_req, client_res) {

  const query = querystring.parse(client_req.url.substring(client_req.url.indexOf('?') + 1));
  const username = client_req.headers.host.split('.')[0];

  const path = client_req.url.substring(0,client_req.url.indexOf('?'));
  let resource = path.split('/')[1];

  const printPath = username + path;

  let options = {
    hostname: config.get('pryv:hostname'),
    port: config.get('pryv:port'),
    path: '/' + username + '/' + client_req.url.substr(2),
    method: 'GET'
  };

  // id dev mode

  if (! config.get('pryv:hostname')) {
    let secondSlash = client_req.url.indexOf('/', 1);
    options.hostname = client_req.url.substring(1, secondSlash);
    options.path = client_req.url.substring(secondSlash);
    resource = path.split('/')[2];
  }

  // remove 'x' in front of resource name
  resource = resource.substring(1);

  // escape favicon
  if (options.path === '/favicon.ico') {
    client_res.writeHead(404);
    client_res.end('');
    return;
  }

  let req = destHttp.request(options, function (res) {

    const startRequestTimestamp = new Date().getTime();

    let properties = query[FIELDS_PROPERTY_NAME];
    if (! Array.isArray(properties)) { properties = [properties]; }

    if (res.statusCode === 200 &&
      res.headers['content-type'] === 'application/json' && properties) {

      // retrieve format if exists, otherwise use default
      let settings = Object.create(supportedFormats[config.get('service:defaultFormat')]);
      if (query.format) {
        let formatParam = query.format.split(' ');
        if (supportedFormats[formatParam[0]]) {
          settings = Object.create(supportedFormats[formatParam[0]]);
        }

        if (formatParam[1] === 'head') {
          settings.includeFieldNames = true;
        }
      }

      res.headers['content-type'] = settings.contentType; // override headers
      client_res.writeHead(res.statusCode, res.headers);

      let first = true;
      let transformer = through(
        function write(apiObject) {
          if (first) {  // head wrapping
            this.queue(settings.wrapping[0]);
            first = false;

            if (settings.includeFieldNames) {
              this.queue(settings.block[0]);
              for (let j = 0, len = properties.length; j < len; j++) {
                this.queue((j > 0 ? settings.separator : '') + '"' + properties[j] + '"');
              }
              this.queue(settings.block[1] + settings.block[2]);
            }

            this.queue(settings.block[0]);
          } else {
            this.queue(settings.block[2] + settings.block[0]);
          }

          for (let i = 0, len2 = properties.length; i < len2; i++) {
            this.queue((i > 0 ? settings.separator : '') +
              JSON.stringify((apiObject[properties[i]] || null)));
          }
          this.queue(settings.block[1]);
        },
        function end() {
          if (first) { this.queue(settings.wrapping[0]); } // head wrapping
          this.queue(settings.wrapping[1]);
          this.queue(null);
          console.log(new Date() + ' - ' + printPath + ' - ' + (new Date().getTime() - startRequestTimestamp) + ' ms');
        }
      );

      res.pipe(JSONStream.parse(resource + '.*')).pipe(transformer).pipe(client_res);


    } else { // just pipe result
      client_res.writeHead(res.statusCode, res.headers);
      res.pipe(client_res);
    }
  });

  req.on('error', function (error) {
    console.log(error);
    client_res.writeHead(500);
    client_res.end('Internal error');
  });

  client_req.pipe(req);
}

console.log('started with config', config.get());


