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

   App.Slice = Ember.Object.extend({
      id : null,
      name : null,
      photo : null,
      tagCloud : null,
      lastActivity : null,
      lastNote : null,
      timeRemaining : null
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
      profiles : [],
      photo : null,
      description : null
   });

   App.Activity = Ember.Object.extend({
      id : null,
      application : null,
      service : null,
      text : null,
      embed : null
   });

   App.Note = Ember.Object.extend({
      id : null,
      text : null,
      date : null
   });
   /* End Models */










   /* Views */
   App.AuthView = Ember.View.extend({
      meBinding : 'App.meController.content',
      acceptAuth : function(evt){
         // If there was no access token defined then return
         if (accessToken === 'undefined' ||
            accessToken === undefined) {
            $('#authMessage').css('display', 'block');
         }
         else
         {
            App.stateManager.goToState("pipeView");
         }
      }
   });

   App.PipeView = Ember.View.extend({
      pipeBinding: 'App.pipeController.content',
      movePipeUp: function(){},
      movePipeDown: function(){} 
   });

   App.SliceView = Ember.View.extend({
      click : function(evt) {
         App.pipeController.set('selected', this.get('content'));
      },
      viewDetails : function(evt) {
         App.detailsController.set('content', this.get('content'));
         App.stateManager.goToState('detailsView');
      },
      viewActivity : function(evt) {
         App.activityController.set('friendId', this.get('content').id);
         App.stateManager.goToState('activityView');
      },
      viewNotes : function(evt) {
         App.notesController.set('friendId', this.get('content').id);
         App.stateManager.goToState('notesView');
      },
      classNameBindings : "isSelected",
      isSelected : function() {
         return App.pipeController.get('selected') == this.get('content');
      }.property('App.pipeController.selected')
   });

   App.DetailsView = Ember.View.extend({
      detailsBinding: 'App.detailsController.content',  
  });

   App.ActivityView = Ember.View.extend({
      activityBinding : 'App.activityController.content'
   });

   App.NotesView = Ember.View.extend({
      notesBinding : 'App.notesController.content'
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

   App.set("pipeController", Ember.Object.create({
      content: [],
      selected: null,
      populate: function(){

         /**** TODO *****/
         //DETERMINE NEXT TWO WEEKS OF FRIENDS TO CONTACT
         //CREATE SLICES
         //ORDER BY TIME REMAINING
         //SET SELECTED

         /***** TEMPORARY ******/
         //Set 3 predefined friends
         var slices = [];
         var friendIds = ["df3c7dcc06a34f0548cc58682b17be11_a8ed5a2d9", "d89b0311c4c7c1e457edf2b2e8e0d829_a8ed5a2d9", "46d13b4ce2ff35bf7aba02823308805b_a8ed5a2d9"];
         for (var i = 0, friendId; friendId = friendIds[i++];) {
            singly.get('/id/' + friendId, null, function(item) {
                  var slice = App.Slice.create();
                  console.log(item);
                  slice.set("name", item.data.name);   
                  slice.set("id", item.id);
                  slices.pushObject(slice);
            });
         }
         this.set("content", slices);
         //Set random Activities for each
         //Set random Notes for each
         //Set Selected
         this.set("selected", this.get("content")[1]);

      }
   }));


   App.set("detailsController", Ember.Object.create({
      content : null,
      populate : function(){

         /***** TODO *******/
         // GET DETAILS OF FRIEND FROM ALL SERVICES

         /***** TEMPORARY ******/
         var contactId = this.get("content").id;
         var friend = App.Friend.create();
         singly.get('/id/' + contactId, null, function(item) {
                  //console.log(item); 
                  friend.set("fullName", item.data.name);   
                  friend.set("id", item.id);
            });

         this.set("content", friend);
      }
   }));

   App.set("activityController", Ember.Object.create({
      content : [],
      friendId : null,
      populate : function(){

         /***** TODO *******/
         // GET ACTIVITIES OF FRIEND FROM ALL SERVICES

         /***** TEMPORARY ******/         
         //console.log(this.get("friendId"));
         var activityArr = [];

         singly.get('/types/statuses_feed', {limit: 50}, function(statuses){
            _.each(statuses, function(status){
               //console.log(status);
               var activity = App.Activity.create();
               activity.set("text", status.data.text);
               activityArr.pushObject(activity);
            });
         });

         this.set("content", activityArr);
      }
   }));

   App.set("notesController", Ember.Object.create({
      content : [],
      friendId : null,
      populate : function(){
         
         /***** TODO *******/
         // GET NOTES ON FRIEND

         /***** TEMPORARY ******/  
         var note1 = App.Note.create();
         note1.set("id", 1);
         note1.set("text", "Meet this guy at the Singly hackathon. He's a node guru.");
         note1.set("date", "6/1/2012")  ;

         var note2 = App.Note.create();
         note2.set("id", 2);
         note2.set("text", "He joined my team!");
         note2.set("date", "6/1/2012");

         this.set("content", [note1, note2]);
           
      }

   }));
   /* End Controllers */










   /* States */
   App.stateManager = Ember.StateManager.create({
      rootElement: '#app',
      initialState: 'authView',
      authView: Ember.ViewState.create({
         enter: function(stateManager){
            this._super(stateManager);
            App.meController.populate();
         },

         view: Ember.View.create({
               templateName: 'auth'
            })
      }),
      pipeView: Ember.ViewState.create({
         enter: function(stateManager) {
            this._super(stateManager);
            App.pipeController.populate();
         },

         view: Ember.View.create({
               templateName: 'pipe'
             })
      }),
      detailsView: Ember.ViewState.create({
         enter: function(stateManager) {
            this._super(stateManager);
            App.detailsController.populate();
         },

         view: Ember.View.create({
               templateName: 'details'
             })
      }),
      activityView: Ember.ViewState.create({
         enter: function(stateManager) {
            this._super(stateManager);
            App.activityController.populate();
         },

         view: Ember.View.create({
               templateName: 'activity'
             })
      }),
      notesView: Ember.ViewState.create({
         enter: function(stateManager) {
            this._super(stateManager);
            App.notesController.populate();
         },

         view: Ember.View.create({
               templateName: 'notes'
             })
      })
      
   });
   /* End States */


});
