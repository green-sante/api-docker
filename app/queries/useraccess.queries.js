const { mysql, db } = require('../Mysql');


exports.updateUserAccess = async (user_id, company_id, accesstype_id, value) => {
    try {
        value = (value === 'true' || value == true ? 1 : 0);
        // console.log(mysql.format('INSERT INTO useraccess (`user_id`, `company_id`, `accesstype_id`, `enable`) '+
        // 'VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `enable`=?', [user_id, company_id,accesstype_id,value,value]));
		const result = await db.query('INSERT INTO useraccess (`user_id`, `company_id`, `accesstype_id`, `enable`) '+
        'VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE `enable`=?', [user_id, company_id,accesstype_id,value,value] );
        return result.insertId;
    } catch (e) {
        console.log(e);
    }
}
