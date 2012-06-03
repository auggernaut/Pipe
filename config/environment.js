// Pick a secret to secure your session storage
var sessionSecret = '42';

module.exports = function(app, dbconn, express) {
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
     dbconn.host = 'localhost';
     dbconn.port = 5432;
     dbconn.name = 'pipe_development';
     dbconn.user = 'pipe_development';
     dbconn.password = '04efjw0328j038j2f';
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
     var database_url = process.env.SHARED_DATABASE_URL;
     database_url = database_url.split('postgres://');
     var result = database_url[1].split(':');
     dbconn.user = result[0];
     result = result[1].split('@');
     dbconn.password = result[0];
     result = result[1].split('/');
     dbconn.host = result[0];
     dbconn.name = result[1];
     dbconn.port = 5432;
  });
};
