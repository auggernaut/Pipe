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
      email : null
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
               "subject": "Hi Bob",
               "body": "Would love to catch up again."
            }, function(data, textStatus, jqXHR) {
               console.log(data);
               console.log(textStatus);
               App.friendController.set("alert", "Message Sent!");
               App.stateManager.goToState('friendView');
            })
         }

         //App.friendController.set("alert", "Message Sent!");
         App.friendController.set("alert", "Stuff");//App.friendController.connectVia);
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

         var friend = App.Friend.create();
         $.getJSON('/friend', null, function(details){
            console.log(details);

            
            friend.set("fullName", details[0].data.firstName + " " + details[0].data.lastName);
            friend.set("description", details[0].data.headline);
            friend.set("activity", details[1] && details[1].status);
            friend.set("photo", details[0].data.pictureUrl);
            friend.set("location", details[0].data.location.name);
            friend.set("profession", details[0].data.industry);
            friend.set("email", details[3]);

            var services = {
               "one" : "linkedin",
               "two" : (details[1]) ? "twitter" : null,
               "three" : (details[2]) ? "facebook" : null,
               "four" : (details[3]) ? "email" : null
            }
            friend.set("services", services);
            
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
