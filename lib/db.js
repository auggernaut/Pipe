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
        , profiles      : String
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
        //, dateTouched	: { type: Date }
        , dateModified  : { type: Date, default: Date.now }
        , userId          : String
        //Not sure yet how to use references to other db objects
        //{ type: Schema.ObjectId, ref: 'User', required: true }
      });

      var ProfileSchema = new Schema({
           idr    		: String
         , type			: String
         , userId			: String
         , link			: String
      });

      var PhotoSchema = new Schema({
      		type			: String
      	,	url         : String
      	, 	link			: String
      });

      var SkipSchema = new Schema({
           chumIdr      : { type: Schema.ObjectId, ref: 'Chum', required: true }
         , schedule     : { type: String, index: true }
         , note         : String
         , dateCreated  : { type: Date, default: Date.now }
         , dateModified : { type: Date, default: Date.now }
      });

      var ConnectSchema = new Schema({
           profileIdr	: { type: String, required: true }
         , profileUserId : String
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
      client.User.findOne({ sId : user.sId }, function(err, doc){
         //console.log("err: " + err + "  doc: " + doc);

         if(!err){
            if(!doc){
            //IF NOT FOUND, CREATE
               console.log("Create: " + JSON.stringify(user));
               var newUser = new client.User(user);
               //newUser.profiles.push({ type : "facebook", profileId : user.profiles.facebook });
               newUser.save(function(err){
               	if(err)
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

            /*
            if(doc){
	            doc.dateSurfaced = Date.now();
	                  
	            doc.save(function(err){
	            	if(err)
	               	console.log("__ERROR - getNextChum___" + err);
	            });
         	}*/
         }
         else
            console.log("_____MONGO ERROR_____ " + err);

      });
   }

   client.getChumById = function(chumId, callback){

   	client.Chum.findOne({ _id : chumId }, function(err, doc){
   		if(!err){
   			callback(doc);
   		}
   	});
   }

   client.getChumByName = function(chumName, callback){

   	client.Chum.findOne({ name : chumName }, function(err, doc){
   		if(!err){
   			callback(doc);
   		}
   	});
   }


   client.getOffset = function(userId, callback){
      console.log("___GET OFFSET___" + userId);
      callback(1);
   }


   client.saveChum = function(chum, updates){
      console.log("___SAVE CHUM___" + chum + "___UPDATES___" +  updates);

      //FIND CHUM 
      client.Chum.findOne({ name : chum.name }, function(err, doc){
         //console.log("err: " + err + "  doc: " + doc);

         if(!err){
            if(!doc){
            //IF NOT FOUND, CREATE
               //var newChum = new client.Chum(chum);
               chum.save(function(err){
               	if(err)
                  	console.log("__ERROR - saveChum___" + err);
               });
            }
            else{
            //IF FOUND, MERGE/UPDATE
					var conditions = { _id : chum._id };
					var options = { multi : false };

            	if(updates && updates.surfaced) {
            		var update = { dateSurfaced : Date.now() };
            		client.Chum.update(conditions, update, options, function(err){
            			if(err)
                  		console.log("__ERROR - updateChum___" + err);
            		});
            	}
     
            }
         }
         else
            console.log("_____MONGO ERROR_____ " + err);
      })
   }

   client.saveSkip = function(skip, updates) {
      console.log("__SAVE SKIP__" + skip + "__OPTIONS__" + updates);

      client.Skip.findOne({ chumIdr: skip.chumIdr }, function(err,doc) {
         //console.log("err: " + err + ", doc: " + doc);

         if (!err) {
            if (!doc) {
               skip.save(function(err) {
               	if(err)
                  	console.log("__ERROR - saveSkip__: " + err);
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
   	
      connect.save(function(err) {
      	if(err)
         	console.log("__ERROR - saveConnect__: " + err);
      });
   }
   
   return client;
}