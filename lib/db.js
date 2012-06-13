var mongoose = require('mongoose');

module.exports = function(domain, name){
   var client = {
      User:null,
      Chum:null,
      Skip:null,
      Connect:null,
      Singly:null,
      Profile:null,
      Photo:null
   };
   var connection;

   client.load = function(){
      var connection = "mongodb://" + domain + "/" + name;
      mongoose.connect(connection);
      console.log('Mongoose connected to: ' + connection);

      var Schema = mongoose.Schema
        , ObjectId = Schema.ObjectId;

      var UserSchema = new Schema({
          sId		      : { type: String, required: true, index: { unique: true, sparse: true } } //SinglyID
        , name          : { type: String, index: true }
        , email         : String
        , profiles      : [ProfileSchema]
        , dateCreated   : { type: Date, default: Date.now }
        , dateLast      : { type: Date, default: Date.now }
      });

      var ChumSchema = new Schema({
          name          : { type: String, index: true }
        , profiles      : [ProfileSchema]
        , photos        : [PhotoSchema]
        , status        : String
        , meta          : String
        , location      : String
        , profession    : String
        , dateCreated   : { type: Date, default: Date.now }
        , dateSurfaced  : { type: Date }
        , dateModified  : { type: Date, default: Date.now }
        , userId          : String
        //Not sure yet how to use references to other db objects
        //{ type: Schema.ObjectId, ref: 'User', required: true }
      });

      var ProfileSchema = new Schema({
           type         : String
         , idr    		: String
         , userId			: String
         , link			: String
      });

      var PhotoSchema = new Schema({
           type         : String
         , url          : String
      });

      var SkipSchema = new Schema({
           chumIdr      : { type: Schema.ObjectId, ref: 'Chum', required: true }
         , schedule     : { type: String, index: true }
         , note         : String
         , dateCreated  : { type: Date, default: Date.now }
         , dateModified : { type: Date, default: Date.now }
      });

      var ConnectSchema = new Schema({
           chumIdr		: { type: String, required: true }
         , profile      : { type: String, id: String }
         , subject      : String
         , message      : String
         , dateCreated  : { type: Date, default: Date.now }
      });

      var SinglySchema = new Schema({
         userId            : String
         , contactsOffset  : String
         , dateModified    : { type: Date, default: Date.now }
      });

      client.User = mongoose.model('User', UserSchema);
      client.Chum = mongoose.model('Chum', ChumSchema);
      client.Skip = mongoose.model('Skip', SkipSchema);
      client.Connect = mongoose.model('Connect', ConnectSchema);
      client.Singly = mongoose.model('Singly', SinglySchema);
      client.Profile = mongoose.model('Profile', ProfileSchema);
      client.Photo  = mongoose.model('Photo', PhotoSchema);
   }

   client.saveUser = function(user){
      console.log("___SAVE USER___" + user);

      //FIND USER 
      client.User.findOne({ id : user.id }, function(err, doc){
         //console.log("err: " + err + "  doc: " + doc);

         if(!err){
            if(!doc){
            //IF NOT FOUND, CREATE
               console.log("Create: " + JSON.stringify(user));
               var newUser = new client.User(user);
               //newUser.profiles.push({ type : "facebook", profileId : user.profiles.facebook });
               newUser.save(function(err){
                  console.log("__ERROR - saveUser___" + err);
               });
            }
            else{
            //IF FOUND, UPDATE
               console.log("Update: " + JSON.stringify(doc));
               //var user = new User(user);
            }
         }
         else
            console.log("_____MONGO ERROR_____ " + err);

      });
   }

   client.getNextChum = function(userId, callback){
      console.log("___NEXT CHUM___" + userId);
      
      //FIND UNSURFACED CHUM
      client.Chum.findOne({ dateSurfaced : null }, function(err, doc){
         //console.log("err: " + err + "  doc: " + doc);

         if(!err){
            callback(doc);

            if(doc){
	            doc.dateSurfaced = Date.now();
	                  
	            doc.save(function(err){
	            	if(err)
	               	console.log("__ERROR - getNextChum___" + err);
	            });
         	}
         }
         else
            console.log("_____MONGO ERROR_____ " + err);

      });
   }

   client.getOffset = function(userId, callback){
      console.log("___GET OFFSET___" + userId);
      callback(1);
   }


   client.saveChum = function(chum, options){
      console.log("___SAVE CHUM___" + chum + "___OPTIONS___" +  options);

      //FIND CHUM 
      client.Chum.findOne({ name : chum.name }, function(err, doc){
         //console.log("err: " + err + "  doc: " + doc);

         if(!err){
            if(!doc){
            //IF NOT FOUND, CREATE
               var newChum = new client.Chum(chum);

               if(options && options.surfaced)
                  newChum.dateSurfaced = Date.now();
                  
               newChum.save(function(err){
               	if(err)
                  	console.log("__ERROR - saveChum___" + err);
               });
            }
            else{
            //IF FOUND, MERGE/UPDATE
               
            }
         }
         else
            console.log("_____MONGO ERROR_____ " + err);
      })
   }

   client.saveSkip = function(skip, options) {
      console.log("__SAVE SKIP__" + skip + "__OPTIONS__" + options);

      client.Skip.findOne({ chumIdr: skip.chumIdr }, function(err,doc) {
         //console.log("err: " + err + ", doc: " + doc);

         if (!err) {
            if (!doc) {
               var newSkip = new client.Skip(skip);
               newSkip.save(function(err) {
                  console.log("__ERROR - Save Skip__: " + err);
               });
            } else {
               // If found...
            }
         }
      });
   };

   client.saveConnect = function(connect, options) {
      console.log("__SAVE CONNECT__" + connect + "__OPTIONS__" + options);

      //Always save a new connect record.
      var newConnect = new client.Connect(connect);
      newConnect.save(function(err) {
         console.log("__ERROR - Save Connect__: " + err);
      });
   }
   
   return client;
}