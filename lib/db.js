var mongoose = require('mongoose');

module.exports = function(domain, name){
   var client = {}; 
   var connection;
   var User, Chum, Skip, Connect, Singly;

   client.load = function(){
      var connection = "mongodb://" + domain + "/" + name;
      mongoose.connect(connection);
      console.log('Mongoose connected to: ' + connection);

      var Schema = mongoose.Schema
        , ObjectId = Schema.ObjectId;

      var UserSchema = new Schema({
          id            : { type: String, required: true, index: { unique: true, sparse: true } }
        , name          : { type: String, index: true }
        , email         : String
        , profiles      : [ProfileSchema]
        , dateCreated   : { type: Date, default: Date.now }
        , dateLast      : { type: Date, default: Date.now }
      });

      var ChumSchema = new Schema({
          idr           : { type: String, required: true, index: { unique: true, sparse: true } }
        , name          : { type: String, index: true }
        , profiles      : [ProfileSchema]
        , photos        : [PhotoSchema]
        , status        : String
        , meta          : String
        , location      : String
        , profession    : String
        , dateCreated   : { type: Date, default: Date.now }
        , dateSurfaced  : { type: Date }
        , dateModified  : { type: Date, default: Date.now }
        , owner         : { type: Schema.ObjectId, ref: 'User', required: true }
      });

      var ProfileSchema = new Schema({
         type           : String
         , profileId    : String
      });

      var PhotoSchema = new Schema({
         type           : String
         , url          : String
      });

      var SkipSchema = new Schema({
         id             : { type: String, required: true, index: { unique: true, sparse: true } }
         , chumIdr      : { type: String, required: true }
         , schedule     : { type: String, index: true }
         , note         : String
         , dateCreated  : { type: Date, default: Date.now }
         , dateModified : { type: Date, default: Date.now }
      });

      var ConnectSchema = new Schema({
         id             : { type: String, required: true, index: { unique: true, sparse: true } }
         , chumIdr      : { type: String, required: true }
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

      User = mongoose.model('User', UserSchema);
      Chum = mongoose.model('Chum', ChumSchema);
      Skip = mongoose.model('Skip', SkipSchema);
      Connect = mongoose.model('Connect', ConnectSchema);
      Singly = mongoose.model('Singly', SinglySchema);
   }

   client.saveUser = function(user){
      console.log("___SAVE USER___" + user);

      //FIND USER 
      User.findOne({ id : user.id }, function(err, doc){
         console.log("err: " + err + "  doc: " + doc);

         if(!err){
            if(!doc){
            //IF NOT FOUND, CREATE
               console.log("Create: " + JSON.stringify(user));
               var newUser = new User(user);
               newUser.profiles.push({ type : "facebook", profileId : user.profiles.facebook });
               newUser.save(function(err){
                  console.log("__ERROR - Save User___" + err);
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
      Chum.findOne({ dateSurfaced : null }, function(err, doc){
         console.log("err: " + err + "  doc: " + doc);

         if(!err){
            callback(doc);
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
      console.log("___SAVE CHUM___ " + chum + "___OPTIONS___" +  options);

      //FIND CHUM 
      Chum.findOne({ name : chum.name }, function(err, doc){
         console.log("err: " + err + "  doc: " + doc);

         if(!err){
            if(!doc){
            //IF NOT FOUND, CREATE
               var newChum = new Chum(chum);

               if(options.surfaced)
                  newChum.path('dateSurfaced').set(Date.now);
                  
               newChum.save(function(err){
                  console.log("__ERROR - Save Chum___" + err);
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

      Skip.findOne({ chumIdr: skip.chumIdr }, function(err,doc) {
         console.log("err: " + err + ", doc: " + doc);

         if (!err) {
            if (!doc) {
               var newSkip = new Skip(skip);
               skip.save(function(err) {
                  console.log("__ERROR - Save Skip__: " + err);
               });
            } else {
               // If found...
            }
         }
      });
   };
   
   return client;
}