
var http = require('http');
var querystring = require('querystring');

var JSONStream = require('JSONStream');
var through = require('through');

var destHttp = require('https');

var config = {
  'listeningPort' : 8080,
  'destination' : 'perki.pryv.me',
  'destinationPort': 443
};

// the querystring parmater with the filter
var onlyPopertiesKey = 'fields[]';


http.createServer(onRequest).listen(config.listeningPort);

function onRequest(client_req, client_res) {

  var query = querystring.parse(client_req.url.substring(client_req.url.indexOf('?')+1));

  var options = {
    hostname: config.destination,
    port: config.destinationPort,
    path: '/' + client_req.url.substr(2),
    method: 'GET'

  };

  var req = destHttp.request(options, function (res) {
    client_res.writeHead(res.statusCode, res.headers);

    var properties = query[onlyPopertiesKey];

    if (res.statusCode === 200 &&
      res.headers['content-type'] === 'application/json' &&
      properties)  {

      var first = true;
      var separator = '[';
      var transformer = through(
        function write(event) {
          for (var i = 0, len = properties.length; i < len; i++) {
            this.queue(separator + JSON.stringify((event[properties[i]] || null)));
            if (first) { first = false; separator = ','; }
          }
        },
        function end() {
          if (first){ this.queue('['); }
          this.queue(']');
          this.queue(null);
        }
      );



      res.pipe(JSONStream.parse('events.*')).pipe(transformer).pipe(client_res);


    } else { // just pipe result
      res.pipe(client_res);
    }


  });

  client_req.pipe(req);

}

console.log('started');


