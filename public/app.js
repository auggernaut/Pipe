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
      firstName : null,
      lastName : null,
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
      services : [],
      photo : null,
      description : null,
      location : null,
      profession : null,
      activity : null,
      notes : null
   });
   /* End Models */






   /* Views */
   App.FriendView = Ember.View.extend({
      friendBinding: 'App.friendController.content', 
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
      servicesBinding : 'App.Friend.services'
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
      populate : function(){

         var friend = App.Friend.create();
         $.getJSON('/friend', null, function(details){
            console.log(details);

            
            friend.set("fullName", details.name);
            friend.set("description", details.description);
            friend.set("activity", details.status);
            friend.set("photo", details.photo);
            friend.set("location", details.location);
            friend.set("profession", details.profession);
            
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
