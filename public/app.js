// Runs after the page has loaded
$(function() { 
   
   //Initialize our Ember.js app
   var App;
   window.App = App = Ember.Application.create();

   /* Models */
   App.Me = Ember.Object.extend({
      accessToken : null,
      services : [],
      firstname : null,
      lastname : null,
      settings : []
   });

   App.Friend = Ember.Object.extend({
      id : null,
      firstName : "",
      lastName : "",
      fullName: Ember.computed(function(key, value) {
          // getter
          if (arguments.length === 1) {
            var firstName = this.get('firstName');
            var lastName = this.get('lastName');
            return firstName + ' ' + lastName;
          // setter
          } else {
            var name = value.split(" ");
            this.set('firstName', name[0]);
            this.set('lastName', name[1]);
            return value;
          }
       }).property('firstName', 'lastName'),
      services : null,
      photo : null,
      description : null,
      location : null,
      profession : null,
      activity : null,
      notes : null,
      email : null,
      tagline : null
   });
   /* End Models */






   /* Views */
   App.FriendView = Ember.View.extend({
      friendBinding: 'App.friendController.content', 
      alertBinding : 'App.friendController.alert',
      //activityBinding : 'App.activityController.content',
      //notesBinding : 'App.notesController.content',
      connect : function(evt) {
         //App.friendController.set('content', this.get('content'));
         App.stateManager.goToState('connectView');
      },
      skip : function(evt) {
         //App.activityController.set('friendId', this.get('content').id);
         App.stateManager.goToState('skipView');
      }
   });

   App.ConnectView = Ember.View.extend({
      friendBinding : 'App.friendController.content',
      send : function(evt) {
         App.activityController.set('friendId', this.get('content').id);
         //alert($("#messageText").val());

         if(App.friendController.connectVia == "linkedin")
         {
            singly.post('/proxy/linkedin/people/~/mailbox', {
               "recipients": {
                  "values": [
                     {
                        "person": {
                           "_path": "/people/" + friendId,
                        }
                     }
                  ]
               },
               "subject": "Catching up through Pipe!",
               "body": "Would love to catch up again."
            }, function(data, textStatus, jqXHR) {
               App.friendController.set("alert", "Message Sent!");
               App.stateManager.goToState('friendView');
            });
         }

         if (App.friendController.connectVia == "twitter")
         {
            singly.post('/proxy/twitter/direct_messages/new.json', {
               "screen_name": "surgemd",
               "text": "Test message"
            }, function(data, textStatus, jqXHR) {
               App.friendController.set("alert", "Message sent!");
               App.stateManager.goToState('friendView');
            });
         }

         App.friendController.set("alert", "Message Sent!");
         App.stateManager.goToState('friendView');
      },
      selectOne : function(evt) {
         $("#subject").css("display", "none");
         App.friendController.set("connectVia", "linkedin");
      },
      selectTwo : function(evt) {
         $("#subject").css("display", "none");
         App.friendController.set("connectVia", "twitter");
      },
      selectThree : function(evt) {
         $("#subject").css("display", "none");
         App.friendController.set("connectVia", "facebook");
      },
      selectFour : function(evt) {
         $("#subject").css("display", "inline");
         App.friendController.set("connectVia", "email");
      }
   });

   App.SkipView = Ember.View.extend({

   });
   /* End Views */






   
   /* Controllers */
   App.set("meController", Ember.Object.create({
      content: null,
      populate: function(){

         /**** TODO *****/
         //POPULATE ME WITH MORE PROFILE DETAILS

         var me = App.Me.create();
         me.set("accessToken", accessToken);
         //me.set("")
         console.log(me);
         this.set("content", me);
      }
   }));

   App.set("friendController", Ember.Object.create({
      content : null,
      alert : null,
      populate : function(){

         var servArr = [];
         var friend = App.Friend.create();
         $.getJSON('/findFriends', null, function(details){
            console.log("Details for user\n" + details);

            if(details[0]){
            //LinkedIn
               friend.set("fullName", details[0].data.firstName + " " + details[0].data.lastName);
               friend.set("description", (details[0].data.bio) ?  details[0].data.bio : details[0].data.headline);
               
               friend.set("photo", details[0].data.pictureUrl);
               friend.set("location", details[0].data.location.name);
               friend.set("profession", details[0].data.industry);
               
               friend.set("tagline", details[0].data.headline);

               servArr["linkedin"] = details[0].data.id;
               friend.set("services", servArr);
            }
            if(details[1]){
            //Twitter
               $.getJSON('/getFriend', {"service":"twitter","id":details[1]}, function(twitUser){
                  friend.set("activity", twitUser.status);
                  servArr["twitter"] = twitUser.username;
                  friend.set("services", servArr);
               });
            }
            if(details[2]){
            //Facebook
               $.getJSON('/getFriend', {"service":"facebook","id":details[2]}, function(fbUser){
                     console.log(fbUser);
                     friend.set("activity", fbUser.status);
                     friend.set("description", fbUser.description);
               });  
            }
            if(details[3]){
            //GContacts
               friend.set("email", details[3]);
               servArr["gcontacts"] = details[3];
               friend.set("services", servArr);
            }
            
            /*

            var services = {
               "one" : "linkedin",
               "two" : (details[1]) ? "twitter" : null,
               "three" : (details[2]) ? "facebook" : null,
               "four" : (details[3]) ? "email" : null
            }
            friend.set("services", services);
            */
            
         });

         this.set("content", friend);

      }
   }));
   /* End Controllers */










   /* States */
   App.stateManager = Ember.StateManager.create({
      rootElement: '#app',
      initialState: 'friendView',
      friendView: Ember.ViewState.create({
         enter: function(stateManager) {
            this._super(stateManager);
            App.friendController.populate();
         },

         view: Ember.View.create({
               templateName: 'friend'
             })
      }),
      connectView: Ember.ViewState.create({
         enter: function(stateManager) {
            this._super(stateManager);
         },

         view: Ember.View.create({
               templateName: 'connect'
             })
      }),
      skipView: Ember.ViewState.create({
         enter: function(stateManager) {
            this._super(stateManager);
         },

         view: Ember.View.create({
               templateName: 'skip'
             })
      })
      
   });
   /* End States */


});
