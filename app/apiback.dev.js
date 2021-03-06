/////////////////////////// PARAMETRES DU SERVEUR ///////////////////////
//var hostname = 'apiback.green-sante.com'; 
var hostname = '127.0.0.1'; 
var port_http = 3000; 
var rootpath = '/var/opt/apiback.green-sante.fr/';
//var port_https = 3443;
/////////////////////////////////////////////////////////////////////////


// =======================
// get the packages we need ============
// =======================
var https = require('https');
var http = require('http');

var mysql = require('mysql');
var express = require('express'); 
var dateFormat = require('dateformat');
var cors = require('cors');
var bodyParser = require("body-parser"); 
require('console-stamp')(console, '[HH:MM:ss.l]'); // add timestamps in front of log messages
var morgan  = require('morgan'); // log toutes les requettes avec les temps de réponses
var jwt    = require('jsonwebtoken'); // used to create, sign, and verify tokens
var config = require('./config'); // get our config file
//const stripe = require("stripe")(config.stripe_keySecret);
var timespan = require('timespan');
const nodemailer = require('nodemailer');
const fileUpload = require('express-fileupload');
var crypto = require('crypto');
//var FB = require('fb');
var dustfs = require('dustfs'); // Moteur de templates
dustfs.dirs('/var/opt/apiback.green-sante.fr/content/emails'); // Read templates from this directory
//var messenger = require('messenger'); // canal de communication entre les 2 APIs
const fs = require('fs');
const serial = require("generate-serial-key");

const { Curl } = require('node-libcurl');
const curl = new Curl();

var siret = require('siret');
//var request = require('request');
const superagent = require('superagent');

var app = express(); 

var user_id = null;
var newtoken = null;

/////////////////////////////// HTTPS ///////////////////////////////
var options = {
  //key: fs.readFileSync('/opt/certs/moncommercant.net.key'),
  //cert: fs.readFileSync('/opt/certs/moncommercant.net.crt')
  //key: fs.readFileSync('/etc/letsencrypt/live/moncommercant.net/privkey.pem'),
  //cert: fs.readFileSync('/etc/letsencrypt/live/moncommercant.net/fullchain.pem')
};

// =======================
// INIT BUGSNAG ==========
// =======================
// var bugsnag = require('bugsnag');
// bugsnag.register('b24f1ef2f489a93e48f25a7c9a655c5f');
// app.use(bugsnag.requestHandler);
// app.use(bugsnag.errorHandler);
// TEST BUGSNAG
//bugsnag.notify(new Error('Test NORMAL error')); // ERROR NORMAL
/*
app.use(function (req, res, next) { // ERROR MIDDLEWARE REQ/RES (not working)
  throw new Error('Test MIDDLEWARE error');
});*/

// =======================
// EMAIL CONF =========
// =======================

let smtpConfig = {
    host: 'mail.gandi.net',
    port: 587,
    secure: false, // upgrade later with STARTTLS
    auth: {
        user: 'smtp@green-sante.fr',
        pass: 'hd764fdsH$fqfsd('
    }
};
var transporter = nodemailer.createTransport(smtpConfig);
// verify connection configuration
transporter.verify(function(error, success) {
   if (error) {
        console.log(error);
		send_error_email("ERROR Connection impossible sur le serveur SMTP\n"+error);
   } else {
        console.log('Server SMTP is ready to take our emails');
   }
});

function send_error_email(data) {
	send_template_email('email_error.dust', { 'email':"raphael@green-sante.fr", 
												'subject': '[Green Santé] Error serveur Nodejs à traiter', 
												'data':data,
												});
}

function send_template_email(template, values) {
	mlog("SENDEMAIL==> Template: "+template+" - Email: "+values.email);
	dustfs.render(template, values, function(err, out, email) {
		if(err) {
			console.log('Error DUSTFS Render: '+err);
			send_error_email("Error DUSTFS Render\n"+err);
		} else {
			mlog(values);
			var mailOptions = {
				from: values.from || 'app@green-sante.fr',
				to: values.email || 'noreply@green-sante.fr',
				//bcc: 'contact@green-sante.fr,'+values.email_notifications,
				bcc: values.email_notifications,
				subject: values.subject,
				html: out,
				attachments: [
				{
					filename: 'email.png',
					path: rootpath+'content/emails/images/email.png',
					cid: 'email' //same cid value as in the html img src
				},
				{
					filename: 'facebook.png',
					path: rootpath+'content/emails/images/facebook.png',
					cid: 'facebook' //same cid value as in the html img src
				},
				{
					filename: 'twitter.png',
					path: rootpath+'content/emails/images/twitter.png',
					cid: 'twitter' //same cid value as in the html img src
				},
				{
					filename: 'Green_Sante_logo_mail.png',
					path: rootpath+'content/emails/images/Green_Sante_logo_mail.png',
					cid: 'greensante' //same cid value as in the html img src
				}]
			};
			
			transporter.sendMail(mailOptions, function(error, info){
			if (error) {
				console.log("Error sending emails:"+error);
				send_error_email("Error sending emails\n"+error);
			} else {
				console.log('Email sent: ' + info.response);
			}});
			
		}
	});
}

function sameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();
}

function diffdays(date1, date2) {
	var timeDiff = Math.abs(date2.getTime() - date1.getTime());
	var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24)); 
	return(diffDays);
}

function truncate(string, length){
    if (string.length > length)
        return string.substring(0,length)+'...';
    else
        return string;
};

// ========================
// Mysql connection to the database
// ========================
var connection = mysql.createConnection(
	config
);
connection.connect(function(err){
	if(err){
		console.error('Impossible de se connecter à la BDD', err);
		send_error_email("Impossible de se connecter à la BDD\n"+err);
	}
	console.log('Démarrage de la connexion mysql');
});

// =======================
// configuration =========
// =======================
app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
var myRouter = express.Router(); 
app.use(morgan('dev')); // use morgan to log requests to the console
app.set('superSecret', config.secret); // secret variable
// enable files upload
app.use(fileUpload({createParentPath: true}));

 // =======================
// functions =========
// =======================
function degreesToRadians(degrees) {
  return degrees * Math.PI / 180;
}


function distanceInmBetweenEarthCoordinates(lat1, lon1, lat2, lon2) {
  var earthRadiusKm = 6371;

  var dLat = degreesToRadians(lat2-lat1);
  var dLon = degreesToRadians(lon2-lon1);

  lat1 = degreesToRadians(lat1);
  lat2 = degreesToRadians(lat2);

  var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
          Math.sin(dLon/2) * Math.sin(dLon/2) * Math.cos(lat1) * Math.cos(lat2); 
  var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
  return parseInt(earthRadiusKm * c * 1000);
}

function mlog(data) {
	console.log(data);
}

function toTimestamp(strDate){
	 var datum = Date.parse(strDate);
	 return datum/1000;
}

function logaccess(user_id, type) {
	var q = "INSERT INTO `logaccess` (`date`, `user_id`, `type`, `args`) VALUES (CURRENT_TIMESTAMP, '"+user_id+"', '"+type+"', '')";
	//mlog(q);
	connection.query(
		q, function(err, rows){
			if(err){
				console.log('error loginsert', err.sqlMessage);
				console.log(err.sql);
				send_error_email("error loginsert\n"+err.sqlMessage+"\n"+err.sql);
			} 
	});
}

function push_update_player(user_id, player_id) {
	mlog("Update playerid:"+player_id);
	mlog("user_id:"+user_id);

	var q = 'REPLACE INTO push_players ' +
		/*var q = 'INSERT INTO push_players ' +*/
				'(user_id, player_id, last_seen) ' +
				'VALUES ('+user_id+',"'+player_id+'", NOW())';
		mlog(q);
		var vendorsarray = [];
		connection.query(
			q, function(err, user){
				if (err) throw err;
				mlog("player_id SAVED OK");
		});
}

function expiration_timestamp_get() {
	var expiration = new Date();
	var expiration = parseInt(expiration.setTime( expiration.getTime() + config.token_days_validity * 86400000 )/1000);
	return expiration;
}

function sqlescstr(str) {
	//mlog(str);
	if (str && str !== undefined) {
		return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
			switch (char) {
				case "\0":
					return "\\0";
				case "\x08":
					return "\\b";
				case "\x09":
					return "\\t";
				case "\x1a":
					return "\\z";
				case "\n":
					return "\\n";
				case "\r":
					return "\\r";
				case "\"":
				case "'":
				case "\\":
				case "%":
					return "\\"+char; // prepends a backslash to backslash, percent,
									  // and double/single quotes
			}
		});
	} else return "";
}

function validateEmail(email) {
  var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return re.test(email);
}

function validatePhone(num){
	if(num.indexOf('+33')!=-1) num = num.replace('+33', '0');
	var re = /^0[1-7]\d{8}$/;
	return re.test(num);
}

function calcAge(dateString) {
  var birthday = +new Date(dateString);
  return ~~((Date.now() - birthday) / (31557600000));
}

function encrypt(text) {
    let iv = crypto.randomBytes(config.crypto_IV_LENGTH);
    let cipher = crypto.createCipheriv(config.crypto_algorithm, config.crypto_ENCRYPTION_KEY, iv);
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
    let textParts = text.split(':');
    let iv = Buffer.from(textParts.shift(), 'hex');
    let encryptedText = Buffer.from(textParts.join(':'), 'hex');
    let decipher = crypto.createDecipheriv(config.crypto_algorithm, config.crypto_ENCRYPTION_KEY, iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
}

function merror(res, req, err, msg, num=400) {
	console.log(msg, err.sqlMessage);
	console.log(err.sql);
	res.status(num).json({
		action : req.url,
		method : req.method,
		message : "SQL Error"
	});
	//if (email)
	//send_error_email(msg+"\n"+err.sqlMessage+"\n"+err.sql);
}

function mwarn(res, req, msg, num=405) {
	res.status(num).json({
		action : req.url,
		method : req.method,
		message : msg
	});
}

function compile_guaranties_by_category_id(category_id, rows) {
	mlog("-> compile_guaranties_by_category_id: "+category_id);
	var resarray = [];
	for(var k in rows){
		if (category_id == rows[k].guarantee_category_id) {
			resarray.push({
				"guarantee_name": rows[k].guarantee_name,
				"guarantee_id": rows[k].guarantee_id,
				"guarantee_img": rows[k].img,
				"guarantee_urlsearch": rows[k].img,
				"guarantee_desc": rows[k].description,
			});
		}
	}
	return (resarray);
}

function compile_categories_by_activity_id_old(guarantee_activity_id, rows) {
	mlog("--> compile_categories_by_activity_id: "+guarantee_activity_id);
	//mlog(rows);
	var resar = [];
	var category_id = null;
	var nb_push = 0;
	for(var k in rows){
		if (guarantee_activity_id == rows[k].guarantee_activity_id) {
			//mlog("Compare categorie:"+category_id+"//"+rows[k].guarantee_category_id);
			if (category_id != rows[k].guarantee_category_id)
				mlog("New garanty categorie ("+(++nb_push)+"): "+rows[k].guarantee_category_name);
				category_id = rows[k].guarantee_category_id;
				var guaranties = compile_guaranties_by_category_id(rows[k].guarantee_category_id, rows);
				resar.push({
						"guarantee_category_name": rows[k].guarantee_category_name,
						"guarantee_category_id": rows[k].guarantee_category_id,
						"guarantee_category_desc": rows[k].guarantee_category_desc,
						"guaranties": guaranties, 
				});
		}
	}
	return (resar);
}


function compile_categories_by_activity_id(guarantee_activity_id, rows) {
	mlog("--> compile_categories_by_activity_id: "+guarantee_activity_id);
	//mlog(rows);
	var resar = [];
	var category_id = null;
	var nb_push = 0;
	for(var k in rows){
		if (guarantee_activity_id == rows[k].guarantee_activity_id) {
			//mlog("Compare categorie:"+category_id+"//"+rows[k].guarantee_category_id);
			if (category_id != rows[k].guarantee_category_id)
				mlog("New garanty categorie ("+(++nb_push)+"): "+rows[k].guarantee_category_name);
				category_id = rows[k].guarantee_category_id;
				mlog("-> IN compile_guaranties_by_category_id: "+category_id);
				var resar2 = [];
				for(var l in rows){
					if (category_id == rows[l].guarantee_category_id) {
						resar2.push({
							"guarantee_name": rows[l].guarantee_name,
							"guarantee_id": rows[l].guarantee_id,
							"guarantee_img": rows[l].img,
							"guarantee_urlsearch": rows[l].img,
							"guarantee_desc": rows[l].description,
						});
					}
				}
				resar.push({
						"guarantee_category_name": rows[k].guarantee_category_name,
						"guarantee_category_id": rows[k].guarantee_category_id,
						"guarantee_category_desc": rows[k].guarantee_category_desc,
						"guaranties": resar2, 
				});
		}
	}
	return (resar);
}


//////////////////////////////////////////////////////////////////////////////////////////////////
// HELLO ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

myRouter.route('/')
.all(function(req,res){ 
      res.status(200).json({message : "Welcome on the APIBACK Green-sante.fr", method : req.method});
}); 


function renew_token(values) {
	
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// LOGIN //////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.post('/login', function(req, res) {
	var q = 'SELECT * ' +
			'FROM user u ' +
			'WHERE u.email="'+req.body.email+'" ';
	//mlog(req);
	var vendorsarray = [];
	connection.query(
		q, function(err, user){
			mlog(q);
			if (err) throw err;
			if (!user[0]) {
				res.status(403).json({ 
					action : req.url,
					method : req.method,
					message: 'Authentication failed. User not found.' 
				});
			} else if (user[0]) {
				// check if password matches
				if (user[0].password != req.body.password) {
					res.status(401).json({ 
						action : req.url,
						method : req.method,
						message: 'Authentication failed. Wrong password.' }
					);
				} else {
					// if user is found and password is right
					// create a token
					if (user[0].enabled == false) {
						res.status(403).json({
							action : req.url,
							method : req.method, 
							message: 'Acces denied, account disabled',
							enabled: false,
						});
					} else {
						var q = 'SELECT c.company_id, c.name, a.name as type, a.description '+
								'FROM `company` c, `useraccess` ua , `accesstype` a '+
								'WHERE c.company_id=ua.company_id '+
								'AND ua.user_id='+user[0].user_id+' '+
								'AND ua.accesstype_id=a.accesstype_id '+
								'ORDER BY ua.accesstype_id ASC';
						connection.query(
							q, function(err, rows){
							if(err){
								merror(res, req, err, 'error get login user access: ');
							} else {
								var resarray = [];
								for(var k in rows){
									//mlog(rows);
									resarray.push({
										"companyid" : rows[k].id, 
										"name" : rows[k].name, 
										"type" : rows[k].type, 
										"description" : rows[k].description, 
									});
								}
								var token = jwt.sign({'email':req.query.email, 'password':user[0].password, 'user_id':user[0].user_id, 'enabled':user[0].enabled }, app.get('superSecret'), {
															expiresIn: config.token_days_validity+" days"// expires in X days
														});
									
								// return the information including token as JSON
								res.status(200).json({
									action : req.url,
									method : req.method, 
									message: 'Save your token!',
									data: {
										token: token, 
										expiration: expiration_timestamp_get(), 
										user_id: user[0].user_id, 
										email: req.body.email,
										firstname: user[0].firstname,
										lastname: user[0].lastname,
										useraccess : resarray,
									}
								});
							}
						});
						//mlog(req);
						var vendorsarray = [];
						connection.query(
							q, function(err, user){
								mlog(q);
								if (err) throw err;
								else {
									//mlog("email:"+req.query.email);
									//mlog("password:"+user[0].password);
									//mlog("enabled:"+user[0].enabled);
									/*
									if (req.query.playerid) {
										push_update_player(user[0].user_id, req.query.playerid);						
									}*/
									
									
								}
						});
					}
				}   
			}
		});
});

//////////////////////////////////////////////////////////////////////////////////////////////////
// LOST PASSWORD ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

myRouter.post('/lostpassword', function(req, res) {
	mlog(user_id+': '+req.method+' '+req.url);
	//mlog(req.query);
	if (!validateEmail(req.body.email)) {
		console.log('error lostpassword email is not allowed: '+req.body.email);
		res.status(403).json({
			action : req.url,
			method : req.method,
			success: false,
			message : 'error lostpassword email is not allowed'
		});
		return;
	} else {
		var q = 'SELECT * FROM `user`  '+
				"WHERE `email`='"+sqlescstr(req.body.email)+"'"+
				'';
		//mlog(req.query);
		//mlog(q);
		connection.query(
			q, function(err, rows){
				if(err){
					console.log('error lostpassword SQL: ', err.sqlMessage);
					console.log(err.sql);
					res.status(400).json({
						action : req.url,
						method : req.method,
						success: false,
						message : "SQL Error"
					});
					send_error_email("error lostpassword SQL \n"+err.sqlMessage+"\n"+err.sql);
				} else {
					console.log(rows);
					if (typeof rows[0] != 'undefined') {
						res.status(200).json({
							action : req.url,
							method : req.method,
							success: true,
							message : "lostpassword have been sended by email",
						});
						send_template_email('email_lostpassword.dust', { 'email':rows[0].email, 
													'subject': '[Green Santé] Mot de passe oublié sur Green-Sante.fr', 
													'surname':rows[0].surname,
													'login':rows[0].email,
													'password':rows[0].password,												
													});
					} else {
						res.status(404).json({
							action : req.url,
							method : req.method,
							success: false,
							message : "user not found",
						});
					}
				}
			}
		);
	}
});

//////////////////////////////////////////////////////////////////////////////////////////////////
// USER EXEMPTIONS //////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/exemption')
.get(function(req, res) {
	var q = 'SELECT * ' +
			'FROM userexemption u ' +
			'ORDER BY userexemption_id ASC ';
	connection.query(
		q, function(err, exemptions){
			mlog(q);
			if (err) throw err;
			if (!exemptions[0]) {
				merror(res, req, err, 'No exemptions availables ')
			} else if (exemptions[0]) {
				var resarray = [];
				for(var k in exemptions){
					//mlog(rows);
					resarray.push({
						"id" : exemptions[k].userexemption_id, 
						"name" : exemptions[k].name, 
						"desc" : exemptions[k].desc, 
				});
				}
				// return the information including token as JSON
				res.status(200).json({
					action : req.url,
					method : req.method, 
					message: "Exemptions list",
					data : {
						exemptions: resarray,
					}
				});
			}
		});
});

//////////////////////////////////////////////////////////////////////////////////////////////////
// /USER/REGISTRATION //////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.post('/user/registration/', function(req, res) {
	
	// SI IL Y A registrationkey C EST DONC UNE AFFILIATION A UNE COMPANY OU UN ACCES A LA PARTIE RH
	if (req.body.registrationkey && req.body.registrationkey!="") {
		var q = "SELECT r.email, r.user_id, r.company_id, r.accesstype_id FROM registrationkey r "+
				"WHERE r.registrationkey_id LIKE '"+req.body.registrationkey+"'";
		mlog(q);
		connection.query(
			q, function(err, rows){
			if (err) {
				return mwarn(res, req, "registrationkey is invalid"); 
			} else {
				if (rows[0]) {
					// TODO INSERT address of user
					var q = "INSERT INTO `user` (`email`, `password`, `phone`, `userstatus_id`, `firstname`, `lastname`, `contact_id`, `address_id`, "+
							"`dateregister`, `ownerid`, `ownersecunumber`, `teletransmissionnumber`, `teletransmissionstateid`, `amccode`, `registrationkey_id`) "+
							"VALUES ('"+rows[0].email+"', '"+req.body.password+"','"+req.body.phone+"', '"+config.userstatus_registration+"', '"+req.body.firstname+"', '"+req.body.lastname+"', NULL, NULL, "+
							"NOW(), NULL, '"+req.body.secu+"', NULL, NULL, NULL, '"+req.body.registrationkey+"');"
					connection.query(
						q, function(err, user){
						if(err){
							merror(res, req, err, 'error post user registration: ');
						} else {
							if (user.insertId) {
								// TODO INSERT useraccess OF user (company id etc ....) rows.insertId
								user_update_access(res, req, user.insertId, rows[0].company_id, rows[0].accesstype_id, 1);
								/*
								var q = "INSERT INTO `useraccess` (`user_id`, `company_id`, `accesstype_id`, `enable`) "+
										"VALUES ("+user.insertId+", "+rows[0].company_id+", '3', '1');"
								connection.query(q, function(err, user){
									if(err){
										merror(res, req, err, 'error post user registration (insert useraccess): ');
									}
								});*/
								
								var mytoken = jwt.sign({'email':rows[0].email, 'password':req.body.password, 'user_id':rows.insertId }, app.get('superSecret'), {
									expiresIn: config.token_days_validity+" days"// expires in X days
								});
								
								res.status(200).json({
									action : req.url,
									method : req.method, 
									message: 'User is well inserted',
									data: {
										token: mytoken,
										expiration: expiration_timestamp_get(), 
										user_id: rows.insertId, 
										email: rows[0].email,
										firstname: req.body.firstname,
										lastname: req.body.lastname,
									},
								});
							} else {
								merror(res, req, err, 'error post user registration (insertuser): ');
							}
						}
					});
				}
			}
		});
	// SINON C EST L ENREGISTREMENT D UNE NOUVEL COMPANY DONC IL Y A FORCEMENT UN company_id
	} else if ( req.body.company_id && req.body.company_id!="" ) {
		//registration_send(req.body.email, req.body.firstname, user_id, company_id, "companyaccess");
		// TODO INSERT address of user
		var q = "INSERT INTO `user` (`email`, `password`, `phone`, `userstatus_id`, `firstname`, `lastname`, `contact_id`, `address_id`, "+
				"`dateregister`, `ownerid`, `ownersecunumber`, `teletransmissionnumber`, `teletransmissionstateid`, `amccode`) "+
				"VALUES ('"+req.body.email+"', '"+req.body.password+"','"+req.body.phone+"', '"+config.userstatus_registration+"', '"+req.body.firstname+"', '"+req.body.lastname+"', NULL, NULL, "+
				"NOW(), NULL, '"+req.body.secu+"', NULL, NULL, NULL);"
		connection.query(
			q, function(err, user){
			if(err){
				merror(res, req, err, 'error post user registration: ');
			} else {
				if (user.insertId) {
					// TODO INSERT useraccess OF user (company id etc ....) rows.insertId
					user_update_access(res, req, user.insertId, req.body.company_id, 1, 1);
					/*
					var q = "INSERT INTO `useraccess` (`user_id`, `company_id`, `accesstype_id`, `enable`) "+
							"VALUES ("+user.insertId+", "+rows[0].company_id+", '3', '1');"
					connection.query(q, function(err, user){
						if(err){
							merror(res, req, err, 'error post user registration (insert useraccess): ');
						}
					});*/
					
					var mytoken = jwt.sign({'email':rows[0].email, 'password':req.body.password, 'user_id':rows.insertId }, app.get('superSecret'), {
						expiresIn: config.token_days_validity+" days"// expires in X days
					});
					
					res.status(200).json({
						action : req.url,
						method : req.method, 
						message: 'User is well inserted',
						data: {
							token: mytoken,
							expiration: expiration_timestamp_get(), 
							user_id: rows.insertId, 
							email: rows[0].email,
							firstname: req.body.firstname,
							lastname: req.body.lastname,
						},
					});
				} else {
					merror(res, req, err, 'error post user registration (insertuser): ');
				}
			}
		});
	}
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /tools/price ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/tools/price')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var department = parseInt(req.query.department) || null;
	if (!department || !Number.isInteger(department) || department == 0) return mwarn(res, req, "department is required");
	var pricing_struct_tarif_id = parseInt(req.query.pricing_struct_tarif_id) || null;
	if (!pricing_struct_tarif_id || !Number.isInteger(pricing_struct_tarif_id) || pricing_struct_tarif_id == 0) return mwarn(res, req, "pricing_struct_tarif_id is required");
	var pricing_age_id = parseInt(req.query.pricing_age_id) || null;
	if (!pricing_age_id || !Number.isInteger(pricing_age_id) || pricing_age_id == 0) return mwarn(res, req, "pricing_age_id is required");
	
	var pricing_type_id = parseInt(req.query.pricing_type_id) || "";
	if (pricing_type_id && Number.isInteger(pricing_type_id) && pricing_type_id != 0)
		pricing_type_id = " AND pt.pricing_type_id="+pricing_type_id+" ";
		
	var guarantee_pack_id = parseInt(req.query.guarantee_pack_id) || "";
	if (guarantee_pack_id && Number.isInteger(guarantee_pack_id) && guarantee_pack_id != 0)
		guarantee_pack_id = " AND gp.guarantee_pack_id="+guarantee_pack_id+" ";
	
	var q = 'SELECT (SELECT c.value FROM `constant` c WHERE c.name LIKE "PMSS" AND c.year=YEAR(NOW())) as pmss, pr.rate as price_rate, pt.name as type_name, '+
		'pst.name as struct_tarif_name, pst.pricing_struct_tarif_id as struct_tarif_id, pa.name as pricing_age_name,pa.pricing_age_id as pricing_age_id, gp.name as guarantee_pack_name, gp.guarantee_pack_id as guarantee_pack_id '+
		'FROM `pricing_rate` pr, `pricing_type` pt, `pricing_struct_tarif` pst, `pricing_age` pa, `guarantee_pack` gp , `pricing_location` pl  '+
		'WHERE pl.department LIKE "%'+department+'%" AND pst.pricing_struct_tarif_id='+pricing_struct_tarif_id+' AND pa.pricing_age_id='+pricing_age_id+' ' + 
		pricing_type_id + guarantee_pack_id + " AND " +
		'pr.guarantee_pack_id=gp.guarantee_pack_id AND pr.pricing_location_id=pl.pricing_location_id AND pr.pricing_age_id=pa.pricing_age_id AND '+
		'pt.pricing_struct_tarif_id=pst.pricing_struct_tarif_id AND pr.pricing_type_id=pt.pricing_type_id '+
		'ORDER BY gp.guarantee_pack_id ASC, pl.pricing_location_id ASC, pt.pricing_type_id ASC ';
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get tools price: ')
		} else {
			var resarray = [];
			if (rows[0]) {
				for(var k in rows){
					resarray.push({
						"price" : Number(rows[k].pmss*rows[k].price_rate/100).toFixed(2), 
						"price_rate" : rows[k].price_rate, 
						"type_name" : rows[k].type_name, 
						"struct_tarif_name" : rows[k].struct_tarif_name, 
						"struct_tarif_id" : rows[k].struct_tarif_id, 
						"pricing_age_name" : rows[k].pricing_age_name, 
						"pricing_age_id" : rows[k].pricing_age_id, 
						"guarantee_pack_name" : rows[k].guarantee_pack_name, 
						"guarantee_pack_id" : rows[k].guarantee_pack_id, 
					});
				}
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				message : "List of prices",
				data: { prices: resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /tools/agerange ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/tools/agerange')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var guarantee_pack_id = parseInt(req.query.guarantee_pack_id) || "";
	if (guarantee_pack_id && Number.isInteger(guarantee_pack_id) && guarantee_pack_id != 0)
		guarantee_pack_id = " AND gp.guarantee_pack_id="+guarantee_pack_id+" ";

	var q = 'SELECT DISTINCT pa.pricing_age_id, pa.name, pa.min, pa.max, pa.description, gp.name as guarantee_pack_name  '+
		'FROM `pricing_age` pa, `guarantee_pack` gp, `pricing_rate` pr '+
		'WHERE pa.pricing_age_id=pr.pricing_age_id AND gp.guarantee_pack_id=pr.guarantee_pack_id  '+guarantee_pack_id+
		'ORDER BY pa.min ASC ';
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get tools agerange: ')
		} else {
			var resarray = [];
			if (rows[0]) {
				for(var k in rows){
					resarray.push({
						"price_age_id" : rows[k].pricing_age_id, 
						"name" : rows[k].name, 
						"min" : rows[k].min, 
						"max" : rows[k].max, 
						"description" : rows[k].description, 
						"guarantee_pack_name": rows[k].guarantee_pack_name
					});
				}
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				message : "List of age range",
				data: { prices: resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /tools/structtarif ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/tools/structtarif')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var guarantee_pack_id = parseInt(req.query.guarantee_pack_id) || "";
	if (guarantee_pack_id && Number.isInteger(guarantee_pack_id) && guarantee_pack_id != 0)
		guarantee_pack_id = " AND gp.guarantee_pack_id="+guarantee_pack_id+" ";

	var q = 'SELECT DISTINCT pst.pricing_struct_tarif_id, pst.name, gp.name as guarantee_pack_name  '+
		'FROM `pricing_struct_tarif` pst,`pricing_type` pt, `guarantee_pack` gp, `pricing_rate` pr '+
		'WHERE pst.pricing_struct_tarif_id=pt.pricing_struct_tarif_id AND gp.guarantee_pack_id=pr.guarantee_pack_id  AND pr.pricing_type_id=pt.pricing_type_id '+guarantee_pack_id+
		'ORDER BY pst.name ASC ';
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get tools agerange: ')
		} else {
			var resarray = [];
			if (rows[0]) {
				for(var k in rows){
					resarray.push({
						"struct_tarif_id" : rows[k].pricing_struct_tarif_id, 
						"name" : rows[k].name, 
						"guarantee_pack_name": rows[k].guarantee_pack_name
					});
				}
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				message : "List of age range",
				data: { prices: resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /tools/siren ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/tools/siren')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	if (siret.isSIREN(req.query.siren)) {
		var url = config.url_api_SIREN+req.query.siren+"?champs=denominationUniteLegale%2CactivitePrincipaleUniteLegale%2CdenominationUsuelle1UniteLegale"; 
		mlog("GET API: "+url);
		superagent
			.get(url)
			//.send({ name: 'Manny', species: 'cat' }) // sends a JSON post body
			.set('Authorization', config.token_api_SIREN)
			.set('Accept', 'application/json')
			.end((err, data) => {
			// Calling the end function will send the request
			data = JSON.parse(data.text);
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : {name: data.uniteLegale.periodesUniteLegale[0].denominationUniteLegale},
			});
		});
	} else {
		res.status(400).json({
			action : req.url,
			method : req.method,
		});
	}
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /tools/siret ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/tools/siret')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	if (siret.isSIRET(req.query.siret)) {
		var url = config.url_api_SIRET+req.query.siret; 
		mlog("GET API: "+url);
		superagent
			.get(url)
			//.send({ name: 'Manny', species: 'cat' }) // sends a JSON post body
			.set('Authorization', config.token_api_SIREN)
			.set('Accept', 'application/json')
			.end((err, data) => {
			// Calling the end function will send the request
			data = JSON.parse(data.text);
			
			mlog(data);
			
			var numeroVoieEtablissement = data.etablissement.adresseEtablissement.numeroVoieEtablissement || "";
			var indiceRepetitionEtablissement = data.etablissement.adresseEtablissement.indiceRepetitionEtablissement || "";
			var typeVoieEtablissement = data.etablissement.adresseEtablissement.typeVoieEtablissement || "";
			var libelleVoieEtablissement = data.etablissement.adresseEtablissement.libelleVoieEtablissement || "";
			var complementAdresseEtablissement = data.etablissement.adresseEtablissement.complementAdresseEtablissement || "";
			var codePostalEtablissement = data.etablissement.adresseEtablissement.codePostalEtablissement || "";
			var libelleCommuneEtablissement = data.etablissement.adresseEtablissement.libelleCommuneEtablissement || "";
			var trancheEffectifsEtablissement = parseInt(data.etablissement.trancheEffectifsEtablissement)|| 1;
			
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : {name: data.etablissement.uniteLegale.denominationUniteLegale,
						address: numeroVoieEtablissement+" "+indiceRepetitionEtablissement+" "+typeVoieEtablissement+" "+libelleVoieEtablissement+" "+complementAdresseEtablissement,
						postalcode: codePostalEtablissement,
						city: libelleCommuneEtablissement,
						effectif: trancheEffectifsEtablissement,
				},
			});
		});
	} else {
		res.status(400).json({
			action : req.url,
			method : req.method,
		});
	}
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /tools/ccn ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/tools/ccn')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	if (siret.isSIRET(req.query.siret)) {
		var url = config.url_api_CCN+req.query.siret; 
		mlog("GET API: "+url);
		superagent
			.get(url)
			//.send({ name: 'Manny', species: 'cat' }) // sends a JSON post body
			.set('Accept', 'application/json')
			.end((err, data) => {
			// Calling the end function will send the request
			data = JSON.parse(data.text);
			//mlog(data);
			var resarray = [];			
			if (data[0].conventions && data[0].conventions[0]) {

				for(var k in data[0].conventions){
					resarray.push({
						"idcc" : data[0].conventions[k].num, 
						"name" : data[0].conventions[k].shortTitle, 
						"longname" : data[0].conventions[k].title, 
					});
				}
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : {siret: data[0].siret, 
						conventions: resarray
				},
			});
		});
	} else {
		var q = 'SELECT c.idcc, c.name, c.longname '+
			'FROM `ccn` c '+
			'ORDER BY idcc ASC';
		mlog(q);
		connection.query(
			q, function(err, rows){
			if(err){
				merror(res, req, err, 'error get ccn list: ')
			} else {
				res.status(401).json({
					action : req.url,
					method : req.method,
					message : "List of all ccn",
					data: { allconventions: rows,
					}
				});
			}
		});
	}
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /tools/insurer ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/tools/insurer')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var q = 'SELECT i.insurer_id, i.name '+
		'FROM `insurer` i '+
		'ORDER BY i.name ASC';
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get insurer list: ')
		} else {
			var resarray = [];
			if (rows[0] && rows[0].insurer_id) {

				for(var k in rows){
					resarray.push({
						"id" : rows[k].insurer_id, 
						"name" : rows[k].name, 
					});
				}
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				message : "List of all ccn",
				data: { insurer: resarray,
				}
			});
		}
	});
});

function isFloat(n){
    return Number(n) === n && n % 1 !== 0;
}
function isNumeric(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function mysql_real_escape_string (str) {
    if (typeof str != 'string')
        return str;

    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
}

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /COMPANY/REGISTRATION ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/company/registration')
///////////////// GET //
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var name = req.body.name || null;
	if (!name || (typeof name === 'string' && name instanceof String) || name == "")
		return mwarn(res, req, "Name is required");
	
	var siret = parseFloat(req.body.siret) || null;
	mlog(isNumeric(siret));
	if (!siret || !isNumeric(siret) || siret == 0)
		return mwarn(res, req, "Siret is required"); 
	
	var ccn_id = parseInt(req.body.ccn_id) || null;
	if (!ccn_id || !Number.isInteger(ccn_id) || ccn_id == 0)
		return mwarn(res, req, "ccn_id is required"); 
	
	var address = req.body.address || null;
	if (!address || (typeof address === 'string' && address instanceof String) || address == "")
		return mwarn(res, req, "address is required");
	
	var postalcode = parseInt(req.body.postalcode) || null;
	if (!postalcode || !Number.isInteger(postalcode) || postalcode == 0)
		return mwarn(res, req, "postalcode is required"); 
	
	var city = req.body.city || null;
	if (!city || (typeof city === 'string' && address instanceof String) || city == "")
		return mwarn(res, req, "city is required");
	
	var insurer = req.body.insurer || "";
	var effectif = parseInt(req.body.effectif) || null;
	
	var age_id = parseInt(req.body.age_id) || null;
	if (!age_id || !Number.isInteger(age_id) || age_id == 0)
		return mwarn(res, req, "age_id is required");
	
	var companypourcent = parseInt(req.body.companypourcent) || null;
	if (!companypourcent || !Number.isInteger(companypourcent) || companypourcent == 0)
		return mwarn(res, req, "companypourcent is required");
	
	var struct_tarif_id = parseInt(req.body.struct_tarif_id) || null;
	if (!struct_tarif_id || !Number.isInteger(struct_tarif_id) || struct_tarif_id == 0)
		return mwarn(res, req, "struct_tarif_id is required");
	
	var guarantee_pack_id = parseInt(req.body.guarantee_pack_id) || null;
	if (!guarantee_pack_id || !Number.isInteger(guarantee_pack_id) || guarantee_pack_id == 0)
		return mwarn(res, req, "guarantee_pack_id is required");
	
	/*
	if (!insurer || (typeof insurer === 'string' || insurer instanceof String) || insurer == "")
		return mwarn(res, req, "Name is required");*/
	
	
	var q = "INSERT INTO `address` (`name`, `road_1`, `postcode`, `city`, `country`) VALUES ('default', '"+address+"', '"+postalcode+"', '"+city+"', 'France');";
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error post company registration: ');
		} else {
			if (rows.insertId) {
				var q = "INSERT INTO `company` (`name`, `siret`, `address_id`, `ccn_id`, `old_insurer`, `effectif`, `pricing_age_id`, `companypourcent`, `pricing_struct_tarif_id`) "+
						"VALUES ('"+mysql_real_escape_string(name)+"', '"+mysql_real_escape_string(siret)+"', '"+rows.insertId+"', '"+mysql_real_escape_string(ccn_id)+"', '"+mysql_real_escape_string(insurer)+"', '"+
						mysql_real_escape_string(effectif)+"', '"+mysql_real_escape_string(age_id)+"', '"+mysql_real_escape_string(companypourcent)+"', '"+mysql_real_escape_string(struct_tarif_id)+"');";
				connection.query(
					q, function(err, rows){
					if(err){
						merror(res, req, err, 'error post company registration: ');
					} else {
						if (rows.insertId) {
							res.status(200).json({
								action : req.url,
								method : req.method,
								data: {
									company_id: rows.insertId,
								}
							});
						} else {
							res.status(400).json({
								action : req.url,
								method : req.method,
							});
						}
					}
				});
			}
		}
	});
});

//////////////////////////////////////////////////////////////////////////////////////////////////
// VERIFY TOKEN ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
// route middleware to verify a token (x-access-token)
myRouter.use(function(req, res, next) {
	//mlog(req.headers);
	// check header or url parameters or post parameters for token
	var token = req.query.token || req.headers['x-access-token'] || (req.headers['authorization']?req.headers['authorization'].substring(7):"");
	// decode token
	if (token) {
		// verifies secret and checks exp
		jwt.verify(token, app.get('superSecret'), function(err, decoded) {      
		if (err) {
			return res.status(403).json({ success: false, message: 'Failed to authenticate token.' });    
		} else {
			// if everything is good, save to request for use in other routes
			//mlog(decoded);
			req.decoded = decoded;   
			user_id = req.decoded.user_id;
			
			newtoken = jwt.sign({'email':req.decoded.email, 'password':req.decoded.password, 'user_id':user_id, 'enabled':req.decoded.enabled }, app.get('superSecret'), {
									expiresIn: config.token_days_validity+" days"// expires in X days
								});
			next();
		}
	});
	} else {
		// if there is no token
		// return an error
		return res.status(401).send({ 
			action : req.url,
			method : req.method,
			message: 'Access token is missing or invalid',
		});

	}
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/DASHBOARD ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/dashboard')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = 'SELECT c.name, c.barometeresvalue, c.totalpaid, c.totalspend '+
			'FROM `company` c, `user` u, `useraccess` ua , `accesstype` a '+
			'WHERE c.company_id=ua.company_id AND ua.user_id=u.user_id '+
			'AND u.user_id='+req.decoded.user_id+' AND a.name="main" '+
			'AND ua.accesstype_id=a.accesstype_id';
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user dashboard: ');
		} else {
			if (rows[0]) {
				var company = rows[0];
				var q = 'SELECT t.topquestion_id, t.subject, t.response '+
						'FROM `topquestion` t '+
						'WHERE '+
						'DATE(NOW()) <= CASE WHEN @t.dateend IS NULL THEN DATE(NOW()) ELSE @t.dateend END AND '+
						'DATE(NOW()) >= CASE WHEN @t.datestart IS NULL THEN DATE(NOW()) ELSE @t.datestart END AND '+
						't.enable='+config.topquestion_user_enable+' '+
						'ORDER BY RAND() '+
						'LIMIT 0,1';
				//mlog(q);
				connection.query(
					q, function(err, rows){
					if(err){
						merror(res, req, err, 'error get_topquestion: ');
					} else {
						var topquestion = rows;
						var q = 'SELECT n.news_id, n.description FROM `news` n WHERE n.news_id NOT IN (SELECT nr.news_id FROM `newsreaded` nr WHERE nr.user_id='+user_id+')  AND n.enable='+config.news_user_enable+' ORDER BY RAND() LIMIT 0,3';
						//mlog(q);
						connection.query(
							q, function(err, rows){
							if(err){
								merror(res, req, err, 'error get news: ');
							} else {
								res.status(200).json({
									action : req.url,
									method : req.method,
									token : newtoken,
									data : {
										companyname : company.name,
										barometeresvalue : company.barometeresvalue,
										totalspend : company.totalspend,
										totalpaid : company.totalpaid,
										chart : [],
										topquestion : (topquestion?topquestion.subject:""),
										topresponse : (topquestion?topquestion.response:""),
										newsinfo : (rows[0]?rows:[])
									}
								});
							}
						});
					}
				});
			}
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = "INSERT INTO `newsreaded` (`user_id`, `news_id`, `date`) VALUES ('"+user_id+"', '"+req.body.newsid+"', NOW()) ON DUPLICATE KEY UPDATE `date`=NOW();";
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error post news readed: ');
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				token: newtoken,
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/INFO ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/info')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = 'SELECT  us.userstatus_id as userstatus_id, us.name as userstatus_message, e.date_creation as userstatus_date_start, u.firstname, '+
			'u.lastname, u.user_id, u.ownersecunumber, u.teletransmissionnumber, u.teletransmissionstateid, u.amccode '+
			'FROM `user` u, `userstatus` us , `event` e, `eventtype` et '+
			'WHERE u.user_id='+req.decoded.user_id+' AND u.userstatus_id=us.userstatus_id AND e.user_id=u.user_id '+
			'AND et.eventtype_id=e.eventtype_id AND e.eventtype_id='+config.event_subscription_id+' '+
			'ORDER BY e.date_creation DESC LIMIT 1';
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user info: ');
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				token: newtoken,
				data: {
					userstatus : (rows[0]?rows[0].userstatus_id:""),
					userstatus_message : (rows[0]?rows[0].userstatus_message:""),
					userstatus_date_start : (rows[0]?rows[0].userstatus_date_start:""),
					userstatus_date_end : null, // TODO
					ownerfirstname : (rows[0]?rows[0].firstname:""),
					ownerlastname : (rows[0]?rows[0].lastname:""),
					ownerid : (rows[0]?rows[0].user_id:""),
					ownersecunumber : (rows[0]?rows[0].ownersecunumber:""),
					ownervalidationurl : null, // TODO
					concentrator : null, // TODO
					teletransmissionnumber : (rows[0]?rows[0].teletransmissionnumber:""),
					teletransmissionstateid : (rows[0]?rows[0].teletransmissionstateid:""),
					amccode : (rows[0]?rows[0].amccode:""),
					cardurl : null, // TODO
				}
			});
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var options = "";

	if (req.body.ownerfirstname) 
		options += (options!=""?", ":"")+"`firstname` = '"+req.body.ownerfirstname+"' ";
	if (req.body.ownerlastname) 
		options += (options!=""?", ":"")+"`lastname` = '"+req.body.ownerlastname+"' ";
	if (req.body.ownersecnumber) 
		options += (options!=""?", ":"")+"`ownersecnumber` = '"+req.body.ownersecnumber+"' ";
	
	var q = "UPDATE `user` SET "+ options +" WHERE `user`.`user_id` = "+user_id;
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error update user info: ');
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				token: newtoken,
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/ACCESS ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/access')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = 'SELECT c.company_id, c.name, a.name as type, a.description '+
			'FROM `company` c, `useraccess` ua , `accesstype` a '+
			'WHERE c.company_id=ua.company_id '+
			'AND ua.user_id='+req.decoded.user_id+' '+
			'AND ua.accesstype_id=a.accesstype_id '+
			'ORDER BY ua.accesstype_id ASC';
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user access: ');
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"companyid" : rows[k].id, 
					"name" : rows[k].name, 
					"type" : rows[k].type, 
					"description" : rows[k].description, 
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				token: newtoken,
				data : {
					useraccess : resarray,
				}
			});
		}
	});
})
.post(function(req,res){ 
	/*
	mlog(user_id+': '+req.method+' '+req.url);
	var q = "INSERT INTO `newsreaded` (`user_id`, `news_id`, `date`) VALUES ('"+user_id+"', '"+req.query.newsid+"', NOW()) ON DUPLICATE KEY UPDATE `date`=NOW();";
	connection.query(
		q, function(err, rows){
		if(err){
			console.log('error post news readed: ', err.sqlMessage);
			console.log(err.sql);
			res.status(400).json({
				action : req.url,
				method : req.method,
				message : "SQL Error"
			});
			send_error_email("error post news readed \n"+err.sqlMessage+"\n"+err.sql);
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				token: newtoken,
			});
		}
	});*/
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/SPONSOR ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/sponsor')
///////////////// GET //
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	if (validateEmail(req.body.emailphone)) {
		send_template_email('email_sponsor.dust', 
							  { 'email':req.body.emailphone, 
								'subject': '[Green Santé] Votre ami vous partage des informations', 
								});
	} else if (validateEmail(req.body.emailphone)) {
		mlog("TODO SEND INFO BY SMS");
	}
	res.status(200).json({
		action : req.url,
		method : req.method,
		token: newtoken,
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/CARDDATA ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/carddata')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = 'SELECT c.carddata_id, c.name, c.value, c.calc FROM `carddata` c '+
			'WHERE c.user_id='+req.decoded.user_id+' '+
			'ORDER BY c.weight ASC';
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get carddata: ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"id" : rows[k].id, 
					"name" : rows[k].name, 
					"value" : rows[k].value, 
					"calc" : rows[k].calc, 
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				token: newtoken,
				data : {
					carddata : resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/LIVE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/live')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var idstart = 0;
	var nbresults = config.nb_results_by_page;
	if (req.query.idstart)
		idstart = req.query.idstart;
	if (req.query.nbresults)
		nbresults = req.query.nbresults;
	
	var q = 'SELECT  e.event_id, e.eventtype_id, et.name as typename, et.description as typedesc, e.message, '+
			'e.date_creation, e.date_updated, e.params, es.eventstatus_id, es.name as eventname, es.description as eventdesc, us.userstatus_id, '+
			'us.name as userstatus_name, us.description as userstatus_desc '+
			'FROM `event` e, `eventstatus` es, `eventtype` et,`userstatus` us '+
			'WHERE e.user_id='+req.decoded.user_id+' '+
			'AND e.eventstatus_id=es.eventstatus_id AND e.eventtype_id=et.eventtype_id '+
			'AND e.userstatus_id=us.userstatus_id '+
			'ORDER BY e.date_creation DESC LIMIT '+idstart+','+nbresults;
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user live: ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				params = [];
				if (rows[k].params)
					params = JSON.parse(rows[k].params);
				resarray.push({
					"id" : rows[k].event_id, 
					"type_id" : rows[k].eventtype_id, 
					"type_name" : rows[k].typename, 
					"type_desc" : rows[k].typedesc, 
					"name" : rows[k].message, 
					"desc" : null, 
					"date_creation" : rows[k].date_creation, 
					"date_updated" : rows[k].date_updated || null, 
					"date_done" : params.datedone || null, 
					"status_id" : rows[k].eventstatus_id, 
					"status_name" : rows[k].eventname, 
					"status_desc" : rows[k].eventdesc, 
					"paidbyowner" : params.paidbyawner || null, 
					"totalpaid" : params.totalpaid || null, 
					"refund" : params.refund || null, 
					"refunddesc" : params.refunddesc || null, 
					"color" : "blue",
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				data: {
					logs : resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// 
////////////////////////////////////////////////////////////////////////////////////////////////// 
////////////////////////////////////////////////////////////////////////////////////////////////// 





////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/GUARANTEES/ACTIVITIES ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/guarantees/activities')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var maxresults = "";
	var search = "";
	if (req.query.search)
		search = " AND (g.name LIKE '%"+req.query.search+"%' OR ga.name LIKE '%"+req.query.search+"%') ";
	if (req.query.maxresults)
		maxresults = " LIMIT 0,"+req.query.maxresults;
	
	var q = 'SELECT DISTINCT g.name as guarantee_name, g.guarantee_id, ga.name as activity_name, ga.guarantee_activity_id, ga.description, '+
			'(SELECT gc.name FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_name, '+
			'(SELECT gc.description FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_desc, '+
			'g.guarantee_category_id, g.img, g.url, g.description, gp.name as packname, '+
			'gp.description as packdesc '+
			'FROM `guarantee` g, `guarantee_activity` ga, `guarantee_pack_value` gpv, `guarantee_pack` gp, `user` u   '+
			'WHERE u.user_id='+req.decoded.user_id+' AND gp.guarantee_pack_id=u.guarantee_pack_id '+
			'AND gp.guarantee_pack_id=gpv.guarantee_pack_id AND g.guarantee_id=gpv.guarantee_id '+
			'AND g.guarantee_activity_id=ga.guarantee_activity_id '+
			'AND gpv.enable=1 '+ search +
			'ORDER BY g.weight ASC, gpv.weight ASC '+ maxresults;
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user guarantees: ')
		} else {
			var resarray = [];
			var pack=[];
			var guarantee_activity_id = null;
			for(var k in rows){
				//mlog(rows);
				if (guarantee_activity_id != rows[k].guarantee_activity_id) {
					guarantee_activity_id = rows[k].guarantee_activity_id;
					mlog("==> "+rows[k].activity_name);
					resarray.push({
						"activity_name": rows[k].activity_name,
						"activity_id": rows[k].guarantee_activity_id,
						"activity_desc": rows[k].guarantee_activity_description,
						"categories": compile_categories_by_activity_id(rows[k].guarantee_activity_id, rows),
					});
				}
				pack.name=rows[k].packname,
				pack.desc=rows[k].packdesc
			};
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data: {
					packname : pack.name,
					packdesc : pack.desc,
					activities : resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/GUARANTEES ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/guarantees')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var activity_id = null;
	var search = null;
	var idstart = req.query.idstart || 0;
	if (req.query.activity_id)
		activity_id = req.query.activity_id;
	if (req.query.search)
		search = req.query.search;
	
	var q = 'SELECT DISTINCT g.name as guarantee_name, g.guarantee_id, ga.name as activity_name, ga.guarantee_activity_id, '+
			'(SELECT gc.name FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_name, '+
			'g.guarantee_category_id, g.img, g.url, g.description, gp.name as packname, '+
			'gp.description as packdesc '+
			'FROM `guarantee` g, `guarantee_activity` ga, `guarantee_pack_value` gpv, `guarantee_pack` gp, `user` u   '+
			'WHERE u.user_id='+req.decoded.user_id+' AND gp.guarantee_pack_id=u.guarantee_pack_id '+
			'AND gp.guarantee_pack_id=gpv.guarantee_pack_id AND g.guarantee_id=gpv.guarantee_id '+
			'AND g.guarantee_activity_id=ga.guarantee_activity_id '+
			'AND gpv.enable=1 '
			'ORDER BY g.weight ASC, gpv.weight ASC LIMIT '+idstart+','+ config.nb_guarantee_by_page;
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user guarantees: ')
		} else {
			var resarray = [];
			var pack=[];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"guarantee_name": rows[k].guarantee_name,
					"guarantee_id": rows[k].guarantee_id,
					"activity_name": rows[k].activity_name,
					"activity_id": rows[k].guarantee_activity_id,
					"guarantee_category_name": rows[k].guarantee_category_name,
					"guarantee_category_id": rows[k].guarantee_category_id,
					"img": rows[k].img,
					"urlsearch": rows[k].img,
					"desc": rows[k].description,
				});
				pack.name=rows[k].packname,
				pack.desc=rows[k].packdesc
			};
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : {
					packname : pack.name,
					packdesc : pack.desc,
					guarantees : resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/GUARANTEE/{guarantee_id} ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/guarantee/:guarantee_id')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var guarantee_id = req.params.guarantee_id || null;
	
	if (guarantee_id) {
		var q = 'SELECT gpv.txtvalue, gpv.description, gpv.value, gpv.exemple '+
				'FROM `guarantee_pack_value` gpv '+
				'WHERE gpv.guarantee_id='+guarantee_id+' '+
				'ORDER BY gpv.weight ASC';
		mlog(q);
		connection.query(
			q, function(err, rows){
			if(err){
				merror(res, req, err, 'error get user guarantee (guarantee_id): ')
			} else {
				var resarray = [];
				for(var k in rows){
					//mlog(rows);
					resarray.push({
						"sector": rows[k].txtvalue,
						"desc": rows[k].description,
						"value": rows[k].value,
						"exemple": rows[k].exemple
					});
				}
				res.status(200).json({
					action : req.url,
					method : req.method,
					token : newtoken,
					data: {
						values : resarray,
					}
				});
			}
		});
	}
});


////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/FILE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/file')
///////////////// POST //
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	let filedir = dateFormat(new Date(), "yyyy-mm")+"/"; // REPERTOIRE DU MOIS
	let filelocation = config.www_filedirectory+filedir; // DIR EXACT OU STOCKER LES ENVOIS
	
	// CREATION DU REPERTOIRE DU MOIS SI IL N EXISTE PAS
	if (!fs.existsSync(filelocation)) {
		fs.mkdir(filelocation, (err) => { 
			if (err) { 
				return console.error(err); 
			} 
			console.log('Directory '+filelocation+' created successfully!');
		});
	}
	
	if (!req.files || Object.keys(req.files).length === 0) {
		return res.status(400).send('No files were uploaded.');
	}
	
	for (let i=0; i < 50; i++) {
		let sampleFile = req.files.file;
		var filename = req.decoded.user_id+"_"+i+"_"+req.files.file.name;
		//mlog(filename);
		filename = encrypt(filename);
		if (!fs.existsSync(filelocation+filename)) {
			//file not exists
			sampleFile.mv(filelocation+filename, function(err) {
				if (err)
					return merror(res, req, err, 'error post user file (mv): ');
				var q = 'INSERT INTO `file` (`company_id`, `user_id`, `name`,`realname`, `comment`, `type`, `path`, `mimetype`, `date`) '+
						"VALUES (NULL, "+req.decoded.user_id+", '"+sqlescstr(req.files.file.name)+"', '"+filename+"', '"+sqlescstr(req.body.comment)+"', '"+sqlescstr(req.body.type)+"','"+filedir+"','"+sqlescstr(req.files.file.mimetype)+"', NOW())";
				//mlog(q);
				connection.query(
					q, function(err, rows){
					if(err){
						return merror(res, req, err, 'error post user file (insert bdd): ')
					} else {
						res.status(200).json({
							action : req.url,
							method : req.method,
							token : newtoken,
							result : 'File uploaded succesfully!',
						});
					}
				});
			});
			return;
		}
	}
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/RECIPIENT ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/recipients')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id + ': '+ req.method+' '+req.url);
	
		
	var q = 'SELECT r.recipient_user_id, u.email, u.firstname, u.lastname, r.datestart, r.enable '+
			'FROM `user` u, `recipient` r  '+
			'WHERE r.user_id='+req.decoded.user_id+' AND u.user_id=r.recipient_user_id '+
			'ORDER BY r.datestart ASC';
	//mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user guarantee (guarantee_id): ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"id": rows[k].recipient_user_id,
					"email": rows[k].email,
					"firstname": rows[k].firstname,
					"lastname": rows[k].lastname,
					"start": rows[k].datestart,
					"enable": rows[k].enable
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : {
					recipient : resarray,
				}
			});
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var q = "INSERT INTO `user` (`email`, `userstatus_id`, `guarantee_pack_id`, `firstname`, `lastname`, `dateregister`, `ownersecunumber`) "+
			"VALUES ( '"+sqlescstr(req.body.email)+"', "+config.userstatus_recipient_id+", "+
			'(SELECT u2.guarantee_pack_id FROM `user` u2 WHERE u2.user_id='+req.decoded.user_id+') '+
			",'"+sqlescstr(req.body.firstname)+"', '"+sqlescstr(req.body.lastname)+"', NOW(), '"+sqlescstr(req.body.secunumber)+"')";
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			return merror(res, req, err, 'error post user recipient P1 (insert bdd): ')
		} else {
			mlog(rows);
			var q = 'INSERT INTO `recipient` (`user_id`, `recipient_user_id`, `recipienttype_id`, `datestart`, `enable`) '+
			"VALUES ("+req.decoded.user_id+", "+rows.insertId+", "+sqlescstr(req.body.recipienttype)+", NOW(), 1 )";
			mlog(q);
			connection.query(
				q, function(err, rows){
				if(err){
					return merror(res, req, err, 'error post user recipient P2 (insert bdd): ')
				} else {
					res.status(200).json({
						action : req.url,
						method : req.method,
						token : newtoken,
						result : 'User recipient well added',
					});
				}
			});
		}
	});	
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/ASKHOSPITAL ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/askhospital')
///////////////// GET //
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var q = "INSERT INTO `event` ( `company_id`, `user_id`, `eventtype_id`, `userstatus_id`, `eventstatus_id`, `message`, `params`, `date_creation`) "+
			"VALUES ( NULL, "+req.decoded.user_id+", "+config.event_askhospital_id+", "+
			"(SELECT u2.userstatus_id FROM `user` u2 WHERE u2.user_id="+req.decoded.user_id+") "+
			", "+config.eventstatus_processed_id+", '"+sqlescstr(req.body.comment)+"', "+
			" '"+JSON.stringify({finesscode: sqlescstr(req.body.finesscode), contactinfo: sqlescstr(req.body.contactinfo), dmtcode: sqlescstr(req.body.dmtcode), date_operation: sqlescstr(req.body.date_operation), date_exit: sqlescstr(req.body.date_exit)})+"' "+
			", NOW()) ";
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			return merror(res, req, err, 'error post user askhospital (insert bdd): ')
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				result : 'User askhospital well added',
			});
		}
	});	
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/MESSAGE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/message')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id + ': '+ req.method+' '+req.url);
	
	var start = 0;
	var nbresults = config.nb_results_by_page;
	if (req.body.start)
		start = req.body.start;
	if (req.body.nbresults)
		nbresults = req.body.nbresults;
		
	var q = 'SELECT m.message_id, m.sender, m.text, m.datecreate, m.response_message_id FROM `message` m '+
			'WHERE m.user_id='+req.decoded.user_id+' AND m.company_id IS null '+
			'ORDER BY m.datecreate DESC LIMIT '+start+','+nbresults;;
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user messages: ')
		} else {
			var resarray = [];
			var responses = [];
			var prev_message_id = 0;
			for(var k in rows){
				//mlog(rows);
				if (rows[k].response_message_id != null) {
					if(!Array.isArray(responses[rows[k].response_message_id]))
						responses[rows[k].response_message_id] = [];
					responses[rows[k].response_message_id].push({
						"message_id": rows[k].message,
						"sender": rows[k].sender,
						"text": rows[k].text,
						"datecreate": rows[k].datecreate,
					});
				} else {
					resarray.push({
						"message_id": rows[k].message_id,
						"sender": rows[k].sender,
						"text": rows[k].text,
						"datecreate": rows[k].datecreate,
						"responses": responses,
					});
				}
			}
			for(var k in resarray){
				if (resarray[k].message_id && Array.isArray(responses[resarray[k].message_id]))
					resarray[k].responses = responses[resarray[k].message_id];
			}
			mlog(resarray);
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : {
					messages : resarray,
				}
			});
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var response_message_id = parseInt(req.body.response_message_id) || null;
	
	var q = "INSERT INTO `message` (`user_id`, `company_id`, `response_message_id`, `sender`, `text`, `datecreate`, `dateclose`) "+
			"VALUES ("+req.decoded.user_id+", NULL, "+response_message_id+", 'user', '"+sqlescstr(req.body.message)+"', NOW(), NULL);";
	//mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			return merror(res, req, err, 'error post user messages: ')
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				message : 'Messages well added',
			});
		}
	});	
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /COMPANY/DASHBOARD ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/company/dashboard/:company_id')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var company_id = parseInt(req.params.company_id) || null;

	mlog(company_id);
	if (!company_id || !Number.isInteger(company_id) || company_id == 0)
		return mwarn(res, req, "company_id is required"); 
	
	var q = 'SELECT c.name, c.barometeresvalue, c.totalpaid, c.totalspend '+
			'FROM `company` c, `useraccess` ua '+
			'WHERE c.company_id=ua.company_id '+
			'AND ua.user_id='+req.decoded.user_id+'  '+
			'AND c.company_id='+company_id;
	connection.query(
		q, function(err, rows){
		if(err){
			return merror(res, req, err, 'error get company dashboard: ');
		} else {
			if (rows[0]) {
				var company = rows[0];
				var q = 'SELECT t.topquestion_id, t.subject, t.response '+
						'FROM `topquestion` t '+
						'WHERE '+
						'DATE(NOW()) <= CASE WHEN @t.dateend IS NULL THEN DATE(NOW()) ELSE @t.dateend END AND '+
						'DATE(NOW()) >= CASE WHEN @t.datestart IS NULL THEN DATE(NOW()) ELSE @t.datestart END AND '+
						't.enable='+config.topquestion_company_enable+' '+
						'ORDER BY RAND() '+
						'LIMIT 0,1';
				mlog(q);
				connection.query(
					q, function(err, rows){
					if(err){
						return merror(res, req, err, 'error get company top question : ');
					} else {
						var topquestion = rows;
						var q = 'SELECT n.news_id, n.description FROM `news` n WHERE n.news_id NOT IN (SELECT nr.news_id FROM `newsreaded` nr WHERE nr.user_id='+user_id+') AND n.enable='+config.news_company_enable+' ORDER BY RAND() LIMIT 0,3';
						mlog(q);
						connection.query(
							q, function(err, rows){
							if(err){
								return merror(res, req, err, 'error get company news : ');
							} else {
								res.status(200).json({
									action : req.url,
									method : req.method,
									token : newtoken,
									data : {
										companyname : company.name,
										barometeresvalue : company.barometeresvalue,
										totalspend : company.totalspend,
										totalpaid : company.totalpaid,
										chart : [],
										topquestion : (topquestion?topquestion.subject:""),
										topresponse : (topquestion?topquestion.response:""),
										newsinfo : (rows[0]?rows:[])
									}
								});
							}
						});
					}
				});
			}
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = "INSERT INTO `newsreaded` (`user_id`, `news_id`, `date`) VALUES ('"+user_id+"', '"+req.body.newsid+"', NOW()) ON DUPLICATE KEY UPDATE `date`=NOW();";
	connection.query(
		q, function(err, rows){
		if(err){
			return merror(res, req, err, 'error post company news readed: ');
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /COMPANY/LIVE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/company/live/:company_id')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var company_id = parseInt(req.params.company_id) || null;

	if (!company_id || !Number.isInteger(company_id) || company_id == 0)
		return mwarn(res, req, "company_id is required");
	
	var idstart = 0;
	var nbresults = config.nb_results_by_page;
	if (req.body.idstart)
		idstart = req.body.idstart;
	if (req.body.nbresults)
		nbresults = req.body.nbresults;
	
	var q = 'SELECT  e.event_id, e.eventtype_id, et.name as typename, et.description as typedesc, e.message, '+
			'e.date_creation, e.date_updated, e.params, es.eventstatus_id, es.name as eventname, es.description as eventdesc, us.userstatus_id, '+
			'us.name as userstatus_name, us.description as userstatus_desc '+
			'FROM `event` e, `eventstatus` es, `eventtype` et,`userstatus` us '+
			'WHERE e.user_id='+req.decoded.user_id+' '+
			'AND e.eventstatus_id=es.eventstatus_id AND e.eventtype_id=et.eventtype_id '+
			'AND e.userstatus_id=us.userstatus_id '+
			'ORDER BY e.date_creation DESC LIMIT '+idstart+','+nbresults;
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user live: ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				params = [];
				if (rows[k].params)
					params = JSON.parse(rows[k].params);
				resarray.push({
					"id" : rows[k].event_id, 
					"type_id" : rows[k].eventtype_id, 
					"type_name" : rows[k].typename, 
					"type_desc" : rows[k].typedesc, 
					"name" : rows[k].message, 
					"desc" : null, 
					"date_creation" : rows[k].date_creation, 
					"date_updated" : rows[k].date_updated || null, 
					"date_done" : params.datedone || null, 
					"status_id" : rows[k].eventstatus_id, 
					"status_name" : rows[k].eventname, 
					"status_desc" : rows[k].eventdesc, 
					"paidbyowner" : params.paidbyawner || null, 
					"totalpaid" : params.totalpaid || null, 
					"refund" : params.refund || null, 
					"refunddesc" : params.refunddesc || null, 
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : {
					logs : resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /COMPANY/NBUSERS ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/company/nbusers/:company_id')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var company_id = parseInt(req.params.company_id) || null;

	if (!company_id || !Number.isInteger(company_id) || company_id == 0)
		return mwarn(res, req, "company_id is required");
	
	var q = 'SELECT  COUNT(u.user_id) as nbusers '+
			'FROM `user` u, `useraccess` ua  '+
			'WHERE ua.company_id='+company_id+' AND u.userstatus_id='+config.userstatus_validated+' AND '+
			'ua.user_id=u.user_id AND ua.accesstype_id='+config.useraccess_main;
	//mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get nbusers: ')
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : {
					nbusers : rows[0].nbusers,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /COMPANY/CONTRACTTYPE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/company/contracttype/:company_id')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var company_id = parseInt(req.params.company_id) || null;

	if (!company_id || !Number.isInteger(company_id) || company_id == 0)
		return mwarn(res, req, "company_id is required");
	
	var q = 'SELECT gpc.contracttype_id, ct.name, gpc.totalcontribution, gpc.companycontribution '+
			'FROM `contracttype` ct, `guarantee_pack_contracttype` gpc, `guarantee_pack` gp, `company_guarantee_assoc` cga '+
			'WHERE ct.contracttype_id=gpc.contracttype_id AND gpc.guarantee_pack_id=gp.guarantee_pack_id AND gp.guarantee_pack_id=cga.guarantee_pack_id AND '+
			'cga.company_id='+company_id+' '+
			'ORDER BY ct.name ASC';
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get company contracttype: ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"id" : rows[k].contracttype_id, 
					"contracttype" : rows[k].name, 
					"totalcontribution" : rows[k].totalcontribution, 
					"companycontribution" : rows[k].companycontribution
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : {
					contracts : resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /COMPANY/DOCS ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/company/docs/:company_id')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var company_id = parseInt(req.params.company_id) || null;

	if (!company_id || !Number.isInteger(company_id) || company_id == 0)
		return mwarn(res, req, "company_id is required");
	
	var q = 'SELECT f.file_id, ft.name as doctype, f.name, f.date, f.filesize, f.path, f.realname '+
			'FROM `file` f, `filetype` ft '+
			'WHERE f.company_id= '+company_id+' AND user_id is NULL '+
			'ORDER BY f.date ASC';
	//mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get company docs: ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"id" : rows[k].file_id, 
					"doctype" : rows[k].doctype, 
					"name" : rows[k].name, 
					"date" : rows[k].date,
					"filesize" : rows[k].filesize,
					"docpath" : config.www_filepath+rows[k].path+rows[k].realname,
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data: {
					docs : resarray,
				}
			});
		}
	});
});


function user_update_access(res, req, user_id, company_id, accesstype_id, value) {
	var q = 'INSERT INTO useraccess (`user_id`, `company_id`, `accesstype_id`, `enable`) '+
			'VALUES ('+user_id+', '+company_id+', '+accesstype_id+', '+value+') ON DUPLICATE KEY UPDATE `enable`='+value;
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error update useraccess: ');
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
			});			
		}
	});
}

function user_create(email, phone=null, firstname=null,lastname=null, pass=null, userstatus_id=1)  {
	var q = "INSERT INTO `user` (`email`, `password`, `phone`, `userstatus_id`, `firstname`, `lastname`, `dateregister`) "+
			"VALUES ('"+ (email!=""?email:"PHONE")+"', '"+pass+"', '"+phone+"', "+userstatus_id+", '"+firstname+"', '"+lastname+"', NOW());";
	//mlog(q);
	connection.query(
		q, function(err, result){
		if(err){
			merror(res, req, err, 'error user_create: ')
		} else {
			return (result.insertId);
		}
	});
}

function registration_send(email, firstname, user_id, company_id=null) {
	
	// TODO: TESTER SI LA REGLINK EXIST DEJA EN BDD ?
	// SI OUI: REGENERER UNE REGLINK
	var reglink=serial.generate(16, "-",4);
	
	var q = "INSERT INTO `registrationkey` (`registrationkey_id`, `datecreate`, `email`, `why`, `user_id`, `company_id`) "+
			"VALUES ('"+reglink+"', NOW(), '"+email+"', '"+user_id+"', '"+user_id+"', '"+company_id+"');"
	//mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error creating registrationkey: ')
		} else {
			send_template_email('email_registration.dust', 
							  { 'email':email, 
								'subject': '[Green Santé] Vous pouvez maintenant créer votre mot de passe', 
								'surname':firstname,
								'link':config.www_rootback+"registerpass/"+reglink,
								});
		}
	});
}

function strToBool(s)
{
    // will match one and only one of the string 'true','1', or 'on' rerardless
    // of capitalization and regardless off surrounding white-space.
    //
    regex=/^\s*(true|1|on)\s*$/i

    return regex.test(s);
}

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /COMPANY/ACCESS ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/company/access/:company_id')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var company_id = parseInt(req.params.company_id) || null;

	if (!company_id || !Number.isInteger(company_id) || company_id == 0)
		return mwarn(res, req, "company_id is required");

	var q = 'SELECT u.user_id, u.firstname, u.lastname, u.email, u.phone, at.name, at.accesstype_id, ua.enable '+
			'FROM `user` u, `useraccess` ua, `accesstype` at '+
			'WHERE ua.company_id='+company_id+' AND u.user_id=ua.user_id AND ua.accesstype_id=at.accesstype_id '+
			'ORDER BY at.name ASC, u.firstname ASC';
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get company access: ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"id" : rows[k].user_id, 
					"firstname" : rows[k].firstname, 
					"lastname" : rows[k].lastname, 
					"email" : rows[k].email, 
					"phone" : rows[k].phone, 
					"accesstype_name" : rows[k].name, 
					"accesstype_id" : rows[k].accesstype_id, 
					"enable" : rows[k].enable, 
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data: {
					users : resarray,
				}
			});
		}
	});
})
///////////////// POST //
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);

	var company_id = parseInt(req.params.company_id) || null;
	req.body.accesstype_id = parseInt(req.body.accesstype_id) || null;

	mlog(req.body);
	if (!company_id || !Number.isInteger(company_id) || company_id == 0)
		return mwarn(res, req, "company_id is required");
	if (!Number.isInteger(req.body.accesstype_id))
		return mwarn(res, req, "accesstype_id is required");
	
	// TESTER SI IL Y A UN EMAIL
	// SI NON =>
	if (!validateEmail(req.body.email)) {
		if (Number.isInteger(req.body.user_id))
			return mwarn(res, req, "user_id is required");
		user_update_access(res, req, req.body.user_id, req.query.company_id, req.body.accesstype_id, req.body.value);
	} else {
	// SI OUI =>
		// TESTER SI LE USER EXISTE
		var q = "SELECT u.email, u.user_id FROM user u WHERE u.email='"+req.body.email+"'";
		//mlog(q);
		connection.query(
			q, function(err, rows){
			if(err){
				merror(res, req, err, 'error update useraccess: ')
			} else {
				if (rows && rows[0] && rows[0].email === req.body.email) {
					// SI OUI => 
					user_update_access(res, req, rows[0].user_id, company_id, req.body.accesstype_id, req.body.value);					
				} else {
					// SI NON =>
					// CREER LE USER
					var user_id = user_create( req.body.email, "", req.body.firstname, req.body.lastname, "");
					// LUI ENVOYER UNE REGISTRATION KEY POUR QU IL CREE SON MOT DE PASSE
					registration_send(req.body.email, req.body.firstname, user_id, company_id, "companyaccess");
					user_update_access(res, req, user_id, company_id, req.body.accesstype_id, req.body.value);	
				}
			}
		});
	}
});

function do_query(res, req, q, errormessage) {
	mlog(q);
	connection.query(
		q, function(err, rows){
			if(err){
				mlog(errormessage);
			} 
			
			/*
		if(err){
			merror(res, req, err, erromessage);
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
			});
		}*/
	});
}

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /COMPANY/INFO ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/company/info/:company_id')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var company_id = parseInt(req.params.company_id) || null;
	req.body.accesstype_id = parseInt(req.body.accesstype_id) || null;
	
	var q = 'SELECT DISTINCT c.name, c.barometeresvalue, c.totalspend, c.totalpaid, c.siret, (SELECT ccn.name FROM ccn WHERE ccn.ccn_id=c.ccn_id) ccnname, '+
			'(SELECT ccn.idcc FROM ccn WHERE ccn.ccn_id=c.ccn_id) as idcc, ad.road_1, ad.road_2, ad.postcode, ad.city, c.iban '+
			'FROM `company` c, `address` ad '+
			'WHERE c.address_id=ad.address_id AND c.company_id='+company_id+' '+
			' ';
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get company info: ');
		} else {
			if (rows[0]) {
				res.status(200).json({
					action : req.url,
					method : req.method,
					token : newtoken,
					data: {
						companyname : rows[0].name,
						barometeresvalue : rows[0].barometeresvalue,
						totalspend : rows[0].totalspend,
						totalpaid : rows[0].totalpaid,
						chart : [],
						siret: rows[0].siret,
						ccn: rows[0].ccnname,
						idcc: rows[0].idcc,
						address: rows[0].road_1 +' '+rows[0].road_2,
						postalcode: rows[0].postcode,
						city: rows[0].city,
						iban: rows[0].iban
					}
				});
			} else {
				mwarn(res, req, "No data available");
			}
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var company_id = parseInt(req.params.company_id) || null;
	req.body.accesstype_id = parseInt(req.body.accesstype_id) || null;
	
	var q = "";
	if (req.body.iban && req.body.iban!="") {
		q = "UPDATE `company` SET `iban` = '"+req.body.iban+"' WHERE `company`.`company_id` = "+company_id+" LIMIT 1; ";
		do_query(res, req, q, 'error update company info (iban): ');
	}
	if (req.body.address1 && req.body.address1!="") {
		q = "UPDATE `address` SET `road_1` = '"+req.body.address1+"' WHERE `address`.`address_id` = (SELECT c.address_id FROM company c WHERE c.company_id="+company_id+") LIMIT 1; ";
		do_query(res, req, q, 'error update company info (road_1): ');
	}
	if (req.body.address2 && req.body.address2!="") {
		q = "UPDATE `address` SET `road_2` = '"+req.body.address2+"' WHERE `address`.`address_id` = (SELECT c.address_id FROM company c WHERE c.company_id="+company_id+") LIMIT 1; ";
		do_query(res, req, q, 'error update company info (road_2): ');
	}
	if (req.body.postcode && req.body.postcode!="") {
		q = "UPDATE `address` SET `postcode` = '"+req.body.postcode+"' WHERE `address`.`address_id` = (SELECT c.address_id FROM company c WHERE c.company_id="+company_id+") LIMIT 1; ";
		do_query(res, req, q, 'error update company info (postcode): ');
	}
	if (req.body.city && req.body.city!="") {
		q = "UPDATE `address` SET `city` = '"+req.body.city+"' WHERE `address`.`address_id` = (SELECT c.address_id FROM company c WHERE c.company_id="+company_id+") LIMIT 1; ";
		do_query(res, req, q, 'error update company info (city): ');
	}
	res.status(200).json({
		action : req.url,
		method : req.method,
		token : newtoken,
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /COMPANY/MESSAGE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/company/message/:company_id')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id + ': '+ req.method+' '+req.url);
	
	var company_id = parseInt(req.params.company_id) || null;
	if (!company_id || !Number.isInteger(company_id) || company_id == 0)
		return mwarn(res, req, "company_id is required");
	
	var start = 0;
	var nbresults = config.nb_results_by_page;
	if (req.body.start)
		start = req.body.start;
	if (req.body.nbresults)
		nbresults = req.body.nbresults;
		
	var q = 'SELECT m.message_id, m.sender, m.text, m.datecreate, m.response_message_id FROM `message` m '+
			'WHERE m.company_id='+company_id+' '+
			'ORDER BY m.datecreate DESC LIMIT '+start+','+nbresults;;
	//mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get company messages: ')
		} else {
			var resarray = [];
			var responses = [];
			var prev_message_id = 0;
			for(var k in rows){
				//mlog(rows);
				if (rows[k].response_message_id != null) {
					if(!Array.isArray(responses[rows[k].response_message_id]))
						responses[rows[k].response_message_id] = [];
					responses[rows[k].response_message_id].push({
						"message_id": rows[k].message,
						"sender": rows[k].sender,
						"text": rows[k].text,
						"datecreate": rows[k].datecreate,
					});
				} else {
					resarray.push({
						"message_id": rows[k].message_id,
						"sender": rows[k].sender,
						"text": rows[k].text,
						"datecreate": rows[k].datecreate,
						"responses": responses,
					});
				}
			}
			for(var k in resarray){
				if (resarray[k].message_id && Array.isArray(responses[resarray[k].message_id]))
					resarray[k].responses = responses[resarray[k].message_id];
			}
			mlog(resarray);
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : {
					messages : resarray,
				}
			});
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var company_id = parseInt(req.params.company_id) || null;
	if (!company_id || !Number.isInteger(company_id) || company_id == 0)
		return mwarn(res, req, "company_id is required");
	
	var response_message_id = parseInt(req.body.response_message_id) || null;
	
	var q = "INSERT INTO `message` (`user_id`, `company_id`, `response_message_id`, `sender`, `text`, `datecreate`, `dateclose`) "+
			"VALUES ("+req.decoded.user_id+", "+company_id+", "+response_message_id+", 'user', '"+sqlescstr(req.body.message)+"', NOW(), NULL);";
	//mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			return merror(res, req, err, 'error post company messages: ')
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				message : 'Messages well added',
			});
		}
	});	
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /tools/accesstype ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/tools/accesstype')
///////////////// GET //
.get(function(req,res){ 

	mlog(user_id+': '+req.method+' '+req.url);

	var q = 'SELECT  a.accesstype_id, a.name, a.description '+
			'FROM `accesstype` a '+
			'ORDER BY a.accesstype_id ASC';
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get accesstype: ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"id" : rows[k].accesstype_id, 
					"name" : rows[k].name, 
					"desc" : rows[k].description, 
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				token : newtoken,
				data : { 
					accesstype : resarray,
				}
			});
		}
	});
});



//////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
app.use(myRouter);   

var httpServer = http.createServer(app);
//var httpsServer = https.createServer(options, app);

if (config.port_http && config.port_http != 0)
	httpServer.listen(config.port_http, config.hostname, function(){
		console.log("Lancement API green-sante.com: http://"+ hostname +":"+config.port_http);
	});
if (config.port_https && config.port_https != 0)	
	httpsServer.listen(config.port_https, config.hostname, function(){
		console.log("Lancement API green-sante.com: https://"+ hostname +":"+config.port_https);
	});

