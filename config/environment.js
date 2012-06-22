// Pick a secret to secure your session storage
var sessionSecret = '420000';
var Singly = require('../lib/singly');
var DB = require('../lib/db');

module.exports = function(app, express) {


  app.dynamicHelpers({ messages: require('express-messages') });

  // Setup for the express web framework
  app.configure(function() {
    app.use(express.logger());
    app.use(express.bodyParser());
    app.use(express.cookieParser());

    app.apiBaseUrl = 'https://api.singly.com';
    app.contactEmail = 'augustin@datacosmos.com';
    app.sendGridLogin = 'auggernaut';
    app.sendGridPassword = 'P@lmtr33';
    app.notifySecret = "129asd128usojqbffavcjh312iuhasda89j3bfjn";
    app.clientId = process.argv[2] || 'a1ff7be4edd14f5d7ad918e0ac12aed0';
    app.clientSecret = process.argv[3] || '67dd7798cced0614ba88ebad7386f6b4';

    app.usedServices = ['facebook', 'twitter', 'linkedin', 'gcontacts'];

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
    app.singly = new Singly(app.clientId, app.clientSecret, app.hostBaseUrl + '/callback');
    app.pipeDB = new DB('mongodb://localhost/pipe');
 
    app.use(express.session({
      secret: sessionSecret
    }));
  });

  // ... but not in production
  app.configure('production', function() {
    app.use(express.static(__dirname + '/../public'));
    app.use(express.errorHandler());
    app.port = process.env.PORT;
    app.hostBaseUrl = process.argv[4] || 'http://pipe.jit.su';
    app.use(express.session({
      secret: sessionSecret
    }));

    app.singly = new Singly(app.clientId, app.clientSecret, app.hostBaseUrl + '/callback');
    app.pipeDB = new DB('mongodb://nodejitsu:b42144c3cadbc8b5ea6d8da3293e7897@staff.mongohq.com:10065/nodejitsudb132551633288');

  });
};
