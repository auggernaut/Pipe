//OLD CODE - MAY NEED TO REUSE SOMEDAY


     //'foursquare',
      //'Instagram',
      //'Tumblr',
      //'FitBit',

//IF DEVELOPMENT
//if (process.env.NODE_ENV != 'production')
//{

   res.writeHead(200, {"Content-Type": "text/html"});
   res.write(JSON.stringify(users));
   res.end();


//GET A RANDOM CONTACT FROM SINGLY
   //Randomly pick a connected service   
   var cCounts = req.session.cCounts;

   var rService = Math.floor(Math.random() * cCounts["length"]);
   var sName, sCount, cIndex = 0;

   for(var key in cCounts){
      if (cCounts.hasOwnProperty(key)) {
         if(cIndex == rService){
            sName = key;
            sCount = cCounts[key];
            break;
         }
         cIndex++;
      }
   }

   var rContact = Math.floor(Math.random() * sCount + 1);
   //console.log("SERVICE: " + sName + "  COUNT: " + sCount + " RANDOM: " + rContact);

   //Each service has a different endpoint for "contacts"
   switch(sName) {
      case "facebook" : sName += "/friends"; break;
      case "linkedin" : sName += "/connections"; break;
      case "twitter" : sName += "/friends"; break;
      case "gcontacts" : sName += "/contacts"; break;
   }

   //Get the random contact
   singly.apiCall('/services/' + sName, {limit:1, offset:rContact, access_token:req.session.access_token}, function(err, contact){
      
      var chum = "";
      if(contact[0]){
         chum = mapChum(contact[0]);
      }

      //Find all similar contacts
   /* singly.apiCall('/types/contacts', {q:chum.name, access_token:req.session.access_token}, function(err, contacts){

         var ids = getAccountIds(contacts);
         ids[0] = linContact;            
         
      });
   */
      res.write(JSON.stringify(chum));
      res.end(); 

   });

   
         //Count up all the contacts
         getContactCounts(req, function(counts){
            console.log(JSON.stringify(counts));
            req.session.cCounts = counts;
            res.redirect('/auth');
         });
         



var OAuth2 = require('oauth').OAuth2;


var singly = {

   //Singly API URL
   apiBaseUrl : process.argv[5] || 'https://api.singly.com',


   //Services connected to app
   usedServices : ['Facebook', 'Twitter', 'LinkedIn', 'GContacts'],
      //'foursquare',
      //'Instagram',
      //'Tumblr',
      //'FitBit',

   
   oa : new OAuth2(this.clientId, this.clientSecret, this.apiBaseUrl),



   //var Step = require('./combo.js');


}


   function postCallback(req, res){

      console.log(sprintf('Using API endpoint %s.', apiBaseUrl));
      console.log(sprintf('ClientId %s.', clientId));
      console.log(sprintf('ClientSecret %s.', clientSecret));

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
   }



   // A convenience method that takes care of adding the access token to requests
   function getProtectedResource(path, session, callback) {
      console.log(path);
      oa.getProtectedResource(apiBaseUrl + path, session.access_token, callback);
   }




   





   function getAccountIds(contacts) {

      var pLinkedIn, pTwitter, pFacebook, pGContacts;

      if(contacts.length > 1) {
         for(var i = 0; i < contacts.length; i++){
            if(contacts[i].idr.indexOf("twitter") != -1){
               pTwitter = contacts[i].data.id;
            }
            if(contacts[i].idr.indexOf("linkedin") != -1){
               pLinkedIn = contacts[i].data.id;
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




   function getContactsCount(req){

      //Find out how many contacts are in Singly for connected profiles
      var profs = JSON.stringify(req.session.profiles);
      var count = 0;

      if(profs.indexOf("twitter") != -1) {
         getProtectedResource('/services/twitter', req.session, function(err, set){
            var tFriends = JSON.parse(set).friends;
            count += tFriends;
            console.log("___Twitter Friends___" + tFriends);
         });
      }
      if(profs.indexOf("facebook") != -1) {
         getProtectedResource('/services/facebook', req.session, function(err, set){
            var fFriends = JSON.parse(set).friends;
            count += fFriends;
            console.log("___Facebook Friends___" + fFriends);
         });
      }
      if(profs.indexOf("gcontacts") != -1) {
         getProtectedResource('/services/gcontacts', req.session, function(err, set){
            var gContacts = JSON.parse(set).contacts;
            count += gContacts;
            console.log("___Google Contacts___" + gContacts);
         });
      }
      if(profs.indexOf("linkedin") != -1) {
         getProtectedResource('/services/linkedin', req.session, function(err, set){
            var lConnections = JSON.parse(set).connections;
            count += lConnections;
            console.log("___LinkedIn Connections___" + lConnections);
         });
      }

      console.log("___Total Contacts___" + count);

      return count;
   }




   function getNextContact(req){
      
      var count = getContactCount(req);

      //Currently random
      //getProtectedResource('/types/contacts?limit=1&offset=' + Math.floor(Math.random() * count), req.session, function(err, item){

      //   getMatchingContacts(mapContact("??", item).name);

      //}
   }




   function getMatchingContacts(name){

         getProtectedResource('/types/contacts?q=' + name, req.session, function(err, contacts){

            var ids = getAccountIds(JSON.parse(contacts));
            ids[0] = linContact;            
            res.write(JSON.stringify(ids));
            res.end(); 
         });
   }





   function getUser(type, id, session, req){
      getProtectedResource('/by/contact/' + type + '/' + id, req.session, function(err, item) {
         var prof = JSON.stringify(mapProfile(type, JSON.parse(item)[0]));

         console.log("MAPPED PROFILE: " + prof);
         
         res.write(prof);
         res.end();
      });

   }






   function mapContact(item){

      var profile = "TYPE: " + type + " - ITEM: " + item;
      console.log(profile);

      if(item.idr.indexOf("facebook") != -1) {
           
         profile = { 
            "id" : item.idr ? item.idr : "",
            "provider" : "facebook",
            "name" : item.data.name ? item.data.name : "",
            "username" : item.data.username ? item.data.username : "",
            "description" : item.data.bio ? item.data.bio : "",
            "location" : item.data.location && item.data.location.name ? item.data.location.name : "",
            //"status" : (item.data.message) ? item.data.message : item.data.story,
            "photo" : item.oembed && item.oembed.thumbnail_url ? item.oembed.thumbnail_url : "",
            "profession" : item.data.work && item.data.work[0].employer && item.data.work[0].employer.name ? item.data.work[0].employer.name : "",
            "tagline" : item.data.quotes ? item.data.quotes : ""
         };  
      }
      else if(item.idr.indexOf("twitter") != -1){

         profile = { 
            "id" : item.idr ? item.idr : "",
            "provider" : "twitter", 
            "name" : item.data.name ? item.data.name : "",
            "username" : item.data.screen_name ? item.data.screen_name : "",
            "description" : item.data.description ? item.data.description : "",
            "location" : item.data.location ? item.data.location : "",
            "status" : item.data.status && item.data.status.text ? item.data.status.text : "",
            "photo" : item.data.profile_image_url ? item.data.profile_image_url : "",
            "tagline" : item.data.description ? item.data.description : ""
         };
      }
      else if(item.idr.indexOf("linkedin") != -1){

         profile = { 
            "id" : item.idr ? item.idr : "",
            "provider" : "linkedin",
            "name" : item.data.firstName ? item.data.firstName + (item.data.lastName ? item.data.lastName : "") : "",
            "username" : item.data.screen_name ? item.data.screen_name : "",
            "description" : item.data.description ? item.data.description : "",
            "location" : item.data.location ? item.data.location : "",
            "status" : item.data.status && item.data.status.text ? item.data.status.text : "",
            "photo" : item.data.profile_image_url ? item.data.profile_image_url : "",
            "tagline" : item.data.headline ?  item.data.headline : "",
            "profession" : item.data.positions && item.data.positions.values && item.data.positions.values[0].company && item.data.positions.values[0].company.name ? item.data.positions.values[0].company.name : ""
         };
      }
      else if(item.idr.indexOf("gcontacts") != -1){

         profile = { 
            "id" : item.idr,
            "provider" : "gcontacts",
            "name" : item.data.name,
            "username" : item.data.username,
            "description" : (item.data.bio) ? item.data.bio : item.data.quotes,
            "location" : item.data.location && item.data.location.name,
            //"status" : (rStatus.data.message) ? rStatus.data.message : rStatus.data.story,
            "photo" : item.oembed && item.oembed.thumbnail_url,
            //"profession" : item.data.work && item.data.work[0].employer && item.data.work[0].employer.name ? item.data.work[0].employer.name : ""       
         };
      }

      return profile;
   }



//MODULE TINKERING

// Hook into commonJS module systems
//if (typeof module !== 'undefined' && "exports" in module) {
//  module.exports = Singly;
//}
module.exports = singly;


var test = {
   
   param1: "test1",
   param2: "test2",
   func1: function(){
      console.log(this.param2);
   },
   func2: function(req){
      console.log(req);
   }
}

module.exports = test;




