 $.getJSON('/findFriends', null, function(details){
            console.log("Details for user\n" + details);

            if(details[0]){
            //LinkedIn
               friend.set("fullName", details[0].data.firstName + " " + details[0].data.lastName);
               friend.set("description", (details[0].data.bio) ?  details[0].data.bio : details[0].data.headline);
               
               friend.set("photo", details[0].data.pictureUrl);
               //friend.set("photo", "/img/team/" + details[0].data.firstName+".jpg")
               //$("#imagecontainer").css("background-image", "url('/img/team/" +details[0].data.firstName+".jpg')");
               //$("#imagecontainer").css("background-image", "url('/img/team/" +details[0].data.firstName+".jpg')");
               $("#imagecontainer").css("background-image", "url('" + details[0].data.pictureUrl + "')");
               
               friend.set("location", details[0].data.location.name);
               friend.set("profession", details[0].data.industry);
               
               friend.set("tagline", details[0].data.headline);

               servArr["linkedin"] = details[0].data.id;
               friend.set("services", servArr);
            }
            if(details[1]){
            //Twitter
               $.getJSON('/getFriend', {"service":"twitter","id":details[1]}, function(twitUser){
                  console.log(twitUser);
                  var jTwit = twitUser;//JSON.parse(twitUser);
                  friend.set("photo", details[1].photo);
                  friend.set("activity", jTwit.status);
                  console.log("twitter " + jTwit.username);
                  servArr["twitter"] = jTwit.username;
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