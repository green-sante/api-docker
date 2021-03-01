const { getCCN } = require ("../queries/tools.queries");
const Utils = require('../Utils.js');
const config = require('../config.js');
var siret = require('siret');
const superagent = require('superagent');
const Email = require('../Emails.js');

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
                    var categorieJuridiqueUniteLegale = parseInt(data.etablissement.uniteLegale.categorieJuridiqueUniteLegale)|| 1;
                    var activitePrincipaleUniteLegale = data.etablissement.uniteLegale.activitePrincipaleUniteLegale || "";
                    var denominationUsuelle1UniteLegale = data.etablissement.uniteLegale.denominationUsuelle1UniteLegale|| "";
                    var denominationUsuelle2UniteLegale = data.etablissement.uniteLegale.denominationUsuelle2UniteLegale|| "";
                    var denominationUsuelle3UniteLegale = data.etablissement.uniteLegale.denominationUsuelle3UniteLegale|| "";
                    
                    console.log(req.query.siret);

                    var alldata = { name: data.etablissement.uniteLegale.denominationUniteLegale,
                                    address: numeroVoieEtablissement+" "+indiceRepetitionEtablissement+" "+typeVoieEtablissement+" "+libelleVoieEtablissement+" "+complementAdresseEtablissement,
                                    postalcode: codePostalEtablissement,
                                    city: libelleCommuneEtablissement,
                                    effectif: trancheEffectifsEtablissement,
                                    siret: req.query.siret,
                                    forme_juridique: categorieJuridiqueUniteLegale,
                                    codenaf: activitePrincipaleUniteLegale,
                                    nomcommercial1: denominationUsuelle1UniteLegale,
                                    nomcommercial2: denominationUsuelle2UniteLegale,
                                    nomcommercial3: denominationUsuelle3UniteLegale
                    }

                    Email.send_template_email('email_tools_search_siret.dust', 
                                  { 'email':config.mail_to_send_notifications, 
                                    'subject': '[Green Santé][Tools] Notification de recherche siret pour: '+alldata.name, 
                                    ...alldata
                                    });

                    res.status(200).json({
                        action : req.url,
                        method : req.method,
                        data : alldata,
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
                //console.log(resarray);
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
}

