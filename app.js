var express = require('express');
var querystring = require('querystring');
var request = require('request');
var sprintf = require('sprintf').sprintf;
var OAuth2 = require('oauth').OAuth2;
var sessionSecret = '42';

//var Sequelize = require('sequelize');

// Create an HTTP server
var app = express.createServer();
app.configure(function() {
     app.use(express.logger());
     app.use(express.bodyParser());
     app.use(express.cookieParser());
     app.use(express.session({
        secret: sessionSecret
     }));
     app.use(app.router);
      app.use(express.static(__dirname + '/public'));
      app.port = 8043;
     app.hostBaseUrl = process.argv[4] || 'http://localhost:' + app.port;
     
  });

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
   console.log(path);
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


// Use ejs instead of jade because HTML is easy
app.set('view engine', 'ejs');

app.get('/user', function (req, res) {
  var users = {};
  res.writeHead(200, {"Content-Type": "text/html"});
  res.write(JSON.stringify(users));
  res.end();
});


app.get('/friend', function(req, res) {

   getProtectedResource('/types/statuses_feed', req.session, function(err, statuses){
      //console.log(statuses); 
      
      var rStatus = JSON.parse(statuses)[Math.floor(Math.random()*20)];
      console.log(rStatus.idr);  

      /***** TODO *******/
      // GET DETAILS OF FRIEND FROM ALL SERVICES

      if(rStatus.idr.indexOf("twitter") != -1)
      //is a twitter status
      {
         //Get twitter user details
         getProtectedResource('/by/contact/twitter/' + rStatus.data.user.screen_name, req.session, function(err, item) {
            
            var contact = JSON.parse(item)[0]; 
            console.log(contact);
            var person = { 
               "id" : contact.idr,
               "name" : contact.data.name,
               "username" : contact.data.screen_name,
               "description" : contact.data.description,
               "location" : contact.data.location,
               "status" : contact.data.status.text,
               "photo" : contact.data.profile_image_url }
            
            console.log(person);

            res.write(JSON.stringify(person));
            res.end();

         });

         //Search contacts for other accounts -- TODO
         //singly.get('/types/contacts?q=' + rStatus.data.name, null, function(item){
         //   console.log(item);
         //});

      }
      else if(rStatus.idr.indexOf("facebook") != -1)
      //is a facebook status
      {
         //Get facebook user details
         getProtectedResource('/by/contact/facebook/' + rStatus.data.from.id, req.session, function(err, item) {
            console.log(item); 
            var contact = JSON.parse(item)[0]; 
            
            var person = { 
               "id" : contact.idr,
               "name" : contact.data.name,
               "username" : contact.data.username,
               "description" : (contact.data.bio) ? contact.data.bio : contact.data.quotes,
               "location" : contact.data.location.name,
               "status" : (rStatus.data.message) ? rStatus.data.message : rStatus.data.story,
               "photo" : contact.oembed.thumbnail_url,
               "profession" : contact.data.work && contact.data.work[0].employer.name }
            
            console.log(person);

            res.write(JSON.stringify(person));
            res.end();

         });               
        
      }
   });
   
});


app.get('/', function(req, res) {
   res.render('splash', {session: req.session});
});
   
app.get('/auth', function(req, res){
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
   res.render('auth', {
      services: services,
      session: req.session
   });
});

app.get('/pipe', function(req, res) {
   res.render('app', {session: req.session});
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

         res.redirect('/pipe');
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
