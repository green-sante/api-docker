var config = require('../config'); 
const { db } = require('../Mysql');

exports.updateIGAEventFamily = async (IGA_id, IGA_name) => {
    try {
		const result = await db.query("INSERT INTO `IGA_event_family` (`IGA_id`,`name`) "+
        "VALUES (?, ?) ON DUPLICATE KEY UPDATE `name`=?", [IGA_id, IGA_name, IGA_name]);
        if (result.affectedRows == 0) return false;                
        else return true;
    } catch (e) {
        console.log(e);
    }

}

exports.updateIGAEventType = async (IGA_id, IGA_name, IGA_event_family_id) => {
    try {
		const result = await db.query("INSERT INTO `IGA_event_type` (`IGA_id`,`name`,`IGA_event_family_id`) "+
        "VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `name`=?, `IGA_event_family_id`=?", [IGA_id, IGA_name, IGA_event_family_id,IGA_name, IGA_event_family_id, IGA_id]);
        if (result.affectedRows == 0) return false;                
        else return true;
    } catch (e) {
        console.log(e);
    }
}

exports.updateCollegeData = async (idCollege, name) => {
    try {
		const result = await db.query("INSERT INTO `IGA_college` (`idCollege`,`name`) "+
        "VALUES (?, ?) ON DUPLICATE KEY UPDATE `idCollege`=?, `name`=?", [idCollege, name, idCollege, name]);
        if (result.affectedRows == 0) return false;                
        else return true;
    } catch (e) {
        console.log(e);
    }
}

exports.updateRegimeData = async (idRegime, name) => {
    try {
		const result = await db.query("INSERT INTO `IGA_regime` (`idRegime`,`name`) "+
        "VALUES (?, ?) ON DUPLICATE KEY UPDATE `idRegime`=?, `name`=?", [idRegime, name, idRegime, name]);
        if (result.affectedRows == 0) return false;                
        else return true;
    } catch (e) {
        console.log(e);
    }
}

exports.updateFormeJuridique = async (idFormeJuridique, name, smallname) => {
    try {
		const result = await db.query("INSERT INTO `IGA_forme_juridique` (`IdFormeJuridique`,`name`,`smallname`) "+
        "VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE `IdFormeJuridique`=?, `name`=?, `smallname`=?", [idFormeJuridique, name, smallname, idFormeJuridique, name, smallname]);
        if (result.affectedRows == 0) return false;                
        else return true;
    } catch (e) {
        console.log(e);
    }
}

exports.updateModePaiement = async (idModePaiement, name) => {
    try {
		const result = await db.query("INSERT INTO `IGA_mode_paiement` (`IdModePaiement`,`name`) "+
        "VALUES (?, ?) ON DUPLICATE KEY UPDATE `IdModePaiement`=?, `name`=?", [idModePaiement, name,idModePaiement, name]);
        if (result.affectedRows == 0) return false;                
        else return true;
    } catch (e) {
        console.log(e);
    }
}

exports.updateIGAEvent = async (user_id, data) => {
    try {
        await Object.entries(data).forEach(entry => {
            const [key, val] = entry;
            data[key] = (val == 'NULL' || val == null ? 0 : val);
            //console.log(key, data[key]);
        });
        // Object.values(data).forEach(val => {
        //     val = (val == null? 0 : val);
        // });
		const result = await db.query("INSERT INTO `IGA_refund` (`no_dossier`, `idDecompte`, `beneficaire`, `destinataire`, `user_id`, `acte`, `date_creation`, `date_soins`, `mt_paye`, `mt_VirementArrivee`, `mt_reelArrive`, `fraisAccepteConv`, `rembutreConv`, `rembROConv`, `rembReelConv`, `qte`, `mt_RC`, `rac`, `regimeDeBase`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE `no_dossier`=?, `beneficaire`=?, `destinataire`=?, `user_id`=?, `acte`=?, `date_creation`=?, `date_soins`=?, `mt_paye`=?, `mt_VirementArrivee`=?, `mt_reelArrive`=?, `fraisAccepteConv`=?, `rembutreConv`=?, `rembROConv`=?, `rembReelConv`=?, `qte`=?, `mt_RC`=?, `rac`=?, `regimeDeBase`=?", [data.no_dossier, data.idDecompte, data.beneficiaire, data.destinataire, user_id, data.acte, data.date_creation, data.date_soins, data.mt_paye, data.mt_VirementArrivee, data.mt_reelArrivee , data.rembutreConv, data.fraisAccepteConv, data.rembROConv, data.rembReelConv, data.qte, data.mt_RC, data.rac, data.regimeDeBase, data.no_dossier, data.beneficiaire, data.destinataire, user_id, data.acte, data.date_creation, data.date_soins, data.mt_paye, data.mt_VirementArrivee, data.mt_reelArrivee, data.rembutreConv, data.fraisAccepteConv, data.rembROConv, data.rembReelConv, data.qte, data.mt_RC, data.rac, data.regimeDeBase, data.idDecompte]);
        if (result.affectedRows == 0) return false;                
        else return true;
    } catch (e) {
        console.log(e);
    }
}


exports.getIGAFormeJuridique = async (IGA_forme_juridique_id) => {
    try {
		const result = await db.query("SELECT * FROM `IGA_forme_juridique` WHERE IGA_forme_juridique_id=?", [IGA_forme_juridique_id]);
        if (result.length > 0) return result[0];                
        else return false;
    } catch (e) {
        console.log(e);
    }

}

