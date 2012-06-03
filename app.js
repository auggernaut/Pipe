var express = require('express');
var querystring = require('querystring');
var request = require('request');
var sprintf = require('sprintf').sprintf;
var OAuth2 = require('oauth').OAuth2;
var mongoose = require('mongoose');

// Create an HTTP server
var app = express.createServer();
var dbconn = {};
require('./config/environment.js')(app, dbconn, express);
mongoose.connect('mongodb://localhost/pipe_development');

var apiBaseUrl = process.argv[5] || 'https://api.singly.com';

// Your client ID and secret from http://dev.singly.com/apps
var clientId = process.argv[2] || 'a1ff7be4edd14f5d7ad918e0ac12aed0';
var clientSecret = process.argv[3] || '67dd7798cced0614ba88ebad7386f6b4';

var usedServices = [
   'Facebook',
   'foursquare',
   'Instagram',
   'Tumblr',
   'Twitter',
   'LinkedIn',
   'FitBit',
   'Email'
];

var oa = new OAuth2(clientId, clientSecret, apiBaseUrl);

// A convenience method that takes care of adding the access token to requests
function getProtectedResource(path, session, callback) {
   oa.getProtectedResource(apiBaseUrl + path, session.access_token, callback);
}

// Given the name of a service and the array of profiles, return a link to that
// service that's styled appropriately (i.e. show a link or a checkmark).
function getLink(prettyName, profiles, token) {
   var service = prettyName.toLowerCase();

   // If the user has a profile authorized for this service
   if (profiles && profiles[service] !== undefined) {
      // Return a unicode checkmark so that the user doesn't try to authorize it again
      return sprintf('<span class="check">&#10003;</span> <a href="%s/services/%s?access_token=%s">%s</a>', apiBaseUrl, service, token, prettyName);
   }

   // This flow is documented here: http://dev.singly.com/authorization
   var queryString = querystring.stringify({
      client_id: clientId,
      redirect_uri: sprintf('%s/callback', app.hostBaseUrl),
      service: service
   });

   return sprintf('<a href="%s/oauth/authorize?%s">%s</a>',
      apiBaseUrl,
      queryString,
      prettyName);
}

// Database models
var Schema = mongoose.Schema,
  ObjectId = Schema.ObjectId;

var UserSchema = new Schema({
  username          : { type: String, require: true, index: {unique: true}},
  name              : { type: String, require: true },
  password          : { type: String, require: true },
  email             : { type: String, require: true, index: {unique: true}},
  email_confirmed   : { type: Boolean, require: true, default: false },
  created_at        : { type: Date, default: Date.now },
  modified_at       : { type: Date, default: Date.now },
  deleted_at        : { type: Date, default: null },
  last_login        : { type: Date, default: null }
});

UserSchema.pre('save', function(next) {
  this.set('modified_at', Date.now);
  next();
});

mongoose.model('User', UserSchema);
var User = mongoose.model('User', UserSchema);

// Use ejs instead of jade because HTML is easy
app.set('view engine', 'ejs');

app.get('/', function(req, res) {
  if (process.env.PRELAUNCH == "true") {
   res.writeHead(200, {"Content-Type": "text/html"});
   res.write('<!DOCTYPE html><html><head><title>Pipe</title></head><body><div rel="OPKQI452" class="lrdiscoverwidget" data-logo="on" data-background="on" data-share-url="www.getpiped.com" data-css=""></div><script type="text/javascript" src="http://launchrock-ignition.s3.amazonaws.com/ignition.1.1.js"></script></body></html>;');
   res.end();
  } else {
   var i;
   var services = [];

   // For each service in usedServices, get a link to authorize it
   for (i = 0; i < usedServices.length; i++) {
      services.push({
         name: usedServices[i],
         link: getLink(usedServices[i], req.session.profiles, req.session.access_token)
      });
   }

   // Render out views/index.ejs, passing in the array of links and the session
   res.render('index', {
      services: services,
      session: req.session
   });
  }
});

app.get('/signup', function(req, res) {
});

app.post('/signup', function(req, res) {
  res.writeHead(200, {"Content-Type": "Text/Html"});
  var user = new User(req.body);
  user.save(function(err) {
    if (err !== null) {
      console.log(typeof err);
      console.log(err);
      res.write(JSON.stringify({"error": "There was an error in processing the user."}));
      res.end();
    } else {
      res.write(JSON.stringify({"success": "Success!"}));
      res.end();
    }
  });
});

app.get('/callback', function(req, res) {
   var data = {
      client_id: clientId,
      client_secret: clientSecret,
      code: req.param('code')
   };

   request.post({
      uri: sprintf('%s/oauth/access_token', apiBaseUrl),
      body: querystring.stringify(data),
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded'
      }
   }, function (err, resp, body) {
      try {
         body = JSON.parse(body);
      } catch(parseErr) {
         return res.send(parseErr, 500);
      }

      req.session.access_token = body.access_token;

      getProtectedResource('/profiles', req.session, function(err, profilesBody) {
         try {
            profilesBody = JSON.parse(profilesBody);
         } catch(parseErr) {
            return res.send(parseErr, 500);
         }

         req.session.profiles = profilesBody;

         res.redirect('/');
      });
   });
});

app.get('/googlea06f2c993be83d06.html', function(req, res) {
  res.writeHead(200, {"Content-Type": "text/html"});
  res.write("google-site-verification: googlea06f2c993be83d06.html");
  res.end();
});

app.listen(app.port);

console.log(sprintf('Listening at %s using API endpoint %s.', app.hostBaseUrl, apiBaseUrl));
