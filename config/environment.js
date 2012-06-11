// Pick a secret to secure your session storage
var sessionSecret = '420000';
var Singly = require('../lib/singly');
var DB = require('../lib/db');

module.exports = function(app, express) {
  // Setup for the express web framework
  app.configure(function() {
     app.use(express.logger());
     app.use(express.bodyParser());
     app.use(express.cookieParser());
     
     //app.use(app.router);
  });

  // We want exceptions and stracktraces in development
  app.configure('development', function() {
    app.use(express.static(__dirname + '/../public'));
    app.use(express.errorHandler({
      dumpExceptions: true,
      showStack: true
    }));
    app.port = 8043;
    app.hostBaseUrl = process.argv[4] || 'http://localhost:' + app.port;
    app.apiBaseUrl = 'https://api.singly.com';
    app.clientId = process.argv[2] || 'a1ff7be4edd14f5d7ad918e0ac12aed0';
    app.clientSecret = process.argv[3] || '67dd7798cced0614ba88ebad7386f6b4';
    app.singly = new Singly(app.clientId, app.clientSecret, 'http://localhost:8043/callback');
    app.pipeDB = new DB('localhost', 'pipe');
    app.usedServices = ['facebook', 'twitter', 'linkedIn', 'gcontacts'];
 
    app.use(express.session({
      secret: sessionSecret
    }));
  });

  // ... but not in production
  app.configure('production', function() {
     app.use(express.static(__dirname + '/../public'));
     app.use(express.errorHandler());
     app.port = process.env.PORT;
     app.hostBaseUrl = process.argv[4] || 'http://www.pipeapp.co';
     app.use(express.session({
        secret: sessionSecret
     }));
  });
};
