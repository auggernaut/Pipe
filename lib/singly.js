var request = require('request');
var querystring = require('querystring');
var apiBaseUrl = 'https://api.singly.com';

module.exports = function(clientId, clientSecret, redirectURI) {
  var client = {};

  client.getAuthorizeURL = function(service) {
    return apiBaseUrl + '/oauth/authorize?' + querystring.stringify({
      client_id: clientId,
      redirect_uri: redirectURI,
      service: service
    });
  }

  client.getAccessToken = function(code, callback) {
    var data = {
       client_id: clientId,
       client_secret: clientSecret,
       code: code
    };

    request.post({
       uri: apiBaseUrl + '/oauth/access_token',
       body: querystring.stringify(data),
       headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
       }
    }, function (err, resp, body) {
      if(err) return callback(err, body);
      try {
        console.log(body);
        body = JSON.parse(body);
        callback(undefined, body.access_token);
      } catch(parseErr) {
        callback(err, body);
      }
    });
  }

  client.apiCall = function(path, params, callback) {
    var uri = apiBaseUrl + path + '?' + querystring.stringify(params);
    console.log("singly.apiCall.uri: " + uri);
    request.get({uri:uri, json:true}, function(err, resp, json) {
      callback(err, json);
    });
  }

  client.apiCallPost = function(path, params, body, callback) {
    var uri = apiBaseUrl + path + '?' + querystring.stringify(params);
    console.log("singly.apiCallPost.uri: " + uri);

    request.post(
      {
        headers: {'content-type' : 'application/json'},
        url: uri,
        body: JSON.stringify(body)
      }, 
      function(error, response, body){
        callback(error, response);
      }
    );
  }

  return client;
}