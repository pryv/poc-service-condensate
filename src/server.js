const JSONStream = require('JSONStream');
const through = require('through');
const http = require('http');
const querystring = require('querystring');
const config = require('./config');
const destHttp = require(config.get('pryv:http'));


// -- internal -- //

// the querystring parameter with the filter
let onlyPropertiesKey = 'fields[]';


let formats = {
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

  let query = querystring.parse(client_req.url.substring(client_req.url.indexOf('?') + 1));

  let options = {
    hostname: config.get('pryv:hostname'),
    port: config.get('pryv:port'),
    path: '/' + client_req.url.substr(2),
    method: 'GET'
  };

  // id dev mode

  if (! config.get('pryv:hostname')) {
    let i = client_req.url.indexOf('/', 1);
    options.hostname = client_req.url.substring(1, i);
    options.path = client_req.url.substring(i);
  }


  // escape favicon
  if (options.path === '/favicon.ico') {
    client_res.writeHead(404);
    client_res.end('');
    return;
  }

  let req = destHttp.request(options, function (res) {

    let properties = query[onlyPropertiesKey];
    if (! Array.isArray(properties)) { properties = [properties]; }


    if (res.statusCode === 200 &&
      res.headers['content-type'] === 'application/json' && properties) {


      let settings = formats[config.get('service:defaultFormat')];
      if (query.format) {
        let sformat = query.format.split(' ');
        if (formats[sformat[0]]) {
          settings = formats[sformat[0]];

        }

        if (sformat[1] === 'head') {
          settings.headers = true;
        }
      }


      res.headers['content-type'] = settings.contentType; // override headers
      client_res.writeHead(res.statusCode, res.headers);

      let first = true;
      let transformer = through(
        function write(event) {
          if (first) {  // head wrapping
            this.queue(settings.wrapping[0]);
            first = false;

            if (settings.headers) {
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
              JSON.stringify((event[properties[i]] || null)));
          }
          this.queue(settings.block[1]);
        },
        function end() {
          if (first) { this.queue(settings.wrapping[0]); } // head wrapping
          this.queue(settings.wrapping[1]);
          this.queue(null);
        }
      );


      res.pipe(JSONStream.parse('events.*')).pipe(transformer).pipe(client_res);


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


