const ControlData = require('../ControlData.js');
const { mysql, db } = require('../Mysql');
var config = require('../config'); 


exports.savePrice = async (price) => {
    try {
        const result = await db.query("REPLACE INTO `pricing_rate` (guarantee_pack_id, date, pricing_location_id, pricing_type_id, pricing_age_id, rate) values (?);", 
        [[price.guarantee_pack_id, price.date, price.pricing_location_id, price.pricing_type_id, price.pricing_age_id, price.pricerate]]);
        //console.log(result);
        if (result.affectedRows == 0) return false;             
        else return true;
    } catch (e) {
        console.log(e);
    }
}

exports.getAllPrices = async (department, guarantee_pack_id) => {
    try {
        const result = await db.query( 'SELECT (SELECT c.value FROM `constant` c WHERE c.name LIKE "PMSS" AND c.year=YEAR(NOW())) as pmss, pr.rate as price_rate, '+
        'pt.name as type_name, pt.pricing_type_id, pst.name as struct_tarif_name, pst.pricing_struct_tarif_id as struct_tarif_id, pa.name as pricing_age_name, '+
        'pa.pricing_age_id as pricing_age_id, gp.name as guarantee_pack_name, gp.guarantee_pack_id as guarantee_pack_id, gp.img as guarantee_pack_img '+
		'FROM `pricing_rate` pr, `pricing_type` pt, `pricing_struct_tarif` pst, `pricing_age` pa, `guarantee_pack` gp , `pricing_location` pl  '+
		'WHERE pl.department LIKE ? AND gp.guarantee_pack_id=? AND ' +
		'pr.guarantee_pack_id=gp.guarantee_pack_id AND pr.pricing_location_id=pl.pricing_location_id AND pr.pricing_age_id=pa.pricing_age_id AND '+
		'pt.pricing_struct_tarif_id=pst.pricing_struct_tarif_id AND pr.pricing_type_id=pt.pricing_type_id '+
        'ORDER BY gp.guarantee_pack_id ASC, pl.pricing_location_id ASC, pt.pricing_type_id ASC ', 
        ["%"+department+"%", guarantee_pack_id] );
        if (result.length == 0) return false;                
        else return result;
    } catch (e) {
        console.log(e);
    }
}

exports.getAllPricesByGpIdLocId = async (pricing_location_id, guarantee_pack_id) => {
    try {
        const result = await db.query( 'SELECT (SELECT c.value FROM `constant` c WHERE c.name LIKE "PMSS" AND c.year=YEAR(NOW())) as pmss, pr.rate as price_rate, '+
        'pt.name as type_name, pt.pricing_type_id, pst.name as struct_tarif_name, pst.pricing_struct_tarif_id as struct_tarif_id, pa.name as pricing_age_name, '+
        'pa.pricing_age_id as pricing_age_id, gp.name as guarantee_pack_name, gp.guarantee_pack_id as guarantee_pack_id, gp.img as guarantee_pack_img '+
		'FROM `pricing_rate` pr, `pricing_type` pt, `pricing_struct_tarif` pst, `pricing_age` pa, `guarantee_pack` gp , `pricing_location` pl  '+
		'WHERE pl.pricing_location_id=? AND gp.guarantee_pack_id=? AND ' +
		'pr.guarantee_pack_id=gp.guarantee_pack_id AND pr.pricing_location_id=pl.pricing_location_id AND pr.pricing_age_id=pa.pricing_age_id AND '+
		'pt.pricing_struct_tarif_id=pst.pricing_struct_tarif_id AND pr.pricing_type_id=pt.pricing_type_id '+
        'ORDER BY gp.guarantee_pack_id ASC, pl.pricing_location_id ASC, pt.pricing_type_id ASC ', 
        [pricing_location_id, guarantee_pack_id] );
        if (result.length == 0) return false;                
        else return result;
    } catch (e) {
        console.log(e);
    }
}

exports.getPriceWithArgs = async (department, pricing_struct_tarif_id, pricing_age_id, pricing_type_id, guarantee_pack_id) => {
    try {
        if (pricing_type_id && Number.isInteger(pricing_type_id) && pricing_type_id != 0)
		    pricing_type_id = " AND pt.pricing_type_id="+pricing_type_id+" ";
        if (guarantee_pack_id && Number.isInteger(guarantee_pack_id) && guarantee_pack_id != 0)
		    guarantee_pack_id = " AND gp.guarantee_pack_id="+guarantee_pack_id+" ";

		const result = await db.query( 'SELECT (SELECT c.value FROM `constant` c WHERE c.name LIKE "PMSS" AND c.year=YEAR(NOW())) as pmss, pr.rate as price_rate, '+
        'pt.name as type_name, pst.name as struct_tarif_name, pst.pricing_struct_tarif_id as struct_tarif_id, pa.name as pricing_age_name, '+
        'pa.pricing_age_id as pricing_age_id, gp.name as guarantee_pack_name, gp.guarantee_pack_id as guarantee_pack_id, gp.img as guarantee_pack_img '+
		'FROM `pricing_rate` pr, `pricing_type` pt, `pricing_struct_tarif` pst, `pricing_age` pa, `guarantee_pack` gp , `pricing_location` pl  '+
		'WHERE pl.department LIKE ? AND pst.pricing_struct_tarif_id=? AND pa.pricing_age_id=? AND ' +
		'pr.guarantee_pack_id=gp.guarantee_pack_id AND pr.pricing_location_id=pl.pricing_location_id AND pr.pricing_age_id=pa.pricing_age_id AND '+
		'pt.pricing_struct_tarif_id=pst.pricing_struct_tarif_id AND pr.pricing_type_id=pt.pricing_type_id '+
        'ORDER BY gp.guarantee_pack_id ASC, pl.pricing_location_id ASC, pt.pricing_type_id ASC ', 
        ["%"+department+"%", pricing_struct_tarif_id, pricing_age_id, pricing_type_id, guarantee_pack_id] );
        if (result.length == 0) {
            return false;                
        } else {
            return result;
		}
    } catch (e) {
        console.log(e);
    }
}

exports.getPriceByGpId = async (department, pricing_struct_tarif_id, pricing_age_id, pricing_type_id, guarantee_pack_id) => {
    try {
        if (pricing_type_id && Number.isInteger(pricing_type_id) && pricing_type_id != 0)
		    pricing_type_id = " AND pt.pricing_type_id="+pricing_type_id+" ";
        if (guarantee_pack_id && Number.isInteger(guarantee_pack_id) && guarantee_pack_id != 0)
		    guarantee_pack_id = " AND gp.guarantee_pack_id="+guarantee_pack_id+" ";

        // TODO METTRE departement SUR 2 CHIFFRS OBLIGATOIREMENT
		const result = await db.query( 'SELECT (SELECT c.value FROM `constant` c WHERE c.name LIKE "PMSS" AND c.year=YEAR(NOW())) as pmss, pr.rate as price_rate, '+
        'pt.name as type_name, pst.name as struct_tarif_name, pst.pricing_struct_tarif_id as struct_tarif_id, pa.name as pricing_age_name, '+
        'pa.pricing_age_id as pricing_age_id, gp.name as guarantee_pack_name, gp.guarantee_pack_id as guarantee_pack_id, gp.img as guarantee_pack_img, gp.file as guarantee_pack_file '+
		'FROM `pricing_rate` pr, `pricing_type` pt, `pricing_struct_tarif` pst, `pricing_age` pa, `guarantee_pack` gp , `pricing_location` pl  '+
		'WHERE pl.department LIKE ? AND pst.pricing_struct_tarif_id=? AND pa.pricing_age_id=? AND ' +
		'pr.guarantee_pack_id=gp.guarantee_pack_id AND pr.pricing_location_id=pl.pricing_location_id AND pr.pricing_age_id=pa.pricing_age_id AND '+
		'pt.pricing_struct_tarif_id=pst.pricing_struct_tarif_id AND pr.pricing_type_id=pt.pricing_type_id '+
        'ORDER BY gp.guarantee_pack_id ASC, pt.pricing_type_id ASC ', 
        ["%"+department+"%", pricing_struct_tarif_id, pricing_age_id, pricing_type_id, guarantee_pack_id] );

        //console.log(result);

        if (result.length > 0) {
            return result;
        } else return false;
    } catch (e) {
        console.log(e);
    }
}

exports.getAgeRange = async (guarantee_pack_id) => {
    try {
        if (guarantee_pack_id && Number.isInteger(guarantee_pack_id) && guarantee_pack_id != 0)
		    guarantee_pack_id = " AND gp.guarantee_pack_id="+guarantee_pack_id+" ";

		const result = await db.query( 'SELECT DISTINCT pa.pricing_age_id, pa.name, pa.min, pa.max, pa.description, gp.name as guarantee_pack_name  '+
		'FROM `pricing_age` pa, `guarantee_pack` gp, `pricing_rate` pr '+
		'WHERE pa.pricing_age_id=pr.pricing_age_id AND gp.guarantee_pack_id=pr.guarantee_pack_id '+guarantee_pack_id+' ORDER BY pa.min ASC' );
        if (result.length == 0) return false;           
        else return result;
    } catch (e) {
        console.log(e);
    }
}

// A VOIR PAS SURE QUE LE guarantee_pack_id DANS LE QUERY FONCTIONNE
exports.getStructTarif = async (guarantee_pack_id) => {
    try {
        if (guarantee_pack_id && Number.isInteger(guarantee_pack_id) && guarantee_pack_id != 0)
		    guarantee_pack_id = " AND gp.guarantee_pack_id="+guarantee_pack_id+" ";

		const result = await db.query( 'SELECT DISTINCT pst.pricing_struct_tarif_id, pst.name, gp.name as guarantee_pack_name  '+
		'FROM `pricing_struct_tarif` pst,`pricing_type` pt, `guarantee_pack` gp, `pricing_rate` pr '+
		'WHERE pst.pricing_struct_tarif_id=pt.pricing_struct_tarif_id AND gp.guarantee_pack_id=pr.guarantee_pack_id  AND pr.pricing_type_id=pt.pricing_type_id '+guarantee_pack_id+
		'ORDER BY pst.name ASC ' );
        if (result.length == 0) return false;           
        else return result;
    } catch (e) {
        console.log(e);
    }
}

exports.getPriceLocationsByGPid = async (guarantee_pack_id) => {
    try {
        var gpid_sql = "";
        if (guarantee_pack_id && Number.isInteger(guarantee_pack_id) && guarantee_pack_id != 0) 
            gpid_sql = ", `pricing_rate` pr, `guarantee_pack` gp WHERE gp.guarantee_pack_id=pr.guarantee_pack_id AND pr.pricing_location_id=pl.pricing_location_id AND gp.guarantee_pack_id="+guarantee_pack_id+" ";

        var query = 'SELECT DISTINCT pl.pricing_location_id, pl.name, pl.department '+
        'FROM `pricing_location` pl '+gpid_sql+' ORDER BY pl.pricing_location_id ASC ';
		const result = await db.query( query );
        if (result.length == 0) return false;     
        else return result;
    } catch (e) {
        console.log(e);
    }
}

exports.getTypesByStructTarif = async (struct_tarif_id) => {
    try {
        if (!struct_tarif_id || !Number.isInteger(struct_tarif_id) || struct_tarif_id == 0)
            return false;

		const result = await db.query('SELECT DISTINCT pt.pricing_type_id, pt.name, pt.description '+
		'FROM `pricing_type` pt '+
		'WHERE pt.pricing_struct_tarif_id=? '+
        'ORDER BY pt.pricing_type_id ASC ', struct_tarif_id);
        if (result.length == 0) return false;           
        else return result;
    } catch (e) {
        console.log(e);
    }
}

