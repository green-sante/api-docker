var config = require('./config'); // get our config file
var crypto = require('crypto');
const fs = require("fs");
const { insertFile } = require("./queries/tools.queries");
const ControlData = require('./ControlData.js');
var dateFormat = require('dateformat');

// Require `PhoneNumberFormat`.
const PNF = require('google-libphonenumber').PhoneNumberFormat;
// Get an instance of `PhoneNumberUtil`.
const phoneUtil = require('google-libphonenumber').PhoneNumberUtil.getInstance();

var ovh = require('ovh')({
    endpoint: 'ovh-eu',
    appKey: config.ovhtelecom.ApplicationKey,
    appSecret: config.ovhtelecom.ApplicationSecret,
    consumerKey: config.ovhtelecom.ConsumerKey
});

// ovh.request('POST', '/auth/credential', {
//     'accessRules': [
//         { 'method': 'GET', 'path': '/*' },
//         { 'method': 'POST', 'path': '/*' },
//         { 'method': 'PUT', 'path': '/*' },
//         { 'method': 'DELETE', 'path': '/*' }
//     ]
// }, function (error, credential) {
//     console.log(error || credential);
// });

// var ovh = require('ovh')({
//     endpoint: 'ovh-eu',
//     appKey: "MOWo5E7c6obgUgQP",
//     appSecret: "n2l6Yn5y0GVWsKtRU721594Jo2JL3MGJ",
//     consumerKey: "wFrqn8SuoWoikKZoZZDj12BttzYGv9H9"
// });

//this.sendSMS("0033614367662", "BLABLA Bienvenue chez Green Santé, votre nouvelle mutuelle d'entreprise, merci de cliquer sur ce lien pour vous affilier");

module.exports = {
    getRandomInt: function (max) {
        return Math.floor(Math.random() * Math.floor(max));
    },

    merror: function (res, req, err, msg, num = 400) {
        console.log(msg, err.sqlMessage);
        console.log(err.sql);
        res.status(num).json({
            action: req.url,
            method: req.method,
            message: "SQL Error"
        });
        //if (email)
        //send_error_email(msg+"\n"+err.sqlMessage+"\n"+err.sql);
    },
    mwarn: function (res, req, msg, num = 405) {
        res.status(num).json({
            action: req.url,
            method: req.method,
            message: msg
        });
    },
    encrypt: function (text) {
        let iv = crypto.randomBytes(config.crypto_IV_LENGTH);
        let cipher = crypto.createCipheriv(config.crypto_algorithm, config.crypto_ENCRYPTION_KEY, iv);
        let encrypted = cipher.update(text);
        encrypted = Buffer.concat([encrypted, cipher.final()]);
        return iv.toString('hex') + ':' + encrypted.toString('hex');
    },
    decrypt: function (text) {
        let textParts = text.split(':');
        let iv = Buffer.from(textParts.shift(), 'hex');
        let encryptedText = Buffer.from(textParts.join(':'), 'hex');
        let decipher = crypto.createDecipheriv(config.crypto_algorithm, config.crypto_ENCRYPTION_KEY, iv);
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    },
    expiration_timestamp_get: function () {
        var expiration = new Date();
        var expiration = parseInt(expiration.setTime(expiration.getTime() + config.token_days_validity * 86400000) / 1000);
        return expiration;
    },
    sameDay: function (d1, d2) {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    },
    diffdays: function (date1, date2) {
        var timeDiff = Math.abs(date2.getTime() - date1.getTime());
        var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24));
        return (diffDays);
    },
    truncate: function (string, length) {
        if (string.length > length)
            return string.substring(0, length) + '...';
        else
            return string;
    },
    toTimestamp: function (strDate) {
        var datum = Date.parse(strDate);
        return datum / 1000;
    },
    logaccess: function (user_id, type) {
        var q = "INSERT INTO `logaccess` (`date`, `user_id`, `type`, `args`) VALUES (CURRENT_TIMESTAMP, '" + user_id + "', '" + type + "', '')";
        //mlog(q);
        connection.query(
            q, function (err, rows) {
                if (err) {
                    console.log('error loginsert', err.sqlMessage);
                    console.log(err.sql);
                    send_error_email("error loginsert\n" + err.sqlMessage + "\n" + err.sql);
                }
            });
    },
    push_update_player: function (user_id, player_id) {
        mlog("Update playerid:" + player_id);
        mlog("user_id:" + user_id);

        var q = 'REPLACE INTO push_players ' +
            /*var q = 'INSERT INTO push_players ' +*/
            '(user_id, player_id, last_seen) ' +
            'VALUES (' + user_id + ',"' + player_id + '", NOW())';
        mlog(q);
        var vendorsarray = [];
        connection.query(
            q, function (err, user) {
                if (err) throw err;
                mlog("player_id SAVED OK");
            });
    },
    calcAge: function (dateString) {
        var birthday = +new Date(dateString);
        return ~~((Date.now() - birthday) / (31557600000));
    },
    formatBytes: function (a, b = 2) {
        if (0 === a) return "0 Bytes";
        const c = 0 > b ? 0 : b, d = Math.floor(Math.log(a) / Math.log(1024));
        return Math.round(parseFloat((a / Math.pow(1024, d)).toFixed(c))) + " " + ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"][d]
    },
    strToBool: function (s) {
        // will match one and only one of the string 'true','1', or 'on' rerardless
        // of capitalization and regardless off surrounding white-space.
        //
        regex = /^\s*(true|1|on)\s*$/i
        return regex.test(s);
    },
    saveFileOnDisk: function (user_id, filedata) {
        let filedir = dateFormat(new Date(), "yyyy-mm") + "/"; // REPERTOIRE DU MOIS
        let filelocation = config.www_filedirectory + filedir; // DIR EXACT OU STOCKER LES ENVOIS

        // CREATION DU REPERTOIRE DU MOIS SI IL N EXISTE PAS
        if (!fs.existsSync(filelocation)) {
            fs.mkdir(filelocation, (err) => {
                if (err) return console.error(err);
                console.log('Directory ' + filelocation + ' created successfully!');
            });
        }

        //console.log("filedata", filedata)

        if (!filedata)
            return ({ result: false, error: "No files were uploaded." });

        for (let i = 0; i < 500; i++) {
            var filename = user_id + "_" + i + "_" + filedata.name;
            filename = this.encrypt(filename);
            if (!fs.existsSync(filelocation + filename)) {
                //file not exists

                if (typeof filedata.mv === 'function') { // Si envoyer par HTTP POST
                    filedata.mv(filelocation + filename, function (err) {
                        if (err)
                            return ({ result: false, error: 'error post user file (mv)', err: err });
                    });
                } else {
                    //fs.writeFile(filelocation+filename, filedata.data.data, { encoding: filedata.data.encoding }, function(err){
                    fs.writeFile(filelocation + filename, Buffer.from(filedata.data.data), { encoding: filedata.data.encoding }, function (err) {
                        //fs.writeFile(filelocation+filename, filedata.data, "binary", function(err){
                        if (err) {
                            console.log("ERROR WRITING FILE: ", err);
                        } else {
                            console.log("FILE success WRITING: " + filelocation + filename);
                        }
                    })
                }
                return ({ result: true, user_id: user_id, filename_orig: ControlData.sqlescstr(filedata.name), filename_new: filename, filedir: filedir, mimetype: ControlData.sqlescstr(filedata.mimetype), filesize: this.formatBytes(filedata.size) });
            }
        }
        return ({ result: false, error: "Filename already exist, please change" });
    },
    sendSMS: function (number, message) {
        // Parse number with country code and keep raw input.
        number = phoneUtil.parseAndKeepRawInput(number, 'FR');
        var numberE164 = phoneUtil.format(number, PNF.E164);
        //console.log(numberE164);

        // Get the serviceName (name of your sms account)
        ovh.request('GET', '/sms', function (err, serviceName) {
            if (err) {
                console.log(err, serviceName);
            }
            else {
                //console.log("My account SMS is " + serviceName);
                // Send a simple SMS with a short number using your serviceName
                ovh.request('POST', '/sms/' + serviceName + '/jobs/', {
                    message: message,
                    //senderForResponse: true,
                    sender: "Green Sante",
                    noStopClause: true,
                    receivers: [numberE164]
                }, function (errsend, result) {
                    console.log(errsend, result);
                });
            }
        });
    }

}