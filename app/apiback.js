/////////////////////////// PARAMETRES DU SERVEUR ///////////////////////
var hostname = '127.0.0.1';
var port_http = 3000;
var rootpath = __dirname;
/////////////////////////////////////////////////////////////////////////

NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ============================
// ALL THE PACKAGE ============
// ============================
var https = require('https');
var http = require('http');
var mysql = require('mysql');
var express = require('express');
//var dateFormat = require('dateformat');
var cors = require('cors');
var bodyParser = require('body-parser');
require('console-stamp')(console, '[HH:MM:ss.l]'); // add timestamps in front of log messages
var morgan = require('morgan'); // log toutes les requettes avec les temps de réponses
var jwt = require('jsonwebtoken'); // used to create, sign, and verify tokens
var timespan = require('timespan');

const fileUpload = require('express-fileupload');
//var crypto = require('crypto');
//var messenger = require('messenger'); // canal de communication entre les 2 APIs
//const fs = require('fs');
//const serial = require("generate-serial-key");
//const { Curl } = require('node-libcurl');
//const curl = new Curl();
//var siret = require('siret');
//var request = require('request');
//const superagent = require('superagent');
global.app = express();

// =======================
// GLOBAL VARS ===========
// =======================
var user_id = null;
var gl_isadmin = false;
var newtoken = null;
global.gl_debug = true; // DEBUG VAR

// =======================
// REQUIRE FILES =========
// =======================
var config = require('./config'); // get our config file
//const Guarantee = require('./Guarantee.js');
// const Utils = require('./Utils.js');
// const Emails = require('./Emails.js');
//const ControlData = require('./ControlData.js');

// =======================
// CONTROLERS ============
// =======================
//const userRoutes

// =============================
// MYSQL CONNECTION DATABASE ===
// =============================
// var connection = mysql.createConnection(
// 	config.dbmysql
// );
// connection.connect(function (err) {
// 	if (err) {
// 		console.error('Impossible de se connecter à la BDD (ORIGIN)', err);
// 		//send_error_email("Impossible de se connecter à la BDD\n"+err);
// 	}
// 	console.log('Démarrage de la connexion mysql ORIGIN');
// });

// ========================
// CONFIGURATION ==========
// ========================
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({ limit: '200mb' }));
var myRouter = express.Router();
app.use(morgan('dev')); // use morgan to log requests to the console
app.set('superSecret', config.secret); // secret variable
// enable files upload
app.use(
	fileUpload({
		createParentPath: true,
		limits: { fileSize: 100 * 1024 * 1024 }
	})
);

// ========================
// GESTION ERREURS ========
// ========================
app.use((err, req, res, next) => {
	const env = process.env.NODE_ENV;

	if (res.headersSent) {
		// si les headers ont deja été envoyé
		return next(err); // nous déléguons à Express
	}
	console.error(err.stack); // on affiche l'erreur dans la console
	if (env === 'production') {
		res.status(500).send({
			code: err.code || 500,
			message: err.message
		}); // on l'envoi en retour pour le debug
	} else {
		res.status(500).send({
			code: err.code || 500,
			message: err.message,
			stack: err.stack
		}); // on l'envoi en retour pour le debug
	}
});

// =======================
// FUNCTIONS =============
// =======================
function mlog(data) {
	console.log(data);
}

function merror(res, req, err, msg, num = 400) {
	console.log(msg, err.sqlMessage);
	console.log(err.sql);
	res.status(num).json({
		action: req.url,
		method: req.method,
		message: 'SQL Error'
	});
	//if (email)
	//send_error_email(msg+"\n"+err.sqlMessage+"\n"+err.sql);
}

function mwarn(res, req, msg, num = 405) {
	res.status(num).json({
		action: req.url,
		method: req.method,
		message: msg
	});
}

//////////////////////////////////////////////////////////////////////////////////////////////////
// BASE OPEN ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/').all(function(req, res) {
	res.status(200).json({
		message: 'Welcome on the APIBACK Green-sante.fr',
		method: req.method
	});
	//mlog(req);
});

//////////////////////////////////////////////////////////////////////////////////////////////////
// START OPEN //////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const {
	userDashboard,
	userLogin,
	userLostPassword,
	getUserExemption,
	postUserExemption,
	userRegistration,
	userOver50
} = require('./controllers/user.controller');

myRouter.post('/login', userLogin);
myRouter.post('/lostpassword', userLostPassword);
myRouter.get('/user/exemption', getUserExemption);
myRouter.post('/user/exemption', postUserExemption);
myRouter.post('/user/registration/', userRegistration);
myRouter.post('/user/over50', userOver50);
const { postCompany } = require('./controllers/company.controller');
myRouter.post('/company/registration', postCompany);

//////////////////////////////////////////////////////////////////////////////////////////////////
// TOOLS OPEN //////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const {
	getPrice,
	getPriceAgeRange,
	getPriceStructTarif,
	getPriceLocations,
	getPriceByGuaranteePack
} = require('./controllers/price.controller');
myRouter.get('/tools/price', getPrice);
myRouter.get('/tools/pricebyguaranteepack', getPriceByGuaranteePack);
myRouter.get('/tools/agerange', getPriceAgeRange);
myRouter.get('/tools/structtarif', getPriceStructTarif);
myRouter.get('/tools/pricinglocation', getPriceLocations);
const { getApiSiren, getApiSiret, getApiCCN } = require('./controllers/api.controller');
myRouter.get('/tools/siren', getApiSiren);
myRouter.get('/tools/siret', getApiSiret);
myRouter.get('/tools/ccn', getApiCCN);
const {
	getToolsInsurer,
	testEmail,
	saveRegistrationKeyData,
	getcompanycontract
} = require('./controllers/tools.controller');
myRouter.get('/tools/insurer', getToolsInsurer);
myRouter.get('/tools/testemail', testEmail);
myRouter.post('/tools/saveregistrationkeydata', saveRegistrationKeyData);
myRouter.get('/tools/getcompanycontract/:company_id', getcompanycontract);

//////////////////////////////////////////////////////////////////////////////////////////////////
// VERIFY TOKEN ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
// route middleware to verify a token (x-access-token)
myRouter.use(function(req, res, next) {
	//mlog(req.headers);
	// check header or url parameters or post parameters for token
	var token =
		req.query.token ||
		req.headers['x-access-token'] ||
		(req.headers['authorization'] ? req.headers['authorization'].substring(7) : '');
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
				gl_isadmin = req.decoded.isadmin;
				//global.user_id = user_id;

				//newtoken = await getToken({email: req.decoded.email, password: req.decoded.password, user_id:user_id, isadmin:gl_isadmin}),
				global.newtoken = jwt.sign(
					{
						email: req.decoded.email,
						password: req.decoded.password,
						user_id: user_id,
						enabled: req.decoded.enabled,
						isadmin: req.decoded.isadmin
					},
					app.get('superSecret'),
					{
						expiresIn: config.token_days_validity + ' days' // expires in X days
					}
				);
				next();
			}
		});
	} else {
		// if there is no token
		// return an error
		return res.status(401).send({
			action: req.url,
			method: req.method,
			message: 'Access token is missing or invalid'
		});
	}
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// USER SECURE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const {
	saveUserNewsRead,
	getUserInfo,
	postUserInfo,
	getUserAccess,
	postUserSponsor,
	getUserCarddata,
	postUserCardTP,
	getUserLive,
	getUserGuaranteesByActivities,
	getUserGuaranteesById,
	getUserGuaranteesByGuaranteeId,
	postUserFile,
	getUserRecipients,
	postUserRecipients,
	postUserAskHospital,
	getUserMessage,
	postUserMessage,
	getUserFile,
	getUserMessageByUserId
} = require('./controllers/user.controller');
myRouter.get('/user/dashboard', userDashboard);
myRouter.post('/user/dashboard', saveUserNewsRead);
myRouter.get('/user/info', getUserInfo);
myRouter.post('/user/info', postUserInfo);
myRouter.get('/user/access', getUserAccess);
myRouter.post('/user/sponsor', postUserSponsor);
myRouter.get('/user/carddata', getUserCarddata);
myRouter.post('/user/card', postUserCardTP);
myRouter.get('/user/live', getUserLive);
myRouter.get('/user/guarantees/activities', getUserGuaranteesByActivities);
myRouter.get('/user/guarantees', getUserGuaranteesById);
myRouter.get('/user/guarantee/:guarantee_id', getUserGuaranteesByGuaranteeId);
myRouter.post('/user/file', postUserFile);
// myRouter.get('/user/file/:user_id', getUserFile)
myRouter.get('/user/recipients', getUserRecipients);
myRouter.post('/user/recipients', postUserRecipients);
myRouter.post('/user/askhospital', postUserAskHospital);
myRouter.get('/user/message/:user_id', getUserMessageByUserId)
myRouter.get('/user/message', getUserMessage);
myRouter.post('/user/message', postUserMessage);

//////////////////////////////////////////////////////////////////////////////////////////////////
// COMPANY SECURE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const {
	getCompanyDashboard,
	saveUserCompanyNewsRead,
	getCompanyLive,
	getContractType,
	getCompanyDocs,
	getCompanyAccess,
	postCompanyAccess,
	getCompanyInfo,
	postCompanyInfo,
	getCompanyMessage,
	postCompanyMessage,
	getMissingDocs,
	postMissingDocs,
	postCompanyUsers,
	getCompanyStatus,
	updateCompanyStatus
} = require('./controllers/company.controller');
const { getUserByCompanyId, getNbUsers } = require('./controllers/user.controller');
myRouter.get('/company/dashboard/:company_id', getCompanyDashboard);
myRouter.post('/company/dashboard/:company_id', saveUserCompanyNewsRead);
myRouter.get('/company/live/:company_id', getCompanyLive);
myRouter.get('/company/status', getCompanyStatus);
myRouter.post('/company/updateStatus', updateCompanyStatus);
myRouter.get('/company/users/:company_id', getUserByCompanyId);
myRouter.get('/company/nbusers/:company_id', getNbUsers);
myRouter.get('/company/contracttype/:company_id', getContractType);
myRouter.get('/company/docs/:company_id', getCompanyDocs);
myRouter.get('/company/access/:company_id', getCompanyAccess);
myRouter.post('/company/access/:company_id', postCompanyAccess);
myRouter.get('/company/info/:company_id', getCompanyInfo);
myRouter.post('/company/info/:company_id', postCompanyInfo);
myRouter.get('/company/message/:company_id', getCompanyMessage);
myRouter.post('/company/message/:company_id', postCompanyMessage);
myRouter.get('/company/missingdocs/:company_id/:company_status_id', getMissingDocs);
myRouter.post('/company/missingdocs/:company_id/:company_status_id', postMissingDocs);
myRouter.post('/company/adduser/:company_id', postCompanyUsers);

//////////////////////////////////////////////////////////////////////////////////////////////////
// TOOLS SECURE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const { getAccessType } = require('./controllers/tools.controller');
myRouter.get('/tools/accesstype', getAccessType);

//////////////////////////////////////////////////////////////////////////////////////////////////
// ADMIN SECURE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const { getCompaniesList, updateCompany } = require('./controllers/company.controller');
const { getUsersList, updateUser } = require('./controllers/user.controller');
const { getGuaranteePack, getGuaranteePackInfos, getGuaranteeValue } = require('./controllers/guarantee.controller');
const { getOsInformations, generatecarteTP } = require('./controllers/tools.controller');
const {
	getPriceByGuaranteePackId,
	savePriceByGuaranteePackId,
	getPriceByGuaranteePackIdLocationId
} = require('./controllers/price.controller');
myRouter.get('/admin/companies', getCompaniesList);
myRouter.post('/admin/company', updateCompany);
myRouter.get('/admin/guarantee_pack', getGuaranteePack);
myRouter.get('/admin/guarantee_pack_info/:guarantee_pack_id', getGuaranteePackInfos);
myRouter.get('/admin/guarantee/:guarantee_id', getGuaranteeValue);
myRouter.get('/admin/osinfos', getOsInformations);
myRouter.get('/admin/users', getUsersList);
myRouter.post('/admin/users', updateUser);
myRouter.get('/admin/user/file/:user_id', getUserFile);
myRouter.get('/admin/pricebypack', getPriceByGuaranteePackId);
myRouter.get('/admin/pricebypackbylocation', getPriceByGuaranteePackIdLocationId);
myRouter.post('/admin/price', savePriceByGuaranteePackId);
myRouter.get('/admin/generatecarteTP', generatecarteTP);

//////////////////////////////////////////////////////////////////////////////////////////////////
// IGA SECURE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const {
	updateActesByFamilly,
	updateActesByAssure,
	updateCompanyInfos,
	updateUserInfos,
	userGetEvent,
	updateCarteTP,
	updateEventFamily,
	updateEventType,
	updateFraisByAssure,
	updateCollege,
	createCompany,
	updateRegime,
	updateFormeJuridique,
	updateModePaiement
} = require('./controllers/IGA.controller');
myRouter.get('/IGA/updateActesByFamilly', updateActesByFamilly);
myRouter.get('/IGA/updateActesByAssure', updateActesByAssure);
myRouter.get('/IGA/updateCompanyInfos', updateCompanyInfos);
myRouter.get('/IGA/updateUserInfos', updateUserInfos);
myRouter.get('/IGA/userGetEvent', userGetEvent);
myRouter.get('/IGA/updateCarteTP', updateCarteTP);
myRouter.get('/IGA/updateEventFamily', updateEventFamily);
myRouter.get('/IGA/updateEventType', updateEventType);
myRouter.get('/IGA/updateCollege', updateCollege);
myRouter.get('/IGA/updateRegime', updateRegime);
myRouter.get('/IGA/updateModePaiement', updateModePaiement);
myRouter.get('/IGA/updateFormeJuridique', updateFormeJuridique);
myRouter.get('/IGA/updateFraisByAssure', updateFraisByAssure);
myRouter.get('/IGA/createCompany', createCompany);

//////////////////////////////////////////////////////////////////////////////////////////////////
// /ADMIN/packs/ ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const { savePack, updatePack, deletePack } = require('./controllers/guarantee.controller');
myRouter.post('/admin/packs', savePack);
myRouter.post('/admin/packs/:guarantee_pack_id', updatePack);
myRouter.delete('/admin/packs/:guarantee_pack_id', deletePack);

//////////////////////////////////////////////////////////////////////////////////////////////////
// /ADMIN/guarantee_categorie/ ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const {
	findAllGuaranteCategory,
	updateGuaranteCategory,
	saveGuaranteCategory
} = require('./controllers/guarantee.controller');

myRouter.get('/admin/guarantee_category', findAllGuaranteCategory);
myRouter.post('/admin/guarantee_category', saveGuaranteCategory);

myRouter.post('/admin/guarantee_category/:guarantee_category_id', updateGuaranteCategory);

//////////////////////////////////////////////////////////////////////////////////////////////////
// /ADMIN/guarantee_activity/ ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

const {
	findGuaranteeActivity,
	saveGuaranteeActivity,
	updateGuaranteeActivity,
	deleteGuaranteeActivity
} = require('./controllers/guarantee.controller');

myRouter.get('/admin/guarantee_activity', findGuaranteeActivity);
myRouter.post('/admin/guarantee_activity', saveGuaranteeActivity);
myRouter.post('/admin/guarantee_activity/:guarantee_activity_id', updateGuaranteeActivity);
myRouter.delete('/admin/guarantee_activity/:guarantee_activity_id', deleteGuaranteeActivity);

//////////////////////////////////////////////////////////////////////////////////////////////////
// /ADMIN/guarante ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const { findAllGuarantes, saveGuarante } = require('./controllers/guarantee.controller');
myRouter.get('/admin/guarantee', findAllGuarantes);
myRouter.post('/admin/guarantee', saveGuarante);

//////////////////////////////////////////////////////////////////////////////////////////////////
// /ADMIN/guarantee_value ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const { saveGuaranteeValue } = require('./controllers/guarantee.controller');
myRouter.post('/admin/guarantee_value', saveGuaranteeValue);

//////////////////////////////////////////////////////////////////////////////////////////////////
// /ADMIN/imap ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const { fetchEmailsImap, sendEmailsImap } = require('./controllers/IGA.controller');

myRouter.get('/admin/imap/email', fetchEmailsImap);
myRouter.post('/admin/imap/email/send', sendEmailsImap);

//////////////////////////////////////////////////////////////////////////////////////////////////
// /tools/quote:company_id ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
const { getPDFQuote } = require('./controllers/tools.controller');
myRouter.get('/tools/quote/:company_id', getPDFQuote);

//////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////

app.use(myRouter);
var httpServer = http.createServer(app);
//var httpsServer = https.createServer(options, app);

if (config.port_http && config.port_http != 0)
	httpServer.listen(config.port_http, config.hostname, function() {
		console.log('Lancement API green-sante.com: http://' + hostname + ':' + config.port_http);
	});
if (config.port_https && config.port_https != 0)
	httpsServer.listen(config.port_https, config.hostname, function() {
		console.log('Lancement API green-sante.com: https://' + hostname + ':' + config.port_https);
	});
