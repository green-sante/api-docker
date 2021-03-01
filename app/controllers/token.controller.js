var config = require('../config'); // get our config file
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens

exports.getToken = async (user) => {
    var token = jwt.sign({
        'email':user.email, 
        'password':user.password, 
        'user_id':user.user_id, 
        'enabled':user.enabled,
        "isadmin" : user.isadmin, 
    }, app.get('superSecret'), {
        expiresIn: config.token_days_validity+" days"// expires in X days
    });
    return token;
}