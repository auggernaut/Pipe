// The URL of the Singly API endpoint
var apiBaseUrl = 'https://api.singly.com';

// A small wrapper for getting data from the Singly API
var singly = {
   get: function(url, options, callback) {
      if (options === undefined ||
         options === null) {
         options = {};
      }

      options.access_token = accessToken;

      $.getJSON(apiBaseUrl + url, options, callback);
   },
   post: function(url, options, callback) {
      if (options === undefined ||
         options === null) {
         options = {};
      }

      url = url + "?access_token=" + accessToken;

      $.post(apiBaseUrl + url, options, callback, 'json');
   }
};

var twitter = {
	post: function(url, options, callback) {
		if (options === undefined || options === null) {
			options = {};
		}

		url = 'https://api.twitter.com/1' + url + '?'
	}
}