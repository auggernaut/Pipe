var express = require('express');
var querystring = require('querystring');
var request = require('request');
var sprintf = require('sprintf').sprintf;

// Create an HTTP server
var app = express.createServer();
require('./config/environment.js')(app, express);
app.set('view engine', 'ejs');
app.pipeDB.load();

//*************************************
//HOME
//*************************************
app.get('/', function (req, res) {
   //console.log(singly.apiBaseUrl);

   res.render('splash', {session: req.session});
});

//*************************************
//SELECT SERVICES
//*************************************
app.get('/auth', function (req, res){ 

   // Render out views/auth.ejs, passing in the array of links and the session
   res.render('auth', {
      services: getAuthServices(req),
      session: req.session
   });
});


//*************************************
//PROCESS AUTH
//*************************************
app.get('/callback', function (req, res) {

   //console.log(req);
   app.singly.getAccessToken(req.param('code'), function(err, access_token) {

      req.session.access_token = access_token;

      app.singly.apiCall('/profiles', req.session, function(err, profilesBody) {
         
         try {
            //profilesBody = JSON.parse(profilesBody);
            console.log("Profiles: " + JSON.stringify(profilesBody));
         } catch(parseErr) {
            return res.send(parseErr, 500);
         }

         req.session.profiles = profilesBody;
         res.redirect('/auth');

      });
   });
});


//*************************************
//PIPE
//*************************************
app.get('/pipe', function (req, res) {
   //AUTH CHECK
   if (!req.session.access_token) return res.redirect('/auth');

   //IF USER NOT LOADED
   if (!req.session.userId){
      
      //BUILD USER
      var user = { 
            sId: req.session.profiles.id
          , profiles: req.session.profiles 
      };
      console.log("USER: " + JSON.stringify(user));

      //SAVE USER TO DB
      app.pipeDB.saveUser(user);
   
      
   }

   //STORE USERID IN SESSION
   req.session.userId = req.session.profiles.id;
   console.log("___USERID____" + req.session.userId);

   //LOAD NEXT CHUM
   app.pipeDB.getNextChum(req.session.userId, function(chum){

      if(!chum){
      //IF NO LOCAL UNSURFACED CHUMS (none yet downloaded OR all have been touched OR none scheduled, etc...)
      
         //GET CONTACTS FROM SINGLY, MERGE, SAVE TO DB
         processContacts(req.session, function(chum){

            //RETURN CHUM
            res.render('pipe', {
                  session: req.session
                  , chum: chum
               });
         });
      
      }
      else {
         //RETURN CHUM
         res.render('pipe', {
            session: req.session
            , chum: chum
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

      //app.pipeDB.saveChum(chum, { surfaced : true });

      //RETURN CONNECTION OPTIONS
      res.render('connect', {
         session: req.session
         , chum : chum
      });

   });
   

   

});

app.post('/connect', function(req, res) {
   if (!req.session.access_token) return res.redirect('/auth');

   //SAVE CONNECT TO DB
   var connect = new app.pipeDB.Connect();
   connect.profileIdr = req.body.profileIdr;
   connect.profileUserId = req.body.profileUserId;
   connect.subject = req.body.subject;
   connect.message = req.body.body;

   //console.log(req);

   console.log("ProfileIDR: " + connect.profileIdr );
   console.log("UserId: " + connect.profileUserId );
   console.log("Subject: " + connect.subject );
   console.log("body: " + connect.body );


   app.pipeDB.saveConnect(connect, function(){

   });

   //CHECK SEND METHOD

   if(connect.profileIdr.indexOf("gcontacts") != -1){

      console.log("SENDING EMAIL");

      var SendGrid = require('sendgrid-nodejs').SendGrid;
      var sendgrid = new SendGrid("auggernaut", "P@lmtr33");
      sendgrid.send({
         to: 'augman@gmail.com',
         from: 'augustin@datacosmos.com',
         subject: connect.subject,
         text: connect.message
      }, function(success, message) {
         if (!success) {
            console.log(message);
         } else {
            req.flash("info", "Email message sent!");
            res.redirect('/pipe');
         }
      });


   }
   else if(connect.profileIdr.indexOf("linkedin") != -1){

      console.log("SENDING LINKEDIN MESSAGE");

      app.singly.apiCallPost('/proxy/linkedin/people/~/mailbox', req.session, {
               "recipients": {
                  "values": [
                     {
                        "person": {
                           "_path": "/people/" + connect.profileUserId,
                        }
                     }
                  ]
               },
               "subject": connect.subject,
               "body": connect.message
            }, 
            function(err, response){   
               if(response)
                  console.log("ERROR - Send via LinkedIn: -err-" + err + " -json-" + JSON.stringify(response));
               else{
                  req.flash("info", "LinkedIn message sent!");
                  res.redirect('/pipe');
               } 
            }
         );
   }
   //IF LINKEDIN OR TWITTER
      //SEND TO SINGLY PROXY
   //IF EMAIL
      //SEND EMAIL
      //app.email.send(connect)
   //IF FACEBOOK
      //??


   //RERENDER CONNECT W/ MESSAGE
   

   

});


//*************************************
//SKIP
//*************************************
app.get('/skip', function (req, res) {
   //AUTH CHECK
   if (!req.session.access_token) return res.redirect('/auth');

      res.render('skip', {
         session: req.session
         //accounts: accounts
      });

});

app.post('/skip', function(req, res) {
   //AUTH CHECK
   if (!req.session.access_token) return res.redirect('/auth');

   var skip = new app.pipeDB.Skip();
   var chumIdr = req.body.chumIdr;
   skip.chum = app.pipeDB.Chum.findOne({"idr": req.param('chumIdr', null)});
   skip.schedule = req.param('schedule', "");
   skip.note = req.param('note', "");
   //skip.save();
   res.render('skip', {
      session: req.session
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

   res.render('user', {
         session: req.session,
         accounts: accounts
      });

   
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
   app.singly.apiCall('/types/contacts', {min_count: 50, map: true, fields: "map.oembed.title", access_token: session.access_token}, function(err, names){

      var count = 0;
      var newChum;

      //GO THROUGH ALL RETURNED CONTACTS
      for(var name in names){

         console.log("___FINDING CONTACTS____" + JSON.stringify(names[name]));

         var fullname = names[name]["map.oembed.title"];

         //FIND RELATED CONTACTS (by name)
         app.singly.apiCall('/types/contacts', {q: fullname, map: true, access_token: session.access_token}, function(err, contacts){

            newChum = new app.pipeDB.Chum();
            newChum.userId = session.userId;
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
                  
                  //SAVE CHUM TO DB
                  app.pipeDB.saveChum(newChum);

                  count++;
               }
            });//getChumByName -> see if contact already has a chum record

         });//singly.apiCall -> get related contacts by name

      }//For each contact

   });//singly.apiCall -> get contacts

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


