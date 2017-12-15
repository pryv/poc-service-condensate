var JSONStream = require('JSONStream');
var through = require('through');
var http = require('http');
var querystring = require('querystring');

// ---- settings ---- //




var config = {
  listeningPort : 9000,
  destination : 'core',
  destinationPort: 9000,
  destHttp: 'http',
  defaultFormat: 'html'
};

if (process.argv[2] === 'dev') {
  config = {
    listeningPort : 8080,
    destination : false,
    destinationPort: 443,
    destHttp: 'https',
    defaultFormat: 'html'
  };
}

var destHttp = require(config.destHttp);


// -- internal -- //

// the querystring parameter with the filter
var onlyPopertiesKey = 'fields[]';


var formats = {
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
http.createServer(onRequest).listen(config.listeningPort);

function onRequest(client_req, client_res) {

  var query = querystring.parse(client_req.url.substring(client_req.url.indexOf('?') + 1));

  var options = {
    hostname: config.destination,
    port: config.destinationPort,
    path: '/' + client_req.url.substr(2),
    method: 'GET'
  };

  // id dev mode

  if (! config.destination) {
    var i = client_req.url.indexOf('/', 1);
    options.hostname = client_req.url.substring(1, i);
    options.path = client_req.url.substring(i);
  }


  // escape favicon
  if (options.path === '/favicon.ico') {
    client_res.writeHead(404);
    client_res.end('');
    return;
  }

  var req = destHttp.request(options, function (res) {

    var properties = query[onlyPopertiesKey];

    if (res.statusCode === 200 &&
      res.headers['content-type'] === 'application/json' && properties) {


      var settings = formats[config.defaultFormat];
      if (query.format) {
        var sformat = query.format.split(' ');
        if (formats[sformat[0]]) {
          settings = formats[sformat[0]];

        }

        if (sformat[1] === 'head') {
          settings.headers = true;
        }
      }


      res.headers['content-type'] = settings.contentType; // override headers
      client_res.writeHead(res.statusCode, res.headers);

      var first = true;
      var transformer = through(
        function write(event) {
          if (first) {  // head wrapping
            this.queue(settings.wrapping[0]);
            first = false;

            if (settings.headers) {
              this.queue(settings.block[0]);
              for (var j = 0, len = properties.length; j < len; j++) {
                this.queue((j > 0 ? settings.separator : '') + '"' + properties[j] + '"');
              }
              this.queue(settings.block[1] + settings.block[2]);
            }

            this.queue(settings.block[0]);
          } else {
            this.queue(settings.block[2] + settings.block[0]);
          }

          for (var i = 0, len2 = properties.length; i < len2; i++) {
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

console.log('started with config', config);


