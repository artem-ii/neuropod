var request = require('request');
function getLink(user){
        var clientServerOptions = {
            uri: 'http://localhost:9000/jatos/api/v1/studies/1/studyCodes?type=ps&comment=' + user,
            method: 'GET',
            headers: {
                'Authorisation': 'Bearer jap_iEyoy7mHutshBOQTPgtaV4QhcL3kYyKcd3b44',
                'Content-Type': 'application/json'
            }
        }
        request(clientServerOptions, function (error, response) {
            console.log(error,response.body);
            let code = response.body.data[0];
            return 'code';
        });
    };
module.exports = get-jatos-link;