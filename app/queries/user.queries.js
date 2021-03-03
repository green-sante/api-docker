const ControlData = require('../ControlData.js');
const { mysql, db } = require('../Mysql');
var config = require('../config'); // get our config file


exports.saveUserAskHospital = async (user_id, comment, jsondata) => {
	if (!user_id)
		return false;

	const result = await db.query("INSERT INTO `event` ( `company_id`, `user_id`, `eventtype_id`, `userstatus_id`, `eventstatus_id`, `message`, `params`, `date_creation`) " +
		"VALUES ( NULL, ?, ?, " +
		"(SELECT u2.userstatus_id FROM `user` u2 WHERE u2.user_id=?) " +
		", ?, ?, ?, NOW())", [user_id, config.event_askhospital_id, user_id, config.eventstatus_processed_id, ControlData.sqlescstr(comment), jsondata]);
	if (result.insertId > 0) return result.insertId;
	else return false;
}

exports.saveUserRecipentsByUserId = async (user_id, email, firstname, lastname, secunumber, owneriban = null) => {
	if (!user_id)
		return false;
	const result = await db.query("INSERT INTO `user` (`email`, `userstatus_id`, `guarantee_pack_id`, `company_id`, `from_user_id`, `firstname`, `lastname`, `dateregister`, `ownersecunumber`, `owneriban`) \
	VALUES ( ?, ?, (SELECT u2.guarantee_pack_id FROM `user` u2 WHERE u2.user_id=?), (SELECT u3.company_id FROM `user` u3 WHERE u3.user_id=?) \
	, ?, ?, ?, NOW(), ?, ?)", [email, config.userstatus_recipient_id, user_id, user_id, user_id, firstname, lastname, secunumber, owneriban]);
	if (result.insertId > 0) return result.insertId;
	else return false;
}

exports.postUserMessageByUserId = async (user_id, response_message_id, message) => {
	if (!user_id)
		return false;
	const result = await db.query("INSERT INTO `message` (`user_id`, `company_id`, `response_message_id`, `sender`, `text`, `datecreate`, `dateclose`) " +
		"VALUES (?, NULL, ?, 'user', ?, NOW(), NULL);", [user_id, response_message_id, message]);
	if (result.insertId > 0) return result.insertId;
	else return false;
}

exports.getUserMessageByUserId = async (user_id, start, nbresults) => {
	if (!user_id)
		return false;
	const result = await db.query('SELECT m.message_id, m.sender, m.text, m.datecreate, m.response_message_id FROM `message` m ' +
		'WHERE m.user_id=? AND m.company_id IS null ' +
		'ORDER BY m.datecreate DESC LIMIT ?,?', [user_id, start, nbresults]);
	if (result.length > 0) return result;
	else return false;
}

exports.getUserRecipentsByUserId = async (user_id) => {
	if (!user_id)
		return false;
	const result = await db.query('SELECT r.recipient_user_id, u.email, u.firstname, u.lastname, r.datestart, r.enable \
									FROM `user` u, `recipient` r  \
									WHERE r.user_id=? AND u.user_id=r.recipient_user_id \
									ORDER BY r.datestart ASC', [user_id]);
	if (result.length > 0) return result;
	else return false;
}

exports.getUserGuaranteeValues = async (guarantee_id) => {

	if (!guarantee_id)
		return false;
	const result = await db.query('SELECT gpv.txtvalue, gpv.description, gpv.value, gpv.exemple \
								  FROM `guarantee_pack_value` gpv \
								  WHERE gpv.guarantee_id=? \
								  ORDER BY gpv.weight ASC', [guarantee_id]);
	if (result.length > 0) return result;
	else return false;
}

exports.getUserGuarantees = async (user_id, activity_id, search, idstart) => {

	idstart = parseInt(idstart) || 0;
	activity_id = parseInt(activity_id) || "";
	if (activity_id)
		activity_id = " AND ga.guarantee_activity_id=" + activity_id;
	else activity_id = "";
	if (search)
		search = " AND (g.name LIKE '%" + search + "%' OR ga.name LIKE '%" + search + "%') ";
	else search = "";

	const result = await db.query('SELECT DISTINCT g.name as guarantee_name, g.guarantee_id, ga.name as activity_name, ga.guarantee_activity_id, ' +
		'(SELECT gc.name FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_name, ' +
		'g.guarantee_category_id, g.img, g.url, g.description, gp.name as packname, ' +
		'gp.description as packdesc ' +
		'FROM `guarantee` g, `guarantee_activity` ga, `guarantee_pack_value` gpv, `guarantee_pack` gp, `user` u   ' +
		'WHERE u.user_id=? AND gp.guarantee_pack_id=u.guarantee_pack_id ' +
		'AND gp.guarantee_pack_id=gpv.guarantee_pack_id AND g.guarantee_id=gpv.guarantee_id ' +
		'AND g.guarantee_activity_id=ga.guarantee_activity_id ' + activity_id + ' ' +
		'AND gpv.enable=1 ' + search + ' ' +
		'ORDER BY g.weight ASC, gpv.weight ASC LIMIT ?,? ', [user_id, idstart, config.nb_guarantee_by_page]);
	if (result.length > 0) return result;
	else return false;
}

exports.getUserGuaranteesByUserId = async (user_id, search, maxresults) => {

	if (search)
		search = " AND (g.name LIKE '%" + search + "%' OR ga.name LIKE '%" + search + "%') ";
	else search = "";
	if (maxresults)
		maxresults = " LIMIT 0," + maxresults;
	else maxresults = "";

	const result = await db.query('SELECT DISTINCT g.name as guarantee_name, g.guarantee_id, ga.name as activity_name, ga.guarantee_activity_id, ga.description, ' +
		'(SELECT gc.name FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_name, ' +
		'(SELECT gc.description FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_desc, ' +
		'g.guarantee_category_id, g.img, g.url, g.description, gp.name as packname, ' +
		'gp.description as packdesc ' +
		'FROM `guarantee` g, `guarantee_activity` ga, `guarantee_pack_value` gpv, `guarantee_pack` gp, `user` u   ' +
		'WHERE u.user_id=? AND gp.guarantee_pack_id=u.guarantee_pack_id ' +
		'AND gp.guarantee_pack_id=gpv.guarantee_pack_id AND g.guarantee_id=gpv.guarantee_id ' +
		'AND g.guarantee_activity_id=ga.guarantee_activity_id ' +
		'AND gpv.enable=1 ' + search +
		'ORDER BY ga.guarantee_activity_id ASC, g.guarantee_category_id ASC, g.weight ASC, gpv.weight ASC ' + maxresults, [user_id]);
	if (result.length > 0) return result;
	else return false;
}

exports.getUserExemptionById = async (exemption_id) => {
	if (!exemption_id)
		return false;
	const result = await db.query('SELECT  * ' +
		'FROM `userexemption` a ' +
		'WHERE a.userexemption_id=? ', [exemption_id]);
	if (result.length > 0) return result[0];
	else return false;
}

exports.getUserAddressById = async (address_id) => {
	if (!address_id)
		return false;
	const result = await db.query('SELECT  * ' +
		'FROM `address` a ' +
		'WHERE a.address_id=? ', [address_id]);
	if (result.length > 0) return result[0];
	else return false;
}

exports.getUserContactById = async (contact_id) => {
	if (!contact_id)
		return false;
	const result = await db.query('SELECT  * ' +
		'FROM `contact` c ' +
		'WHERE c.contact_id=? ', [contact_id]);
	if (result.length > 0) return result[0];
	else return false;
}

exports.getAllUsers = async () => {
	const result = await db.query('SELECT  u.user_id, u.email, u.phone, u.userstatus_id, us.name as userstatus_name, u.guarantee_pack_id, u.contracttype_id, u.firstname, u.lastname, u.contact_id, u.address_id, u.dateregister, u.ownerid, u.ownersecunumber, u.teletransmissionnumber, u.teletransmissionstateid, u.amccode, u.userexemption_id ' +
		'FROM `user` u, `userstatus` us ' +
		'WHERE u.userstatus_id=us.userstatus_id ');
	if (result.length > 0) return result;
	else return false;
}

exports.getAllUserByCompanyId = async (company_id, search) => {
	if (search != "")
		search = " AND ( u.firstname LIKE '%" + ControlData.sqlescstr(search) + "%' OR u.lastname LIKE '%" + ControlData.sqlescstr(search) + "%' )";
	else search = "";

	console.log("company_id", company_id);
	const sql = mysql.format('SELECT u.user_id, ct.contracttype_id, ct.name as contracttype_name, u.firstname, u.lastname, pt.pricing_type_id, pt.name as pricing_type_name, u.userstatus_id, us.name as userstatus_name, u.guarantee_pack_id, u.contracttype_id, u.dateregister, u.userexemption_id \
	FROM `user` u, `userstatus` us ,`useraccess` ua , `contracttype` ct, `pricing_type` pt  \
	WHERE u.userstatus_id=us.userstatus_id AND u.contracttype_id=ct.contracttype_id AND u.pricing_type_id=pt.pricing_type_id AND \
	ua.company_id='+ company_id + ' AND ua.user_id=u.user_id AND ua.accesstype_id=' + config.useraccess_main + '' + search);
	//console.log("SQL", sql);
	const result = await db.query(sql);
	return result
	// if (result.length > 0) return result;
	// else return [];
}

exports.getAllUserByCompany = async (company_id) => {
	return await db.query('SELECT * FROM `user` where company_id = ?', company_id);

}



exports.getUserEvents = async (user_id, nbstart, nbresults) => {
	const result = await db.query('SELECT  e.event_id, e.eventtype_id, et.name as typename, et.description as typedesc, e.message, ' +
		'e.date_creation, e.date_updated, e.params, es.eventstatus_id, es.color, es.name as eventname, es.description as eventdesc, us.userstatus_id, ' +
		'us.name as userstatus_name, us.description as userstatus_desc ' +
		'FROM `event` e, `eventstatus` es, `eventtype` et,`userstatus` us ' +
		'WHERE e.user_id=? AND e.eventstatus_id=es.eventstatus_id AND e.eventtype_id=et.eventtype_id ' +
		'AND e.userstatus_id=us.userstatus_id ' +
		'ORDER BY e.date_creation DESC LIMIT ?,?', [user_id, nbstart, nbresults]);
	if (result.length > 0) return result;
	else return false;
}

exports.postUserInfoByUserId = async (body, user_id) => {
	var data = Object();
	if (body.ownerfirstname)
		Object.assign(data, { 'firstname': body.ownerfirstname });
	if (body.ownerlastname)
		Object.assign(data, { 'lastname': body.ownerlastname });
	if (body.ownersecunumber)
		Object.assign(data, { 'ownersecunumber': body.ownersecunumber });

	const result = await db.query("UPDATE `user` u SET ? WHERE u.`user_id` = ?", [data, user_id]);
	if (result.affectedRows > 0) return result.affectedRows;
	else return false;
}

exports.getUserInfoByUserId = async (user_id) => {
	const result = await db.query('SELECT  us.userstatus_id as userstatus_id, us.name as userstatus_message, e.date_creation as userstatus_date_start, u.firstname, ' +
		'u.lastname, u.user_id, u.ownersecunumber, u.teletransmissionnumber, u.teletransmissionstateid, u.amccode, u.ownervalidationurl, u.concentrator, u.IGA_idassure ' +
		'FROM `user` u, `userstatus` us , `event` e, `eventtype` et ' +
		'WHERE u.user_id=? AND u.userstatus_id=us.userstatus_id AND e.user_id=u.user_id ' +
		'AND et.eventtype_id=e.eventtype_id AND e.eventtype_id=? ' +
		'ORDER BY e.date_creation DESC LIMIT 1', [user_id, config.event_subscription_id]);
	if (result.length > 0) return result[0];
	else return result[0];
}


exports.getUserByUserId = async (user_id) => {
	const result = await db.query('SELECT  us.userstatus_id as userstatus_id, us.name as userstatus_message, u.firstname, ' +
		'u.lastname, u.user_id, u.ownersecunumber, u.teletransmissionnumber, u.teletransmissionstateid, u.amccode, u.ownervalidationurl, u.concentrator, u.IGA_idassure, u.marital_status_id, ms.name as matital_status_name, u.civility_id, c.name as civility_name, u.address_id, u.contact_id, u.guarantee_pack_id ' +
		'FROM `user` u, `userstatus` us, `civility` c, `marital_status` ms ' +
		'WHERE u.user_id=? AND u.userstatus_id=us.userstatus_id AND u.marital_status_id=ms.marital_status_id AND u.civility_id=c.civility_id ' +
		'LIMIT 1', [user_id]);
	if (result.length > 0) return result[0];
	else return result[0];
}

exports.getNbUsersByCompanyId = async (company_id,) => {
	const result = await db.query('SELECT COUNT(u.user_id) as nbusers ' +
		'FROM `user` u, `useraccess` ua  ' +
		'WHERE ua.company_id=? AND u.userstatus_id=? AND ' +
		'ua.user_id=u.user_id AND ua.accesstype_id=?', [company_id, config.userstatus_validated, config.useraccess_main]);
	if (result.length > 0) return result[0];
	else return result[0];
}

exports.getUserBarometer = async (user_id) => {
	const result = await db.query('SELECT c.name, c.barometeresvalue, c.totalpaid, c.totalspend ' +
		'FROM `company` c, `user` u, `useraccess` ua , `accesstype` a ' +
		'WHERE c.company_id=ua.company_id AND ua.user_id=u.user_id ' +
		'AND u.user_id=? AND a.name="main" ' +
		'AND ua.accesstype_id=a.accesstype_id', user_id);
	if (result.length > 0) return result[0];
	else return result[0];
}

exports.getUserByEmail = async (email) => {
	try {
		const user = await db.query('SELECT * FROM user u WHERE u.email=?', email);
		if (user.length == 0) {
			return false;
		} else {
			return user[0];
		}
	} catch (e) {
		console.log(e);
	}
}

exports.getUserExemption = async () => {
	try {
		const result = await db.query('SELECT * FROM userexemption u ORDER BY userexemption_id ASC ');
		if (result.length == 0) return false;
		else {
			return result;
		}
	} catch (e) {
		console.log(e);
	}
}

exports.getUserByRegistrationkey = async (registrationkey) => {
	// SI IL Y A registrationkey alors on retrouve l'email et on enregistre l'exemption_id choisis
	if (registrationkey && registrationkey != "") {
		const result = await db.query("SELECT r.email, r.user_id, r.company_id, r.accesstype_id FROM registrationkey r WHERE r.registrationkey_id LIKE ?",
			ControlData.sqlescstr(registrationkey));
		if (result.length == 0) {
			return false;
		} else {
			return result[0];
		}
	} else return false;
}

// var userId = 1;
// var columns = ['username', 'email'];
// var query = connection.query('SELECT ?? FROM ?? WHERE id = ?', [columns, 'users', userId],
// SELECT `username`, `email` FROM `users` WHERE id = 1
exports.insertUserSimple = async (user) => {
	const result = await db.query("INSERT INTO `user` (`email`, `registrationkey_id`, `userexemption_id`) " +
		"VALUES (?, ?, ?);", [user.email, ControlData.sqlescstr(user.registrationkey), user.exemption_id]);
	return result.insertId;
}

exports.userCreate = async (email, phone = null, firstname = null, lastname = null, pass = null, userstatus_id = 1) => {
	const result = await db.query("INSERT INTO `user` (`email`, `password`, `phone`, `userstatus_id`, `firstname`, `lastname`, `dateregister`) " +
		"VALUES (?, ?, ?, ?, ?, ?, NOW());", [email, pass, phone, userstatus_id, firstname, lastname]);
	return result.insertId;
}

exports.userUpdateAccessByValue = async (user_id, company_id, accesstype_id, value) => {
	value = (value === 'true' || value == true ? 1 : 0);
	const result = await db.query('INSERT INTO useraccess (`user_id`, `company_id`, `accesstype_id`, `enable`) ' +
		'VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `enable`=?', [user_id, company_id, accesstype_id, value, value]);
	return result.affectedRows;
}

exports.insertUser = async (user) => {
	const result = await db.query("INSERT INTO `user` (`email`, `password`, `phone`, `company_id`,`userstatus_id`, `firstname`, `lastname`, `contact_id`, `address_id`, " +
		"`dateregister`, `ownerid`, `ownersecunumber`, `teletransmissionnumber`, `teletransmissionstateid`, `amccode`, `registrationkey_id`) " +
		"VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?, ?, ?, ?, ?, ?);", [user.email, user.password, user.phone, user.company_id, config.userstatus_registration, user.firstname, user.lastname, null, user.address_id, null, user.secu, null, null, null, user.registrationkey]);
	return result.insertId;
}

exports.updateUserByUserId = async (user_id, data) => {
	var user = {
		user_id: parseInt(data.user_id) || null,
		firstname: data.firstname || null,
		email: data.email || null,
		phone: data.phone || null,
		userstatus_id: data.userstatus_id || null,
		guarantee_pack_id: data.guarantee_pack_id || null,
		contracttype_id: data.contracttype_id || null,
		firstname: data.firstname || null,
		lastname: data.lastname || null,
		contact_id: data.contact_id || null,
		address_id: data.address_id || null,
		ownerid: data.ownerid || null,
		ownersecunumber: data.ownersecunumber || null,
		teletransmissionnumber: data.teletransmissionnumber || null,
		teletransmissionstateid: data.teletransmissionstateid || null,
		amccode: data.amccode || null,
		userexemption_id: data.userexemption_id || null,
	};
	const result = await db.query("UPDATE `user` SET ? WHERE `user`.`user_id` = ? ", [user, user_id]);
	return result.affectedRows;
}


exports.findFilesByUserId = async (user_id) => {
	const result = await db.query("SELECT * FROM `file` where user_id = ?", user_id)
	if (result.length == 0) {
		return false;
	} else {
		return result;
	}

}

exports.fetchMessageByUserId = async (user_id) => {
	const result = await db.query(
		'SELECT m.message_id, m.sender, m.text, m.datecreate, m.response_message_id FROM `message` m ' +
		'WHERE m.user_id=? ORDER BY m.datecreate DESC',
		[user_id],
	)
	if (result.length > 0) return result
	else return false
}
