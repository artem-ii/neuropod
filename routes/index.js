const express = require('express');
const router = express.Router();
const {FusionAuthClient} = require('@fusionauth/typescript-client');

// tag::clientIdSecret[]
// set in the environment or directly
const clientId = process.env.CLIENT_ID; // or set directly
const clientSecret = process.env.CLIENT_SECRET; // or set directly
// end::clientIdSecret[]

// tag::baseURL[]
const fusionAuthURL = process.env.BASE_URL;
// end::baseURL[]

const client = new FusionAuthClient('noapikeyneeded', fusionAuthURL);
const pkceChallenge = require('pkce-challenge');

// tag::logoutRoute[]
/* logout page. */
router.get('/logout', function (req, res, next) {
  req.session.destroy();
  res.redirect(302, '/');
});
// end::logoutRoute[]

var request = require('request');
var code={};

// TODO! Re-write this link generating middleware properly!
router.get('/newlink', function (req, res, next) {
  console.log('\nPreparing request for study link generation...')
  // Need to re-write this properly
  // Firstly request and response need to be properly handled by the middleware itself
  // secondly the page should be rendered after response from JATOS is received
  let currentUser = req.session.user.id
  code[currentUser] = '';
  // Make a for loop here to generate 4 links
  // TODO! make JATOS randomize order
  // Simplest option with random order is to create many studies with different order of tasks and then randomize selection
  // Three ranges of ids - with first, second and third parts of assessment
  req.session.user['studyCode'] = [];
  for (let id = 1; id < 5; id++){
    let currentUser = req.session.user.id
    var clientServerOptions = {
      uri: 'http://localhost:9000/jatos/api/v1/studies/' + id + '/studyCodes?type=ps&comment=' + req.session.user.id,
      method: 'GET',
      headers: {
          'Authorization': 'Bearer jap_iEyoy7mHutshBOQTPgtaV4QhcL3kYyKcd3b44'
        }
      }
    request(clientServerOptions, function (error, response) {
        if (error === null) {
          console.log('Request processed by JATOS with no errors');
        }
        console.log(JSON.parse(response.body).data[0]);
        req.session.user['studyCode'].push(JSON.parse(response.body).data[0]);
        console.log("Study link generated");
        console.log("Data saved");
        //req.session.user['studyCode'] = code[currentUser];
        //console.log(res)
        return;
    });
    setTimeout(() => {
      console.log("link #" + id +"...");
    }, "1");
  };
  
  code[currentUser] = req.session.user['studyCode'];
  next();
}, (req, res, next) => {res.redirect(302, '/')});

/* GET home page. */
router.get('/', function (req, res, next) {
  const stateValue = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  req.session.stateValue = stateValue;
  
  //generate the pkce challenge/verifier dict
  const pkce_pair = pkceChallenge.default();
  // Store the PKCE verifier in session
  req.session.verifier = pkce_pair['code_verifier'];
  const challenge = pkce_pair['code_challenge'];
  //console.log(typeof(req.session.user));
  //console.log(typeof(JSON.stringify(req.session.user)));
  //console.log(req.session.user);
  //console.log(code.user_code);
  var test = JSON.stringify(req.session.user);
  //test = JSON.parse(test); // WHY IS THIS UNDEFINED???
  if (req.session.user) {
    console.log('In GET /');
    console.log(req.session.user.studyCode)
    //console.log('user is' + req.session.user !== undefined);
    //console.log(code)
    let currentUser = req.session.user.id
    var userStudyCode = code[currentUser]
    //var test = getLink(req.session.user.id);
    console.log("\nUser data received, rendering home page...");
    console.log('\nUser ' + req.session.user.email + '\ngot a study link ' + req.session.user.studyCode + '\n')
    };
  res.render('index', {
    user: req.session.user,
    title: 'Welcome to neuroPOD',
    clientId: clientId,
    challenge: challenge,
    stateValue: stateValue,
    fusionAuthURL: fusionAuthURL,
    studyCode: userStudyCode
  });
});

// tag::fullOAuthCodeExchange[]
/* OAuth return from FusionAuth */
router.get('/oauth-redirect', function (req, res, next) {
  console.log('\nUser trying to log in.')
  console.log('Authentication...');
  const stateFromServer = req.query.state;
  if (stateFromServer !== req.session.stateValue) {
    console.log("State doesn't match. uh-oh.");
    console.log("Saw: " + stateFromServer + ", but expected: " + req.session.stateValue);
    res.redirect(302, '/');
    return;
  }

// tag::exchangeOAuthCode[]
  // This code stores the user in a server-side session
 client.exchangeOAuthCodeForAccessTokenUsingPKCE(req.query.code,
                                                 clientId,
                                                 clientSecret,
                                                 'http://localhost:3000/oauth-redirect',
                                                 req.session.verifier)
// end::exchangeOAuthCode[]
      .then((response) => {
        //console.log(response.response.access_token);
        return client.retrieveUserUsingJWT(response.response.access_token);
      })
      .then((response) => {
// tag::setUserInSession[]
        req.session.user = response.response.user;
        return response;
      })
// end::setUserInSession[]
      .then((response) => {
        res.redirect(302, '/newlink');
      }).catch((err) => {console.log("in error"); console.error(JSON.stringify(err));});
      console.log('\nProceeding to link generation request...');

});
// end::fullOAuthCodeExchange[]

  // This code can be set in the last promise above to send the access and refresh tokens
  // back to the browser as secure, HTTP-only cookies, an alternative to storing user info in the session
  //     .then((response) => {
  //       res.cookie('access_token', response.response.access_token, {httpOnly: true});
  //       res.cookie('refresh_token', response.response.refresh_token, {httpOnly: true});
  //       res.redirect(302, '/');
  //     }).catch((err) => {console.log("in error"); console.error(JSON.stringify(err));});

module.exports = router;
