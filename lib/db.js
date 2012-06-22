var mongoose = require('mongoose');

module.exports = function(connection){
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
      mongoose.connect(connection);
      console.log('Mongoose connected to: ' + connection);

      var Schema = mongoose.Schema
        , ObjectId = Schema.ObjectId;

      var UserSchema = new Schema({
          sId		      : { type: String, required: true, index: { unique: true, sparse: true } } //SinglyID
        , access_token 	: { type: String, required: true, index: { unique: true, sparse: true } }
        , name          : { type: String, index: true }
        , email         : String
        , subscribed		: String
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
           chumId       : { type: String, required: true, index: true }
         , schedule     : { type: String, index: true }
         , note         : String
         , dateCreated  : { type: Date, default: Date.now }
         , dateModified : { type: Date, default: Date.now }
      });

      var ConnectSchema = new Schema({
      	  chumId 		: { type: String, required: true, index: true }
         , profileIdr	: { type: String, required: true }
         , profileUserId : String
         , subject      : String
         , message      : String
         , statuses		: [StatusSchema]
         , dateCreated  : { type: Date, default: Date.now }
      });

		var StatusSchema = new Schema({
           type    		: String
         , message		: String
         , details		: String
         , dateCreated	: { type: Date, default: Date.now }	
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
      client.Status = mongoose.model('Status', StatusSchema);
   }

   client.saveUser = function(user){
      console.log("___SAVE USER___" + user);

      //FIND USER 
      client.User.findOne({ sId : user.sId }, function(err, doc){
         //console.log("err: " + err + "  doc: " + doc);

         if(!err){
            if(!doc){
            //NOT FOUND, CREATE
               console.log("Create: " + JSON.stringify(user));
               doc = new client.User(user);
               //newUser.profiles.push({ type : "facebook", profileId : user.profiles.facebook });
	         }
	         else {
	         //FOUND, UPDATE
		         doc.sId = user.sId;
		         doc.access_token = user.access_token;
		         doc.name = user.name;
		         doc.email = user.email;
		         doc.subscribed = user.subscribed;
		         doc.dateLast = Date.now();
				}

	         doc.save(function(err){
            	if(err)
               	console.log("__ERROR - saveUser___" + err);
            });

   		}
         else
            console.log("_____MONGO ERROR_____ " + err);

      });
   }

   client.getSubscribedUsers = function(callback){
   	console.log("___GET SUBSCRIBED USERS___");

   	client.User.find({subscribed : "daily"}, ['sId', 'email'], function (err, docs) {

   		if(!err){
   			callback(docs);
   		}
   		else
            console.log("_____MONGO ERROR_____ " + err);

   	});
   }

   client.hasChums = function(userId, callback){
		console.log("___NEXT CHUM___" + userId);

   	//FIND ANY CHUM for UserId
      client.Chum.findOne({ userId : userId }, function(err, doc){
	      if(!err){
   			callback(doc);
   		}
   		else
            console.log("_____MONGO ERROR_____ " + err);
      });
   }

   client.getNextChum = function(userId, callback){
      console.log("___NEXT CHUM___" + userId);
      
      //FIND UNSURFACED CHUM
      client.Chum.findOne({ userId: userId, dateSurfaced : null }, function(err, doc){
         //console.log("err: " + err + "  doc: " + doc);

         if(!err){
            callback(doc);
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
   		else
            console.log("_____MONGO ERROR_____ " + err);
   	});
   }

   client.getChumByName = function(chumName, callback){

   	client.Chum.findOne({ name : chumName }, function(err, doc){
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


   client.addChum = function(chum){
      console.log("___SAVE CHUM___" + chum);

      chum.save(function(err){
      	if(err)
         	console.log("__ERROR - saveChum___" + err);
      });
   }

	client.updateChum = function(chumId, updates){
      console.log("___UPDATE CHUM___" + chumId + "___UPDATES___" +  updates);

		var conditions = { _id : chumId };
		var options = { multi : false };

   	if(updates && updates.surfaced) {
   		var update = { dateSurfaced : Date.now() };
   		client.Chum.update(conditions, update, options, function(err){
   			if(err)
         		console.log("__ERROR - updateChum___" + err);
   		});
   	}
     
   }

   client.addSkip = function(skip, callback) {
      console.log("__ADD SKIP__" + skip);

      skip.save(function(err) {
      	if(err)
      		console.log("__ERROR - addSkip__: " + err);
      		
      	callback(err);
      });

   };

   client.addConnect = function(connect, callback) {
      console.log("__ADD CONNECT__" + connect);

      //Always save a new connect record.
   	
      connect.save(function(err) {
      	if(err)
         	console.log("__ERROR - addConnect__: " + err);

         callback(err);
      });
   }
   
   return client;
}