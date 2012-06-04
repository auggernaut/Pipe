var express = require('express');
var querystring = require('querystring');
var request = require('request');
var sprintf = require('sprintf').sprintf;
var OAuth2 = require('oauth').OAuth2;


// Create an HTTP server
var app = express.createServer();
require('./config/environment.js')(app, express);


var apiBaseUrl = process.argv[5] || 'https://api.singly.com';

// Your client ID and secret from http://dev.singly.com/apps
var clientId = process.argv[2] || 'a1ff7be4edd14f5d7ad918e0ac12aed0';
var clientSecret = process.argv[3] || '67dd7798cced0614ba88ebad7386f6b4';

var usedServices = [
   //'Facebook',
   //'foursquare',
   //'Instagram',
   //'Tumblr',
   //'Twitter',
   'LinkedIn',
   //'FitBit',
   //'GContacts'
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
      return sprintf('<a href="%s/services/%s?access_token=%s" class="activated"><img style="margin-right:10px;" src="img/social_networks/%s_blue.png" alt="Pipe" width="46" height="46" /></a>', apiBaseUrl, service, token, prettyName.toLowerCase());
   }

   // This flow is documented here: http://dev.singly.com/authorization
   var queryString = querystring.stringify({
      client_id: clientId,
      redirect_uri: sprintf('%s/callback', app.hostBaseUrl),
      service: service
   });

   return sprintf('<a href="%s/oauth/authorize?flag=dm&%s" class="authorize"><img style="margin-right:10px;" src="img/social_networks/%s_grey.png" alt="Pipe" width="46" height="46" /></a>',
      apiBaseUrl,
      queryString,
      prettyName.toLowerCase());
}

function getTwitterUser(screen_name, session, res){

   //Get twitter user details
   getProtectedResource('/by/contact/twitter/' + screen_name, session, function(err, item) {
      console.log("HERE GOT: %s", item);
      var contact = JSON.parse(item)[0]; 
      
      var person = { 
         "id" : contact.idr ? contact.idr : "",
         "name" : contact.data ? (contact.data.name ? contact.data.name : "") : "",
         "username" : contact.data ? ((contact.data.screen_name) ? contact.data.screen_name : "") : "",
         "description" : contact.data ? ((contact.data.description) ? contact.data.description : "") : "",
         "location" : contact.data ? (contact.data.location ? contact.data.location : "") : "",
         "status" : contact.data ? (contact.data.status && contact.data.status.text) : "",
         "photo" : contact.data ? (contact.data.profile_image_url ? contact.data.profile_image_url : "") : "" };

      console.log("twitter - " + JSON.stringify(person));
      
      res.write(JSON.stringify(person));
      res.end();
   });
}


function getFacebookUser(id, session, res){
   //Get facebook user details
   getProtectedResource('/by/contact/facebook/' + id, session, function(err, item) {
      var contact = JSON.parse(item)[0];
      
      var person = { 
         "id" : contact.idr ? contact.idr : "",
         "name" : contact.data ? (contact.data.name ? contact.data.name : "") : "",
         "username" : contact.data ? (contact.data.username ? contact.data.username : "") : "",
         "description" : contact.data ? ((contact.data.bio) ? contact.data.bio : contact.data.quotes ? contact.data.quotes : "") : "",
         "location" : contact.data ? (contact.data.location && contact.data.location.name) : "",
         //"status" : (rStatus.data.message) ? rStatus.data.message : rStatus.data.story,
         "photo" : contact.oembed.thumbnail_url,
         "profession" : contact.data ? (contact.data.work && contact.data.work[0].employer.name) : "" };
      
      console.log("facebook --" + person);

      res.write(JSON.stringify(person));
      res.end();
      
   });
}

function getAccountIds(contacts)
{

   var pLinkedIn;
   var pTwitter;
   var pFacebook;
   var pGContacts;

   if(contacts.length > 1) {
      for(var i = 0; i < contacts.length; i++){
         if(contacts[i].idr.indexOf("twitter") != -1){
            pTwitter = contacts[i].data.id;
         }
         else if(contacts[i].idr.indexOf("facebook") != -1){
            pFacebook = contacts[i].data.id
         }
         else if(contacts[i].idr.indexOf("gcontacts") != -1)
            pGContacts = contacts[i].data.gd$email && contacts[i].data.gd$email[0].address;
         //console.log(a[a.length]);
      }
   }

   return [pLinkedIn, pTwitter, pFacebook, pGContacts];
}

/*
function getGoogleUser(id){
   getProtectedResource('/by/contact/gcontacts/' + id, req.session, function(err, item) {
      var contact = JSON.parse(item)[0]; 
      //console.log("google: " + contact); 
      var person = { 
         "id" : contact.idr,
         "name" : contact.data.name,
         "username" : contact.data.username,
         "description" : (contact.data.bio) ? contact.data.bio : contact.data.quotes,
         "location" : contact.data.location && contact.data.location.name,
         "status" : (rStatus.data.message) ? rStatus.data.message : rStatus.data.story,
         "photo" : contact.oembed.thumbnail_url,
         "profession" : contact.data.work && contact.data.work[0].employer.name };
      
      return person;
      
   });

}
*/

// Use ejs instead of jade because HTML is easy
app.set('view engine', 'ejs');

app.get('/user', function (req, res) {
  var users = {};
  //res.writeHead(200, {"Content-Type": "text/html"});
  res.write(JSON.stringify(users));
  res.end();
});

app.get('/findFriends', function(req, res) {

//IF DEVELOPMENT
   if (process.env.NODE_ENV != 'production')
   {
      console.log(req.session);
      /*if(!req.session.pIndex)
         req.session.pIndex = 0;
      else
         req.session.pIndex = req.session.pIndex + 1;
      */

      var myFriends = ["lQEya8Lw1c"];

      getProtectedResource('/by/contact/linkedin/' + myFriends[Math.floor(Math.random()*myFriends.length)], req.session, function(err, lin) {
         if (lin === undefined) {
            res.redirect('auth');
            return;
         }
         console.log(lin);
         //var a = [];

         pLinkedIn = JSON.parse(lin)[0];

         var name =  pLinkedIn.data.firstName + "%20" + pLinkedIn.data.lastName;
         
         getProtectedResource('/types/contacts?q=' + name, req.session, function(err, contacts){
            console.log(contacts);
            var ids = getAccountIds(JSON.parse(contacts));  
            ids[0] = pLinkedIn;          
            res.write(JSON.stringify(ids));
            res.end(); 
            
         });
      });
   }
   else
   {
      getProtectedResource('/services/linkedin/connections?offset='+Math.floor(Math.random()), req.session, function(err, lin){
         //console.log(statuses); 
         
         var a = [];
         if (lin == undefined)
            return;
         var c = JSON.parse(lin);

         var linContact = a[0] = c[Math.floor(Math.random()*c.length)];
         
         var name = (linContact && linContact.data) ? (linContact.data.firstName ? linContact.data.firstName : "") + "%20" + (linContact.data.lastName ? linContact.data.lastName : "") : "";
         
         getProtectedResource('/types/contacts?q=' + name, req.session, function(err, contacts){

            var ids = getAccountIds(JSON.parse(contacts));
            ids[0] = linContact;            
            res.write(JSON.stringify(ids));
            res.end(); 
         });
      });
   }
});

app.get('/getFriend', function(req, res) {

   var service = req.param('service');
   var id = req.param('id');

   console.log("------" + service + "-------" + id);

   if(service.indexOf("twitter") != -1){
      getTwitterUser(id, req.session, res);
   }
   else if(service.indexOf("facebook") != -1){
      getFacebookUser(id, req.session, res);
   }
   //else if(service.indexOf("linkedin") != -1){
   //   res.write(JSON.stringify(getLinkedInUser(id, req.session)));
   //   res.end(); 
   //}
      //console.log(a);
});




app.get('/', function(req, res) {
   if (process.env.PRELAUNCH) {
      res.writeHead(200, {"Content-Type": "Text/Html"});
      res.write("<!DOCTYPE html><html><head><title>Pipe</title></head><body><div rel=\"OPKQI452\" class=\"lrdiscoverwidget\" data-logo=\"on\" data-background=\"on\" data-share-url=\"www.pipeapp.co\" data-css=\"\"></div><script type=\"text/javascript\" src=\"http://launchrock-ignition.s3.amazonaws.com/ignition.1.1.js\"></script>;");
      res.write("<footer><script type=\"text/javascript\">" +

         "var _gaq = _gaq || [];" +
         "_gaq.push(['_setAccount', 'UA-32357176-1']);" +
         "_gaq.push(['_trackPageview']);" +

         "(function() {" +
         "   var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;" +
         "   ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';" +
         "   var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);" +
         "})();" +

         "</script></footer></body></html>");
      res.end();
      return;
   } else {
      res.render('splash', {session: req.session});
   }
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

         res.redirect('/auth');
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
