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
   if (!req.session.access_token) return res.redirect('/');

   //IF USER NOT LOADED
   if (!req.session.userId){
      
      //BUILD USER
      var user = { 
            id: req.session.profiles.id
          , profiles: req.session.profiles 
      };
      console.log("USER: " + JSON.stringify(user));

      //SAVE USER TO DB
      app.pipeDB.saveUser(user);

      //STORE USERID IN SESSION
      req.session.userId = req.session.profiles.id;
   }

   //LOAD NEXT CHUM
   app.pipeDB.getNextChum(user, function(chum){

      if(!chum){
      //IF NO LOCAL UNSURFACED CHUMS (none yet downloaded OR all have been touched OR none scheduled, etc...)
      //DOWNLOAD NEXT SET

         //GET NEXT OFFSET
         app.pipeDB.getOffset(req.session.userId, function(offset){

            //GET NEXT CONTACTS
            //not currently supported: limit:20, offset:offset
            app.singly.apiCall('/types/contacts', {map: true, access_token:req.session.access_token}, function(err, contacts){

               var cIndex = 0;
               //GO THROUGH ALL RETURNED CONTACTS
               for(var contact in contacts){

                  console.log("contact --> " + JSON.stringify(contacts[contact]));

                  if (contacts.hasOwnProperty(contact)){
                  //BUILD CHUM
                     var newChum = mapChum(contacts[contact]);
                     if(newChum){
                     //IF CHUM MAPPED SUCCESSFULLY

                        newChum["owner"] = req.session.userId;
                        //console.log("cIndex: " + cIndex);

                        if(cIndex == 0) {
                        //IF FIRST, RETURN CHUM
                           res.render('pipe', {
                              session: req.session
                              , chum: newChum
                           });

                           //SAVE CHUM TO DB, SET AS SURFACED
                           app.pipeDB.saveChum(newChum, { surfaced : true });
                     
                        }
                        else {
                           //SAVE CHUM TO DB
                           app.pipeDB.saveChum(newChum);
                        }
                     }
                  }

                  cIndex++;
               }

               //SAVE OFFSET
               
            });
         });
      }
      else {

         //FIND ALL RELATED CONTACTS
         //SAVE EACH TO DB

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
   if (!req.session.access_token) return res.redirect('/');

   //IF SUBMIT
      //SAVE CONNECT TO DB
      //IF LINKEDIN OR TWITTER
         //SEND TO SINGLY PROXY
      //IF EMAIL
         //SEND EMAIL
      //IF FACEBOOK
         //??
      //REDIRECT TO PIPE W/ MESSAGE
      //res.redirect('/pipe');

   //ELSE
      //GET CONNECTED ACCOUNTS FROM DB
      //RETURN CONNECTION OPTIONS
      res.render('connect', {
         session: req.session,
         chum: chum
      });

});

//*************************************
//SKIP
//*************************************
app.get('/skip', function (req, res) {
   //AUTH CHECK
   if (!req.session.access_token) return res.redirect('/');

   //IF SUBMIT
      //SAVE SKIP TO DB
      //REDIRECT TO PIPE W/ MESSAGE
      //res.redirect('/pipe');

   //ELSE
      //GET CONNECTED ACCOUNTS FROM DB
      //RETURN CONNECTION OPTIONS
      res.render('skip', {
         session: req.session,
         accounts: accounts
      });

});

app.post('/skip', function(req, res) {
   if (!req.session.access_token) return res.redirect('/');

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
   if (!req.session.access_token) return res.redirect('/');

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
   // service that's styled appropriately (i.e. show a link or a checkmark).
function getLink(prettyName, profiles, token){
   var service = prettyName.toLowerCase();

   // If the user has a profile authorized for this service
   if (profiles && profiles[service] !== undefined) {
      // Return a unicode checkmark so that the user doesn't try to authorize it again
      return sprintf('<a href="%s/services/%s?access_token=%s" class="activated"><img style="margin-right:10px;" src="img/social_networks/%s_blue.png" alt="Pipe" width="46" height="46" /></a>', 
         app.apiBaseUrl, 
         service, 
         token, 
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


function getContactSet(req, callback){

   //GET CONTACTS OFFSET FOR USER

   //GET NEXT 20 CONTACTS FROM SINGLY
      //FOREACH
         //SEARCH SINGLY FOR SIMILAR
         //AGGREGATE CONTACTS INTO CHUM
         //SAVE CHUM
      //SAVE OFFSET

}


function getContactCounts(req, next){

   //Find out how many contacts are in Singly for connected profiles
   var profs = JSON.stringify(req.session.profiles);
   var services = [];
   var counts = {};
   var totalCount = 0, index = 0;

   if(profs.indexOf("twitter") != -1)
      services[services.length] = "twitter";
   if(profs.indexOf("facebook") != -1)
      services[services.length] = "facebook";
   if(profs.indexOf("gcontacts") != -1)
      services[services.length] = "gcontacts";
   if(profs.indexOf("linkedin") != -1)
      services[services.length] = "linkedin";

   console.log(services);

   for(var i = 0; i < services.length; i++){

      singly.apiCall('/services/' + services[i], req.session, function(err, set){
         var count = set.friends ? set.friends : (set.contacts ? set.contacts : set.connections);
         counts[services[index]] = count;
         //totalCount += parseFloat(count);
         console.log(JSON.stringify(set));
         console.log("___" + services[index] + "___" + count);
         index++;
         if(index == services.length) {
            counts["length"] = services.length;
            next(counts);
         }
            
      });  
   }
}

function mapChum(contact){
      var chum = null;
      console.log("mapping contact: " + JSON.stringify(contact));

      if(contact.idr.indexOf("facebook") != -1) {
           
         chum = { 
            "idr" : contact.idr ? contact.idr : "",
            "name" : contact.data.name ? contact.data.name : "",
            "profiles" : {"facebook" : contact.data.username ? contact.data.username : ""},
            "photos" : contact.map && contact.map.photo ? contact.map.photo : "",
            //{"facebook" : contact.data.username ? "https://graph.facebook.com/" + contact.data.username + "/picture": ""},
            "status" : "",
            "meta" : contact.data.quotes ? contact.data.quotes : (contact.data.bio ? contact.data.bio : ""),
            "location" : contact.data.location && contact.data.location.name ? contact.data.location.name : "",
            "profession" : contact.data.work && contact.data.work[0].employer && contact.data.work[0].employer.name ? contact.data.work[0].employer.name : "",
            //"tagline" : 
         };  
      }
      else if(contact.idr.indexOf("twitter") != -1){

         chum = { 
            "idr" : contact.idr ? contact.idr : "",
            "name" : contact.data.name ? contact.data.name : "",
            "profiles" : {"twitter" : contact.data.screen_name ? contact.data.screen_name : ""}, 
            "photos" : contact.map && contact.map.photo ? contact.map.photo : "",
            //{"twitter" : contact.data.profile_image_url ? contact.data.profile_image_url : ""},
            "status" : contact.data.status && contact.data.status.text ? contact.data.status.text : "",
            "meta" : contact.data.description ? contact.data.description : "",
            "location" : contact.data.location ? contact.data.location : "",
            "profession" : "",
            //"tagline" : contact.data.description ? contact.data.description : ""
         };
      }
      else if(contact.idr.indexOf("linkedin") != -1){

         chum = { 
            "idr" : contact.idr ? contact.idr : "",
            "name" : contact.data.firstName ? contact.data.firstName + " " + (contact.data.lastName ? contact.data.lastName : "") : "",
            "profiles" : {"linkedin" : contact.data.id ? contact.data.id : ""},
            "photos" : contact.data.pictureUrl ? contact.data.pictureUrl : "",
            "status" : contact.data.status && contact.data.status.text ? contact.data.status.text : "",
            "meta" : contact.data.description ? contact.data.description : (contact.data.headline ?  contact.data.headline : ""),
            "location" : contact.data.location && contact.data.location.name ? contact.data.location.name : "",
            "profession" : contact.data.positions && contact.data.positions.values && contact.data.positions.values[0].company && contact.data.positions.values[0].company.name ? contact.data.positions.values[0].company.name : "",
            //"tagline" : contact.data.headline ?  contact.data.headline : "",
         };
      }
      else if(contact.idr.indexOf("gcontacts") != -1){

         chum = { 
            "idr" : contact.idr,
            "name" : contact.data.gd$name ? (contact.data.gd$name.gd$fullName ? contact.data.gd$name.gd$fullName : "") : "",
            "profiles" : {"gcontacts" : contact.data.gd$email && contact.data.gd$email[0] ? contact.data.gd$email[0].address : ""}, 
            "photos" : "",
            "status" : "",
            "meta" : "",
            "location" : "",
            "profession" : "",
            "tagline" : ""  
            //"photo" : contact.oembed && contact.oembed.thumbnail_url,    
         };
      }

      return chum;
   }


