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
         if ($('#name').html().split('</script>')[1].split('<script')[0] == " ")
            return;
         App.stateManager.goToState('connectView');
         mixpanel.track('connect clicked');
      },
      skip : function(evt) {
         //App.activityController.set('friendId', this.get('content').id);
         App.stateManager.goToState('skipView');
         mixpanel.track('skip clicked');
      }
   });

   App.ConnectView = Ember.View.extend({
      friendBinding : 'App.friendController.content',
      servicesBinding : 'App.friendController.services',
      send : function(evt) {
         switch (App.friendController.get("connectVia")) {
            case "twitter":
               this.sendTwitter(evt);
               break;
            case "linkedin":
               this.sendLinkedIn(evt);
               break;
            case "mail":
               this.sendMail(evt);
               break;
         }
      },
      sendMail : function(evt) {
         //App.activityController.set('friendId', this.get('content').id);
         App.friendController.set("alert", this.get('friend').services['linkedin']);
         App.stateManager.goToState('friendView');
         mixpanel.track('mail-sent');
      },
      sendLinkedIn : function(evt){
         singly.post('/proxy/linkedin/people/~/mailbox', {
               "recipients": {
                  "values": [
                     {
                        "person": {
                           "_path": "/people/" + this.get('friend').services['linkedin'],
                        }
                     }
                  ]
               },
               "subject": $("#subject").val() + "",
               "body": $("#messageText").val() + ""
            }, function(data, textStatus, jqXHR) {
               App.friendController.set("alert", "LinkedIn message sent!");
               App.stateManager.goToState('friendView');
            });
         mixpanel.track('linkedin sent');
      },
      sendTwitter : function(evt){
         console.log(this.get('friend'));
         singly.post('/proxy/twitter/direct_messages/new.json', {
               "screen_name": this.get('friend').services['twitter'],
               "text": $("#messageText").val()
            }, function(data, textStatus, jqXHR) {
               console.log(data);
            console.log(textStatus);
               App.friendController.set("alert", "Twitter message sent!");
               App.stateManager.goToState('friendView');
            });
         mixpanel.track('twitter sent');
      },
      selectMail : function(evt) {
         App.friendController.set("connectVia", "mail");
         $('#subject').show();
         $('#mail').attr('src','img/social_networks/gcontacts_blue.png');
         $('#linkedin').attr('src', 'img/social_networks/linkedin_grey.png');
         $('#twitter').attr('src', 'img/social_networks/twitter_grey.png');
         mixpanel.track('mail selected');
      },
      selectLinkedIn : function(evt) {
         App.friendController.set("connectVia", "linkedin");
         $('#subject').show();
         $('#mail').attr('src','img/social_networks/gcontacts_grey.png');
         $('#linkedin').attr('src', 'img/social_networks/linkedin_blue.png');
         $('#twitter').attr('src', 'img/social_networks/twitter_grey.png');
         mixpanel.track('linkedin selected');
      },
      selectTwitter : function(evt) {
         App.friendController.set("connectVia", "twitter");
         $('#subject').hide();
         $('#mail').attr('src','img/social_networks/gcontacts_grey.png');
         $('#linkedin').attr('src', 'img/social_networks/linkedin_grey.png');
         $('#twitter').attr('src', 'img/social_networks/twitter_blue.png');
         mixpanel.track('twitter selected');
      }
   });

   App.SkipView = Ember.View.extend({
      friendBinding : 'App.friendController.content',
      submit : function(evt) {
         App.stateManager.goToState('friendView');
      }
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

         console.log("-----");

         $.getJSON('/next', null, function(details){

            friend.set("fullName", details.name);
            friend.set("description", details.description);
            friend.set("photo", details.photo);
            $("#imagecontainer").css("background-image", "url('" + details.photo + "')");
            friend.set("location", details.location);
            friend.set("profession", details.profession);
            friend.set("tagline", details.tagline);
            friend.set("servicesIds", details.services);
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
            $('body').addClass('feed');
         },

         view: Ember.View.create({
               templateName: 'friend'
             })
      }),
      connectView: Ember.ViewState.create({
         enter: function(stateManager) {
            this._super(stateManager);
            $('body').addClass('feed');
         },

         view: Ember.View.create({
               templateName: 'connect'
             })
      }),
      skipView: Ember.ViewState.create({
         enter: function(stateManager) {
            this._super(stateManager);
            $('body').addClass('feed');
         },

         view: Ember.View.create({
               templateName: 'skip'
             })
      })
      
   });
   /* End States */


});
