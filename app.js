var express = require('express');
var querystring = require('querystring');
var request = require('request');
var sprintf = require('sprintf').sprintf;
var cookies = require('cookies').express;
var SendGrid = require('sendgrid-nodejs').SendGrid;
var path = require('path')
   , templateDir    = path.join(__dirname, 'templates')
   , emailTemplates = require('email-templates');


// Create an HTTP server
var app = express.createServer();
require('./config/environment.js')(app, express);
app.set('view engine', 'ejs');
app.use( cookies () );

var sendgrid = new SendGrid(app.sendGridLogin, app.sendGridPassword);
app.pipeDB.load();


//*************************************
//STATIC PAGES
//*************************************
app.get('/', function (req, res) {

   //Skip splash page is user has been here before
   if(req.cookies && req.cookies.get("access_token"))
   //Returning user
      res.redirect('/auth');
   else
   //New User
      res.render('splash', {session: req.session});
});

app.get('/about', function (req, res) {
   res.render('about', {session: req.session});
});

app.get('/privacy', function (req, res) {
   res.render('privacy', {session: req.session});
});


//*************************************
//CONTACT
//*************************************
app.get('/contact', function (req, res) {
   res.render('contact', {session: req.session});
});

app.post('/contact', function(req, res) {

   var email = req.body.email;
   var message = req.body.message;

   var SendGrid = require('sendgrid-nodejs').SendGrid;
   var sendgrid = new SendGrid(app.sendGridLogin, app.sendGridPassword);
   sendgrid.send({
      to: app.contactEmail,
      from: email,
      subject: "User Message from Pipe",
      text: message
   }, function(success, message) {
      if (!success) {
         console.log(message);
         req.flash("error", "Error sending email!");
      } else 
         req.flash("info", "Email message sent!");
         
      res.redirect('/contact');
      
   });

});



//*************************************
//AUTH
//*************************************
app.get('/auth', function (req, res){ 

   var access_token = req.cookies.get("access_token");
   var email = "Enter your email";

   if(access_token){
   //User already has an access_token

      if(!req.session.access_token)
         req.session.access_token = access_token;

      console.log("RETURNING ACCESS TOKEN: " + access_token);

      if(!req.session.profiles){
      //Profiles have not been populated

         app.singly.apiCall('/profiles', req.session, function(err, profilesBody) {
      
            try { console.log("Profiles: " + JSON.stringify(profilesBody)); }
            catch(parseErr) { return res.send(parseErr, 500); }

            req.session.profiles = profilesBody;

            return res.redirect('/auth');
         });

      } else {
      //Profiles have been populated

         //Check if any service is not authed
         var i , missing = false;
         for (i = 0; i < app.usedServices.length; i++) {
            if(req.session.profiles[app.usedServices[i]] == undefined)
               missing = true;
         }

         if(missing){
         //Not all services authed

            //TODO pull from USER Account
            var email = unescape(req.session.profiles["gcontacts"]);

            res.render('auth', {
               services: getAuthServices(req),
               email: email,
               session: req.session
            });
         } else
         //All services already authed
            res.redirect('/pipe');
      }
      
   }
   else{
   //No access token in cookie

      //Render Connect to Services links
      res.render('auth', {
         services: getAuthServices(req),
         email: email,
         session: req.session
      });
   }
});

app.post('/auth', function(req, res) {
   if (!req.session.access_token) return res.redirect('/auth');

   var email = req.body.email;
   var subscribed = req.body.sendEmail;

   if(!subscribed)
      subscribed = "no";

   //console.log("AUTH POST BODY: " + JSON.stringify(req.body));

   //BUILD USER
   var user = { 
         sId: req.session.profiles.id
       , profiles: req.session.profiles 
       , access_token: req.session.access_token
       , subscribed: subscribed
       , email: email
   };
   console.log("USER: " + JSON.stringify(user));

   //SAVE USER TO DB
   app.pipeDB.saveUser(user);


   //STORE USERID IN SESSION
   //if (!req.session.userId)
   //   req.session.userId = req.session.profiles.id;

   console.log("___USERID____" + req.session.profiles.id);


   res.redirect('/pipe');
   
});


//*************************************
//CALLBACK
//*************************************
app.get('/callback', function (req, res) {

   //console.log(req);
   app.singly.getAccessToken(req.param('code'), function(err, access_token) {

      req.session.access_token = access_token;
      res.cookies.set( "access_token", access_token );

      console.log("NEW ACCESS TOKEN: " + access_token);

      //REPOPULATE PROFILES
      app.singly.apiCall('/profiles', req.session, function(err, profilesBody) {
      
         try { console.log("Profiles: " + JSON.stringify(profilesBody)); }
         catch(parseErr) { return res.send(parseErr, 500); }

         req.session.profiles = profilesBody;

         return res.redirect('/auth');
      });
   });
});


//*************************************
//PIPE
//*************************************
app.get('/pipe', function (req, res) {
   //AUTH CHECK
   if (!req.session.access_token) return res.redirect('/auth');

   //console.log("req.session.profiles.id: " + req.session.profiles.id)

   app.pipeDB.hasChums(req.session.profiles.id, function(chum){

      if(chum){
      //Chums already loaded for user

         //LOAD NEXT CHUM
         app.pipeDB.getNextChum(req.session.profiles.id, function(chum){

            if(!chum){
            //Already curated all Chums

               //Redirect to thank you for Beta testing page:
               res.redirect('/thank-you');
            }
            else {
            //There's a next Chum

               //TODO: Download contact info again (for updates)

               //RETURN CHUM
               res.render('pipe', {
                  session: req.session
                  , chum: chum
               });
            }
         });
      }
      else {
      //No chums loaded for user
      
         //GET CONTACTS FROM SINGLY, MERGE, SAVE TO DB
         processContacts(req.session, function(chum){

            //RETURN CHUM
            res.render('pipe', {
                  session: req.session
                  , chum: chum
               });
         });

      }

   });

   
});

//*************************************
//CONNECT
//*************************************
app.get('/connect', function (req, res) {
   //AUTH CHECK
   if (!req.session.access_token) return res.redirect('/auth');

   //GET CONNECTED PROFILES FROM DB
   app.pipeDB.getChumById(req.query["id"], function(chum){
      console.log("___GOT CHUM___" + JSON.stringify(chum));

      //app.pipeDB.updateChum(chum, { surfaced : true });

      //RETURN CONNECTION OPTIONS
      res.render('connect', {
         session: req.session
         , chum : chum
      });

   });

});


app.post('/connect', function(req, res) {
   if (!req.session.access_token) return res.redirect('/auth');

   //console.log(req.body);

   //Populate connect record
   var connect = new app.pipeDB.Connect();
   connect.chumId = req.body.chumId;
   connect.profileIdr = req.body.profileIdr;
   connect.profileUserId = req.body.profileUserId;
   connect.subject = req.body.subject;
   connect.message = req.body.body;   

   var sType = "" 
      , sMessage = ""
      , sDetails = "";

   //CHECK SEND METHOD
   if(connect.profileIdr.indexOf("gcontacts") != -1){
   //GCONTACTS - SEND EMAIL
      console.log("SENDING EMAIL");

      //Get email from idr
      var email = connect.profileIdr.split('contact:')[1].split('@gcontacts')[0];

      console.log("TO: " + email);

      sendgrid.send({
         to: 'augman@gmail.com',
         //connect.profileUserId
         from: 'augustin@datacosmos.com',
         //unescape(req.session.profiles["gcontacts"])
         subject: connect.subject,
         text: connect.message
      }, function(success, details) {
         if (!success) {
            sType = "error";
            sMessage = "Error sending email!";
         } else {
            sType = "info";
            sMessage = "Email successfully sent!";
         }
         sDetails = success + " -- " + details;

         buildConnect(connect, sType, sMessage, sDetails);

         req.flash(sType, sMessage);
         res.redirect('/pipe');
      });

   }
   else if(connect.profileIdr.indexOf("linkedin") != -1){
   //LINKEDIN - SEND MESSAGE THROUGH PROXY
      console.log("SENDING LINKEDIN MESSAGE");

      app.singly.apiCallPost('/proxy/linkedin/people/~/mailbox', req.session, {
               "recipients": {
                  "values": [
                     {
                        "person": {
                           "_path": "/people/" + connect.profileUserId,
                           //+ "asdac@#$@12efdca",
                           //connect.profileUserId,
                        }
                     }
                  ]
               },
               "subject": connect.subject,
               "body": connect.message
            }, 
            function(err, json){   
               console.log("ERR" + err + " JSON " + JSON.stringify(json));
               if(json){
                  sType = "error";
                  sMessage = "Error sending LinkedIn message!";  
               } else {
                  sType = "info";
                  sMessage = "LinkedIn message sent!";
               }
               sDetails = err + " -- " + JSON.stringify(json);

               buildConnect(connect, sType, sMessage, sDetails);

               req.flash(sType, sMessage);
               res.redirect('/pipe');
            }
         );
   }
   else if(connect.profileIdr.indexOf("twitter") != -1){
   //TWITTER - SEND MESSAGE THROUGH PROXY
      console.log("SENDING TWITTER MESSAGE");

      app.singly.apiCallPost('/proxy/twitter/direct_messages/new.json', req.session, {
               "screen_name": connect.profileUserId,
               "text": connect.message
            }, 
            function(err, json){   
               if(json){
                  sType = "error";
                  sMessage = "Error sending Twitter message!";  
               } else {
                  sType = "info";
                  sMessage = "Twitter message sent!";
               }
               sDetails = err + " -- " + JSON.stringify(json);

               buildConnect(connect, sType, sMessage, sDetails);

               req.flash(sType, sMessage);
               res.redirect('/pipe');

            }
         );
   }
   else {
   //NONE OF THE ABOVE - IDR CORRUPT
      sType = "error";
      sMessage = "An unexpected error occurred."
      sDetails = "twitter, gcontacts, or linkedin not in idr";

      buildConnect(connect, sType, sMessage, sDetails);

      req.flash(sType, sMessage);
      res.redirect('/pipe');
   }

});


//*************************************
//SKIP
//*************************************
app.get('/skip', function (req, res) {
   //AUTH CHECK
   if (!req.session.access_token) return res.redirect('/auth');

   //GET CONNECTED PROFILES FROM DB
   app.pipeDB.getChumById(req.query["id"], function(chum){
      console.log("___GOT CHUM___" + JSON.stringify(chum));

      //RETURN CONNECTION OPTIONS
      res.render('skip', {
         session: req.session
         , chum : chum
      });

   });

});

app.post('/skip', function(req, res) {
   //AUTH CHECK
   if (!req.session.access_token) return res.redirect('/auth');

   var skip = new app.pipeDB.Skip();
   //var chumIdr = req.body.chumIdr;
   //skip.chum = app.pipeDB.Chum.findOne({"idr": req.param('chumIdr', null)});
   skip.chumId = req.body.chumId;
   var howoften = req.body.howOften;
   if(howoften == "every")
      skip.schedule = req.body.everyOptions;
   else
      skip.schedule = howoften;

   skip.note = req.body.note ? req.body.note : "";

   console.log("SKIP ADDED__ " + JSON.stringify(skip));
   //console.log(req.body);
   //skip.save();


   app.pipeDB.addSkip(skip, function(err){   
      if(err)
         req.flash("error", "Error saving skip preference!");
      else {
         req.flash("info", "Skip preference saved.");
         app.pipeDB.updateChum(skip.chumId, { surfaced : true });
      }
      
      res.redirect('/pipe');
   });

});

//*************************************
//USER
//*************************************
app.get('/user', function (req, res) {
   if (!req.session.access_token) return res.redirect('/auth');

   //GET USER FROM DB
   //RETURN USER
   var users = {};

   res.render('splash', {
         session: req.session,
         //accounts: accounts
      });

   
});

//*************************************
//THANK YOU
//*************************************
app.get('/thank-you', function (req, res) {
   //AUTH CHECK
   if (!req.session.access_token) return res.redirect('/auth');

      res.render('thank-you', {
         session: req.session
      });

});


//*************************************
//SEND NOTIFICATIONS
//*************************************
app.get('/notify', function (req, res) {


   if(req.query["id"] == app.notifySecret){

      app.pipeDB.getSubscribedUsers(function(subscribers){
         console.log("SUBSCRIBERS:" + JSON.stringify(subscribers));

         for(var sub in subscribers){

            app.pipeDB.getNextChum(subscribers[sub].sId, function(chum){

               if(chum){

                   emailTemplates(templateDir, function(err, templates) {
                    
                     templates('simple-basic', chum, function(err, html, text) {

                        console.log("ERR" + err);
                        console.log("HTML" + html);
                        console.log("TEXT" + text);
                        
                        sendgrid.send({
                           to: subscribers[sub].email,
                           //connect.profileUserId
                           from: 'augustin@datacosmos.com',
                           //unescape(req.session.profiles["gcontacts"])
                           subject: "Your daily person from Pipe",
                           html: html
                           }, function(success, details) {

                              if (!success) {
                                 sType = "error";
                                 sMessage = "Error sending email!";
                              } else {
                                 sType = "info";
                                 sMessage = "Email successfully sent!";
                              }
                              sDetails = success + " -- " + details;

                              console.log("Email - " + sType + " - " + sMessage + " - " + sDetails);
                           }
                        );

                     });

                  });

               }
            });
         }      
      });
   }
   else{}
   //BAD REQUEST

   res.redirect('/');
});




//*************************************
//Google Site Verification
//*************************************
app.get('/googlea06f2c993be83d06.html', function(req, res) {
  res.writeHead(200, {"Content-Type": "text/html"});
  res.write("google-site-verification: googlea06f2c993be83d06.html");
  res.end();
});

app.listen(app.port);

console.log(sprintf('Listening at %s ', app.hostBaseUrl));












function getAuthServices(req){
   var i;
   var services = [];

   // For each service in usedServices, get a link to authorize it
   for (i = 0; i < app.usedServices.length; i++) {
      services.push({
         name: app.usedServices[i],
         link: getLink(app.usedServices[i], req.session.profiles, req.session.access_token)
      });
   }

   return services;
}


// Given the name of a service and the array of profiles, return a link to that
// service that's styled appropriately.
function getLink(prettyName, profiles, token){
   var service = prettyName.toLowerCase();

   // If the user has a profile authorized for this service
   if (profiles && profiles[service] !== undefined) {
      // Return a unicode checkmark so that the user doesn't try to authorize it again
      //<a href="%s/services/%s?access_token=%s" class="activated"></a>
      //app.apiBaseUrl, 
      //service, 
      //token, 
      return sprintf('<img style="margin-right:10px;" src="img/social_networks/%s_blue.png" alt="Pipe" width="46" height="46" />', 
         prettyName.toLowerCase());
   }

   // This flow is documented here: http://dev.singly.com/authorization
   var queryString = querystring.stringify({
      client_id: app.clientId,
      redirect_uri: sprintf('%s/callback', app.hostBaseUrl),
      service: service
   });

   return sprintf('<a href="%s/oauth/authorize?flag=dm&%s" class="authorize"><img style="margin-right:10px;" src="img/social_networks/%s_grey.png" alt="Pipe" width="46" height="46" /></a>',
      app.apiBaseUrl,
      queryString,
      prettyName.toLowerCase());
}


function processContacts(session, callback){

   //GET NEXT OFFSET
   //app.pipeDB.getOffset(req.session.userId, function(offset){
   //console.log("...Getting next contacts set... chum--> " + chum);


   //GET 100 names from Contacts
   app.singly.apiCall('/types/contacts', {max_count: 20, map: true, fields: "map.oembed.title", access_token: session.access_token}, function(err, names){

      var count = 0;

      //GO THROUGH ALL RETURNED CONTACTS
      for(var name in names){

         console.log("___FINDING CONTACTS____" + JSON.stringify(names[name]));

         var fullname = names[name]["map.oembed.title"];

         //FIND RELATED CONTACTS (by name)
         app.singly.apiCall('/types/contacts', {q: fullname, map: true, access_token: session.access_token}, function(err, contacts){

            var newChum = new app.pipeDB.Chum();
            newChum.userId = session.profiles.id;
            console.log("__NEW CONTACT__" + newChum._id);

            //MERGE CONTACTS INTO CHUM
            for(var contact in contacts){
               newChum.name = contacts[contact].map.oembed.title;
               newChum = mergeContactIntoChum(contacts[contact], newChum);
               console.log("___newChum____" + JSON.stringify(newChum));
            }

            //ONLY SAVE CHUM IF IT DOESN'T ALREADY EXIST IN DB
            app.pipeDB.getChumByName(newChum.name, function(chum){

               console.log("__NAME__" + newChum.name);   

               if(!chum){

                  console.log("count: " + count);

                  //SEND BACK FIRST NEW CHUM
                  if(count == 0){
                     callback(newChum);
                  }  
                  
                  //ADD CHUM TO DB
                  app.pipeDB.addChum(newChum);

                  count++;
               }
            });//getChumByName -> see if contact already has a chum record

         });//singly.apiCall -> get related contacts by name

      }//For each contact

   });//singly.apiCall -> get contacts

}

function buildConnect(connect, sType, sMessage, sDetails){

   var status = new app.pipeDB.Status();
   status.type = sType;
   status.message = sMessage;
   status.details = sDetails;
   connect.statuses.push(status);                
   
   app.pipeDB.addConnect(connect, function(err){
      if(err)
         console.log("ERROR SAVING CONNECT__" + err);
   });

   if(sType == "error")
      console.log("ERROR SENDING MESSAGE-- " + sMessage + " -DETAILS- " + sDetails);  
   else
      app.pipeDB.updateChum(connect.chumId, { surfaced : true });

}

function mergeContactIntoChum(contact, chum){
      
   //console.log("merge contact: " + JSON.stringify(contact));
   //console.log("with chum: " + JSON.stringify(chum));

   if(contact.idr.indexOf("facebook") != -1){

      var profile  = new app.pipeDB.Profile();
      profile.idr = contact.idr ? contact.idr : "";
      profile.type = "facebook";
      profile.userId = contact.data.username ? contact.data.username : (contact.idr.split('friends#')[1]);
      profile.link = contact.data.link ? contact.data.link : "";
      chum.profiles.push(profile);

      var photo = new app.pipeDB.Photo();
      photo.type = "facebook";
      photo.link = profile.link;
      photo.url = contact.map && contact.map.photo ? contact.map.photo : "";
      chum.photos.push(photo);
      //{"facebook" : contact.data.username ? "https://graph.facebook.com/" + contact.data.username + "/picture": ""},
      
      //chum.status = "";
      if(!chum.meta)
         chum.meta = contact.data.quotes ? contact.data.quotes : (contact.data.bio ? contact.data.bio : "");
      if(!chum.location)
         chum.location =  contact.data.location && contact.data.location.name ? contact.data.location.name : "";
      if(!chum.profession)
         chum.profession = contact.data.work && contact.data.work[0].employer && contact.data.work[0].employer.name ? contact.data.work[0].employer.name : "";
      
          
   }
   else if(contact.idr.indexOf("twitter") != -1){

      var profile  = new app.pipeDB.Profile();
      profile.idr = contact.idr ? contact.idr : "";
      profile.type = "twitter";
      profile.userId = contact.data.screen_name ? contact.data.screen_name : "";
      profile.link = "http://twitter.com/" + profile.userId;
      //chum.profiles["twitter"] = profile;
      chum.profiles.push(profile);

      var photo = new app.pipeDB.Photo();
      photo.type = "twitter";
      photo.link = profile.link;
      photo.url = contact.map && contact.map.photo ? contact.map.photo : "";
      chum.photos.push(photo);
      
      if(!chum.status)
         chum.status = contact.data.status && contact.data.status.text ? contact.data.status.text : "";
      if(!chum.meta)
         chum.meta = contact.data.description ? contact.data.description : "";
      if(!chum.location)
         chum.location =  contact.data.location ? contact.data.location : "";
      
   }
   else if(contact.idr.indexOf("linkedin") != -1){

      var profile  = new app.pipeDB.Profile();
      profile.idr = contact.idr ? contact.idr : "";
      profile.type = "linkedin";
      profile.userId = contact.data.id ? contact.data.id : "";
      profile.link = contact.data.siteStandardProfileRequest && contact.data.siteStandardProfileRequest.url ? contact.data.siteStandardProfileRequest.url : "";
      chum.profiles.push(profile);

      var photo = new app.pipeDB.Photo();
      photo.type = "linkedin";
      photo.link = profile.link;
      photo.url = contact.data.pictureUrl ? contact.data.pictureUrl : "";
      chum.photos.push(photo);
      
      if(!chum.status)
         chum.status = contact.data.status && contact.data.status.text ? contact.data.status.text : "";
      if(!chum.meta)
         chum.meta = contact.data.description ? contact.data.description : (contact.data.headline ?  contact.data.headline : "");
      if(!chum.location)
         chum.location =  contact.data.location && contact.data.location.name ? contact.data.location.name : "";
      if(!chum.profession)   
         chum.profession = contact.data.positions && contact.data.positions.values && contact.data.positions.values[0].company && contact.data.positions.values[0].company.name ? contact.data.positions.values[0].company.name : "";

   }
   else if(contact.idr.indexOf("gcontacts") != -1){

      var profile  = new app.pipeDB.Profile();
      profile.idr = contact.idr ? contact.idr : "";
      profile.type = "gcontacts";
      profile.userId = contact.map && contact.map.oembed && contact.map.oembed.email ? contact.map.oembed.email : "";
      //profile.userId = contact.data.gd$email && contact.data.gd$email[0] ? contact.data.gd$email[0].address : "";
      //profile.link = contact.data.gContact$website ? contact.data.gContact$website : "";
      profile.link = profile.userId != "" ? "mailto:" + profile.userId : "";
      chum.profiles.push(profile);

      //TODO: grab photo through proxy
      var photo = new app.pipeDB.Photo();
      photo.type = "gcontacts";
      //photo.link = contact.data.gContact$website ? contact.data.gContact$website : "";
      profile.link = profile.userId != "" ? "mailto:" + profile.userId : "";
      photo.url = contact.map && contact.map.photo ? contact.map.photo : "";
      chum.photos.push(photo);

      //chum.status = "";
      //chum.meta = "";
      //chum.location =  "";
      //chum.profession = "";
      
   }

   return chum;
}


