var config = require('../config');
const { db } = require('../Mysql');
const ControlData = require('../ControlData.js');

exports.saveRegistrationKey = async (accesstype_id, registrationkey, email, user_id, company_id) => {
    try {
        const result = await db.query("INSERT INTO `registrationkey` (`accesstype_id`,`registrationkey_id`, `datecreate`, `email`, `why`, `user_id`, `company_id`) " +
            "VALUES (?, ?, NOW(), ?, ?, ?, ?);", [accesstype_id, registrationkey, email, user_id, user_id, company_id]);
        if (result.affectedRows == 0) return false;
        else return registrationkey;
    } catch (e) {
        console.log(e);
    }
}

exports.getRegistrationKey = async (registrationkey) => {
    try {
        const result = await db.query("SELECT * FROM `registrationkey` WHERE registrationkey_id LIKE ?", [registrationkey]);
        if (result.length > 0) return result[0];
        else return false;
    } catch (e) {
        console.log(e);
    }
}

exports.updateRegistrationKey = async (registrationkey, user_id = null, email = null) => {
    try {
        const result = await db.query("UPDATE `registrationkey` SET `email`=?, `user_id`=? WHERE `registrationkey_id`=?;", [email, user_id, registrationkey]);
        if (result.affectedRows == 0) return false;
        else return true;
    } catch (e) {
        console.log(e);
    }
}


exports.saveRegistrationKeyData = async (regkey, savedata) => {
    try {
        const result = await db.query('UPDATE `registrationkey` SET savedata=? WHERE registrationkey_id=?', [savedata, regkey]);
        if (result.affectedRows > 0) return result.affectedRows;
        else return false;
    } catch (e) {
        console.log(e);
    }
}

exports.getContractTypeById = async (contracttype_id) => {
    try {
        const result = await db.query('SELECT name FROM `contracttype` c WHERE contracttype_id=?', [contracttype_id]);
        if (result.length == 0) return false;
        else return result[0].name;
    } catch (e) {
        console.log(e);
    }
}

exports.getAllAccessType = async (contracttype_id) => {
    try {
        const result = await db.query('SELECT  a.accesstype_id, a.name, a.description FROM `accesstype` a ORDER BY a.accesstype_id ASC');
        if (result.length == 0) return false;
        else return result;
    } catch (e) {
        console.log(e);
    }
}

exports.getCCN = async (idcc) => {
    try {
        var result;
        if (Number.isInteger(idcc) && idcc != 0) {
            result = await db.query('SELECT c.ccn_id, c.idcc, c.name, c.longname FROM `ccn` c WHERE c.idcc=? ORDER BY idcc ASC', [[idcc]]);
            if (result.length == 0) return false;
            else return result[0].ccn_id;
        } else {
            result = await db.query('SELECT c.ccn_id, c.idcc, c.name, c.longname FROM `ccn` c ORDER BY idcc ASC');
            if (result.length == 0) return false;
            else return result;
        }
    } catch (e) {
        console.log(e);
    }
}

exports.getInsurer = async () => {
    try {
        const result = await db.query('SELECT i.insurer_id, i.name FROM `insurer` i ORDER BY i.name ASC');
        if (result.length == 0) {
            return false;
        } else {
            return result;
        }
    } catch (e) {
        console.log(e);
    }
}

exports.insertContact = async (contact_info) => {
    try {
        const result = await db.query("INSERT INTO `contact` (`contact_id`, `name`, `email`, `phone`, `whatsapp`, `slack`) VALUES (?)", [[null, contact_info.name || null, contact_info.email || null, contact_info.phone || null, contact_info.whatsapp || null, contact_info.slack || null]]);
        if (result.insertId == 0) return false;
        else return result.insertId;
    } catch (e) {
        console.log(e);
    }
}

exports.updateContact = async (contact_id, contact_info) => {
    try {
        if (!contact_id || contact_id == 0 || contact_id == null)
            return this.insertContact(contact_info);
        else {
            const result = await db.query("UPDATE `contact` SET ? WHERE contact_id=?", [contact_info, contact_id]);
            if (result.affectedRows == 0) return false;
            else return contact_id;
        }
    } catch (e) {
        console.log(e);
    }
}

exports.insertMessage = async (user_id, company_id, response_message_id, message) => {
    try {
        const result = await db.query("INSERT INTO `message` (`user_id`, `company_id`, `response_message_id`, `sender`, `text`, `datecreate`, `dateclose`) " +
            "VALUES (?, ?, ?, 'user', ?, NOW(), NULL);", [user_id, company_id, response_message_id, message]);
        if (result.insertId == 0) return false;
        else return result.insertId;
    } catch (e) {
        console.log(e);
    }
}

exports.insertAddress = async (address, postalcode, city, name = 'default', country = 'France') => {
    try {
        const result = await db.query("INSERT INTO `address` (`name`, `road_1`, `postcode`, `city`, `country`) VALUES (?, ? , ?, ?, ?);", [name, address, postalcode, city, country]);
        if (result.insertId == 0) return false;
        else return result.insertId;
    } catch (e) {
        console.log(e);
    }
}

exports.updateAddressByCompanyId = async (company_id, address) => {
    try {
        const result = await db.query("SELECT c.address_id FROM company c WHERE c.company_id=?", [company_id]);
        return this.updateAddress((result ? result[0].address_id : null), address);
    } catch (e) {
        console.log(e);
    }
}

exports.updateAddress = async (address_id, address) => {
    try {
        if (!address_id || address_id == 0 || address_id == null)
            return this.insertAddress(address.road_1, address.postcode, address.city, address.name, address.country);
        else {
            const result = await db.query("UPDATE `address` SET ? WHERE address_id=?", [address, address_id]);
            if (result.affectedRows == 0) return false;
            else return address_id;
        }
    } catch (e) {
        console.log(e);
    }
}


exports.getAddressByAddressId = async (address_id) => {
    try {
        const result = await db.query("SELECT * FROM `address` WHERE address_id=?", [address_id]);
        return (result.length > 0 ? result[0] : false);
    } catch (e) {
        console.log(e);
    }
}

exports.getContactByContactId = async (contact_id) => {
    try {
        const result = await db.query("SELECT * FROM `contact` WHERE contact_id=?", [contact_id]);
        return (result.length > 0 ? result[0] : false);
    } catch (e) {
        console.log(e);
    }
}


exports.getTopQuestion = async () => {
    try {
        const result = await db.query('SELECT t.topquestion_id, t.subject, t.response ' +
            'FROM `topquestion` t ' +
            'WHERE ' +
            'DATE(NOW()) <= CASE WHEN @t.dateend IS NULL THEN DATE(NOW()) ELSE @t.dateend END AND ' +
            'DATE(NOW()) >= CASE WHEN @t.datestart IS NULL THEN DATE(NOW()) ELSE @t.datestart END AND ' +
            't.enable=? ' +
            'ORDER BY RAND() ' +
            'LIMIT 0,1', config.topquestion_user_enable);
        if (result.length > 0) return result[0];
        else return false;
    } catch (e) {
        console.log(e);
    }
}

exports.getNewsByCompanyId = async (user_id) => {
    try {
        const result = await db.query('SELECT n.news_id, n.description FROM `news` n WHERE n.news_id NOT IN (SELECT nr.news_id FROM `newsreaded` nr WHERE nr.user_id=?) AND n.enable=? ORDER BY RAND() LIMIT 0,3', [user_id, config.news_company_enable]);
        if (result.length > 0) return result;
        else return false;
    } catch (e) {
        console.log(e);
    }
}

exports.getNews = async (user_id) => {
    try {
        const result = await db.query('SELECT n.news_id, n.description FROM `news` n WHERE n.news_id NOT IN (SELECT nr.news_id FROM `newsreaded` nr WHERE nr.user_id=?)  AND n.enable=? ORDER BY RAND() LIMIT 0,3', [user_id, config.news_user_enable]);
        if (result.length > 0) return result;
        else return false;
    } catch (e) {
        console.log(e);
    }
}

exports.createRegistrationKey = async (reglink, email, user_id, company_id) => {
    try {
        const result = await db.query("INSERT INTO `registrationkey` (`registrationkey_id`, `datecreate`, `email`, `why`, `user_id`, `company_id`) " +
            "VALUES (?, NOW(), ?, ?, ?, ?);", [reglink, email, user_id, user_id, company_id]);
        if (result.affectedRows > 0) return result.affectedRows;
        else return false;
    } catch (e) {
        console.log(e);
    }
}

exports.saveNewsReaded = async (user_id, newsid) => {
    try {
        const result = await db.query("INSERT INTO `newsreaded` (`user_id`, `news_id`, `date`) VALUES (?, ?, NOW()) ON DUPLICATE KEY UPDATE `date`=NOW();", [user_id, newsid]);
        if (result.affectedRows > 0) return result.affectedRows;
        else return false;
    } catch (e) {
        console.log(e);
    }
}

exports.insertUserFile = async (user_id, file_upload, filename, comment, type, filedir, mimetype, filesize) => {
    try {
        const result = await db.query('INSERT INTO `file` (`company_id`, `user_id`, `name`,`realname`, `comment`, `type`, `path`, `mimetype`, `date`, `filesize`) \
        VALUES (NULL, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)', [user_id, file_upload, filename, comment, type, filedir, mimetype, filesize]);
        if (result.insertId > 0) return result.insertId;
        else return false;
    } catch (e) {
        console.log(e);
    }
}


exports.insertCompanyFile = async (filetype_id, company_id, user_id, file_upload, filename, comment, type, filedir, mimetype, filesize) => {
    try {
        const result = await db.query('INSERT INTO `file` (`filetype_id`, `company_id`, `user_id`, `name`,`realname`, `comment`, `type`, `path`, `mimetype`, `date`, `filesize`) \
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), ?)', [filetype_id, company_id, user_id, file_upload, filename, comment, type, filedir, mimetype, filesize]);
        if (result.insertId > 0) return result.insertId;
        else return false;
    } catch (e) {
        console.log(e);
    }
}

exports.insertRecipient = async (user_id, recipient_user_id, recipienttype_id) => {
    try {
        const result = await db.query('INSERT INTO `recipient` (`user_id`, `recipient_user_id`, `recipienttype_id`, `datestart`, `enable`) ' +
            "VALUES ( ?, ?, ?, NOW(), 1 )", [user_id, recipient_user_id, recipienttype_id]);
        if (result.insertId > 0) return result.insertId;
        else return false;
    } catch (e) {
        console.log(e);
    }
}


exports.getCardDataByUserId = async (user_id, period = new Date().getFullYear()) => {
    const result = await db.query('SELECT c.carddata_id, c.codefamille, c.name, c.value, c.calc, c.organismeTP, c.period, c.date_demande FROM `carddata` c, `user` u ' +
        'WHERE c.guarantee_pack_id=u.guarantee_pack_id AND u.user_id=? AND c.period=? ORDER BY c.weight ASC', [user_id, period]);
    if (result.length > 0) return result;
    else return false;
}

exports.insertCardDataByGuaranteePackId = async (guarantee_pack_id, codefamille, name, organismeTP, period, date_demande, value) => {
    try {
        const result = await db.query('INSERT INTO carddata (`guarantee_pack_id`, `codefamille`, `name`, `organismeTP`, `period`, `date_demande`, `value`) ' +
            'VALUES (?, ?, ?, ?, ?, ?, ?)', [guarantee_pack_id, codefamille, name, organismeTP, period, date_demande, value]);
        if (result.insertId > 0) return result.insertId;
        else return false;
    } catch (e) {
        console.log(e);
    }
}


exports.getFileByCompanyId = async (company_id, filetype_id = '') => {
    if (filetype_id != '')
        filetype_id = ' AND f.filetype_id=' + filetype_id + ' '
    const result = await db.query('SELECT f.filetype_id, f.filestatus_id, f.name as name, fs.name as filestatus_name, f.realname, f.type, f.path, f.mimetype, f.date, f.filesize, ft.description, fs.desc as status FROM `file` f, `filetype` ft, `filestatus` fs ' +
        'WHERE f.filetype_id=ft.filetype_id ' + filetype_id + ' AND f.company_id=? AND fs.filestatus_id=f.filestatus_id ORDER BY f.filetype_id DESC, f.date DESC', [company_id]);
    if (result.length > 0) return result;
    else return false;
}

exports.insertEventByUserId = async (user_id, eventtype_id, comment, jsondata, evenstatus_id = 1) => {
    if (!user_id || !eventtype_id || !comment)
        return false;

    if (ControlData.isObject(jsondata))
        jsondata = JSON.stringify(jsondata)

    const result = await db.query("INSERT INTO `event` ( `company_id`, `user_id`, `eventtype_id`, `userstatus_id`, `eventstatus_id`, `message`, `params`, `date_creation`) " +
        "VALUES ( NULL, ?, ?, " +
        "(SELECT u2.userstatus_id FROM `user` u2 WHERE u2.user_id=?) " +
        ", ?, ?, ?, NOW())", [user_id, eventtype_id, user_id, evenstatus_id || config.eventstatus_processed_id, ControlData.sqlescstr(comment), jsondata]);
    if (result.insertId > 0) return result.insertId;
    else return false;
}

