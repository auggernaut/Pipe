// Pick a secret to secure your session storage
var sessionSecret = '42';

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
     app.use(express.session({
        secret: sessionSecret
     }));
  });

  // ... but not in production
  app.configure('production', function() {
     app.use(express.static(__dirname + '/../public'));
     app.use(express.errorHandler());
     app.port = process.env.PORT;
     app.hostBaseUrl = process.argv[4] || 'http://www.getpiped.com';
     app.use(express.session({
        secret: sessionSecret
     }));
  });
};
