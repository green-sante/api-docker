const { getPriceWithArgs, getAgeRange, getStructTarif, getTypesByStructTarif, getAllPrices, savePrice, getPriceLocationsByGPid, getAllPricesByGpIdLocId ,getPriceByGpId } = require ("../queries/price.queries");
const Utils = require('../Utils.js');
const config = require('../config.js');
// var siret = require('siret');
// const superagent = require('superagent');

//getPrice, getPriceAgeRange, getPriceStructTarif

exports.savePriceByGuaranteePackId = async (req, res, next) => {
    try {
        const price = {};

        price.guarantee_pack_id = parseInt(req.body.guarantee_pack_id) || "";
        if (!price.guarantee_pack_id || !Number.isInteger(price.guarantee_pack_id) || price.guarantee_pack_id == 0) return Utils.mwarn(res, req, "guarantee_pack_id is required");
        
        price.pricing_location_id = parseInt(req.body.pricing_location_id) || null;
        if (!price.pricing_location_id || !Number.isInteger(price.pricing_location_id) || price.pricing_location_id == 0) return Utils.mwarn(res, req, "pricing_location_id is required");

        price.pricing_type_id = parseInt(req.body.pricing_type_id) || null;
        if (!price.pricing_type_id || !Number.isInteger(price.pricing_type_id) || price.pricing_type_id == 0) return Utils.mwarn(res, req, "pricing_type_id is required");        
        
        price.pricing_age_id = parseInt(req.body.pricing_age_id) || null;
        if (!price.pricing_age_id || !Number.isInteger(price.pricing_age_id) || price.pricing_age_id == 0) return Utils.mwarn(res, req, "pricing_age_id is required");              
        
        price.date = parseInt(req.body.date_year) || null;
        if (!price.date || !Number.isInteger(price.date) || price.date == 0) return Utils.mwarn(res, req, "year is required");     
        
        price.pricerate = parseFloat(req.body.pricerate) || null;   
        
        const rows = await savePrice(price);
        res.status(200).json({
            action : req.url,
            method : req.method,
            message : "Price Saved",
        });
    } catch (e) {
        next(e);
    }
}

exports.getPriceByGuaranteePackId = async (req, res, next) => {
    try {
        var department = parseInt(req.query.department) || null;
        if (!department || !Number.isInteger(department) || department == 0) return Utils.mwarn(res, req, "department is required");        
        
        var guarantee_pack_id = parseInt(req.query.guarantee_pack_id) || "";
        if (!guarantee_pack_id || !Number.isInteger(guarantee_pack_id) || guarantee_pack_id == 0) return Utils.mwarn(res, req, "guarantee_pack_id is required");
        
        const rows = await getAllPrices(department,guarantee_pack_id);
        res.status(200).json({
            action : req.url,
            method : req.method,
            message : "List of prices",
            data: { prices: rows,
            }
        });

    } catch (e) {
        next(e);
    }
}

exports.getPriceByGuaranteePackIdLocationId = async (req, res, next) => {
    try {
        var pricing_location_id = parseInt(req.query.pricing_location_id) || null;
        if (!pricing_location_id || !Number.isInteger(pricing_location_id) || pricing_location_id == 0) return Utils.mwarn(res, req, "pricing_location_id is required");        
        
        var guarantee_pack_id = parseInt(req.query.guarantee_pack_id) || "";
        if (!guarantee_pack_id || !Number.isInteger(guarantee_pack_id) || guarantee_pack_id == 0) return Utils.mwarn(res, req, "guarantee_pack_id is required");
        
        const rows = await getAllPricesByGpIdLocId(pricing_location_id,guarantee_pack_id);
        res.status(200).json({
            action : req.url,
            method : req.method,
            message : "List of prices",
            data: { prices: rows,
            }
        });

    } catch (e) {
        next(e);
    }
}



exports.getPrice = async (req, res, next) => {
    try {
        var department = parseInt(req.query.department) || null;
        if (!department || !Number.isInteger(department) || department == 0) return Utils.mwarn(res, req, "department is required");
        var pricing_struct_tarif_id = parseInt(req.query.pricing_struct_tarif_id) || null;
        if (!pricing_struct_tarif_id || !Number.isInteger(pricing_struct_tarif_id) || pricing_struct_tarif_id == 0) return Utils.mwarn(res, req, "pricing_struct_tarif_id is required");
        var pricing_age_id = parseInt(req.query.pricing_age_id) || null;
        if (!pricing_age_id || !Number.isInteger(pricing_age_id) || pricing_age_id == 0) return Utils.mwarn(res, req, "pricing_age_id is required");
        
        var pricing_type_id = parseInt(req.query.pricing_type_id) || "";
        var guarantee_pack_id = parseInt(req.query.guarantee_pack_id) || "";
        
        const rows = await getPriceWithArgs(department, pricing_struct_tarif_id, pricing_age_id, pricing_type_id, guarantee_pack_id);
        var resarray = [];
        if (rows.length > 0) {
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
                    "guarantee_pack_img" : rows[k].guarantee_pack_img, 
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

    } catch (e) {
        next(e);
    }
}


exports.getPriceByGuaranteePack = async (req, res, next) => {
    try {
        var department = parseInt(req.query.department) || null;
        if (!department || !Number.isInteger(department) || department == 0) return Utils.mwarn(res, req, "department is required");
        var pricing_struct_tarif_id = parseInt(req.query.pricing_struct_tarif_id) || null;
        if (!pricing_struct_tarif_id || !Number.isInteger(pricing_struct_tarif_id) || pricing_struct_tarif_id == 0) return Utils.mwarn(res, req, "pricing_struct_tarif_id is required");
        var pricing_age_id = parseInt(req.query.pricing_age_id) || null;
        if (!pricing_age_id || !Number.isInteger(pricing_age_id) || pricing_age_id == 0) return Utils.mwarn(res, req, "pricing_age_id is required");
        
        var pricing_type_id = parseInt(req.query.pricing_type_id) || "";
        var guarantee_pack_id = parseInt(req.query.guarantee_pack_id) || "";

        const rows = await getPriceByGpId(department, pricing_struct_tarif_id, pricing_age_id, pricing_type_id, guarantee_pack_id);
        
        var resarray = [];
        if (rows.length > 0) {
            var gpid = null;
            for(var k in rows){
                if (gpid != rows[k].guarantee_pack_id) {
                    var pricing_array = [];
                    for(var l in rows){
                        if (rows[l].guarantee_pack_id == rows[k].guarantee_pack_id)
                            pricing_array.push({
                                type_name: rows[l].type_name,
                                price_rate: rows[l].price_rate,
                                price : Number(rows[l].pmss*rows[l].price_rate/100).toFixed(2),
                                pmss: rows[l].pmss,
                            });
                    }
                    resarray.push({
                        guarantee_pack_id: rows[k].guarantee_pack_id,
                        guarantee_pack_name: rows[k].guarantee_pack_name,
                        guarantee_pack_img: rows[k].guarantee_pack_img, 
                        guarantee_pack_file: rows[k].guarantee_pack_file, 
                        pricing_age_id: rows[k].pricing_age_id, 
                        pricing_age_name: rows[k].pricing_age_name, 
                        struct_tarif_id: rows[k].struct_tarif_id, 
                        struct_tarif_name: rows[k].struct_tarif_name, 
                        pricing_array: pricing_array
                    });
                    gpid = rows[k].guarantee_pack_id;
                }
            }
        }
            

        // if (rows.length > 0) {
        //     for(var k in rows){
        //         resarray.push({
        //             "price" : Number(rows[k].pmss*rows[k].price_rate/100).toFixed(2), 
        //             "price_rate" : rows[k].price_rate, 
        //             "type_name" : rows[k].type_name, 
        //             "struct_tarif_name" : rows[k].struct_tarif_name, 
        //             "struct_tarif_id" : rows[k].struct_tarif_id, 
        //             "pricing_age_name" : rows[k].pricing_age_name, 
        //             "pricing_age_id" : rows[k].pricing_age_id, 
        //             "guarantee_pack_name" : rows[k].guarantee_pack_name, 
        //             "guarantee_pack_img" : rows[k].guarantee_pack_img, 
        //             "guarantee_pack_id" : rows[k].guarantee_pack_id, 
        //         });
        //     }
        // }
        res.status(200).json({
            action : req.url,
            method : req.method,
            message : "List of prices",
            data: { prices: resarray,
            }
        });

    } catch (e) {
        next(e);
    }
}

exports.getPriceAgeRange = async (req, res, next) => {
    try {
        var guarantee_pack_id = parseInt(req.query.guarantee_pack_id) || config.guarantee_pack_id_default;
	           
        const rows = await getAgeRange(guarantee_pack_id);
        var resarray = [];
        if (rows.length > 0) {
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
            data: { agerange: resarray,
            }
        });

    } catch (e) {
        next(e);
    }
}


exports.getPriceStructTarif = async (req, res, next) => {
    try {
        var guarantee_pack_id = parseInt(req.query.guarantee_pack_id) || config.guarantee_pack_id_default;
	           
        const rows = await getStructTarif(guarantee_pack_id);
        var resarray = [];
        if (rows[0]) {
            for(var k in rows){
                var tarifstypes = await getTypesByStructTarif(rows[k].pricing_struct_tarif_id);
                resarray.push({
                    "struct_tarif_id" : rows[k].pricing_struct_tarif_id, 
                    "name" : rows[k].name, 
                    "guarantee_pack_name": rows[k].guarantee_pack_name,
                    "types" : tarifstypes
                });
            }
        }
        res.status(200).json({
            action : req.url,
            method : req.method,
            message : "List of struct tarif",
            data: { struct_tarif: resarray,
            }
        });
    } catch (e) {
        next(e);
    }
}

exports.getPriceLocations = async (req, res, next) => {
    try {
        var guarantee_pack_id = parseInt(req.query.guarantee_pack_id) || "";
	           
        const rows = await getPriceLocationsByGPid(guarantee_pack_id);
        res.status(200).json({
            action : req.url,
            method : req.method,
            message : "List of pricing locations",
            data: { pricing_locations: rows,
            }
        });
    } catch (e) {
        next(e);
    }
}
/*
exports.getApiSiren = async (req, res, next) => {
    try {
        if (siret.isSIREN(req.query.siren)) {
            var url = config.url_api_SIREN+req.query.siren+"?champs=denominationUniteLegale%2CactivitePrincipaleUniteLegale%2CdenominationUsuelle1UniteLegale"; 
            console.log("GET API: ",url);
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
                    data : {name: data.uniteLegale.periodesUniteLegale[0].denominationUniteLegale},
                });
            });
        } else {
            res.status(400).json({
                action : req.url,
                method : req.method,

            });
        }
    } catch (e) {
        next(e);
    }
}

exports.getApiSiret = async (req, res, next) => {
    try {
        if (siret.isSIRET(req.query.siret)) {
            var url = config.url_api_SIRET+req.query.siret; 
            console.log("GET API: "+url);
            superagent
                .get(url)
                //.send({ name: 'Manny', species: 'cat' }) // sends a JSON post body
                .set('Authorization', config.token_api_SIREN)
                .set('Accept', 'application/json')
                .end((err, data) => {
                // Calling the end function will send the request
                    data = JSON.parse(data.text);
                    
                    //console.log(data);
                    
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
                        data : {name: data.etablissement.uniteLegale.denominationUniteLegale,
                                address: numeroVoieEtablissement+" "+indiceRepetitionEtablissement+" "+typeVoieEtablissement+" "+libelleVoieEtablissement+" "+complementAdresseEtablissement,
                                postalcode: codePostalEtablissement,
                                city: libelleCommuneEtablissement,
                                effectif: trancheEffectifsEtablissement,
                        },
                    });
                });
            
        }
    } catch (e) {
        next(e);
    }
}

exports.getApiCCN = async (req, res, next) => {
    try {
        if (siret.isSIRET(req.query.siret)) {
            var url = config.url_api_CCN+req.query.siret; 
            console.log("GET API: "+url);
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
                    data : {siret: data[0].siret, 
                            conventions: resarray
                    },
                });
            });
        } else {
            const rows = await getCCN();
            res.status(200).json({
                action : req.url,
                method : req.method,
                message : "List of all ccn",
                data: { allconventions: rows,
                }
            });
        }
    } catch (e) {
        next(e);
    }
}*/