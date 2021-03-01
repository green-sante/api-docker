const Utils = require('../Utils.js');
const ControlData = require('../ControlData.js');
// const { insertAddress } = require ("../queries/tools.queries");
const { getCompanyInfoByCompanyId, getCompanyByCompanyId, updateCompanyByCompany_id2 } = require("../queries/company.queries");
const { getUserByUserId, getUserAddressById, getUserContactById } = require("../queries/user.queries");
const { getIGAFormeJuridique } = require("../queries/IGA.queries");
const { getCardDataByUserId, insertCardDataByGuaranteePackId, getAddressByAddressId, getContactByContactId } = require("../queries/tools.queries");
const { updateIGAEventFamily, updateIGAEventType, updateIGAEvent, updateCollegeData, updateRegimeData, updateFormeJuridique, updateModePaiement } = require("../queries/IGA.queries");
const Email = require('../Emails.js');
const config = require('../config.js');
const superagent = require('superagent');
var curl = require('curl')
var imaps = require('imap-simple')
const _ = require('lodash')


const {
  send,
  configImap,
  searchCriteria,
  fetchOptions,
  structurEmails,
  insertEmailsBD,
  fetchEmailsBD,
  filitreKeyEmails,
  updateEmailStatus,
} = require('../service/Email')

exports.updateActesByAssure = async (req, res, next) => {
  try {
    var url = config.IGAapi + '/api/Assure/GetListeActes'
    console.log('GET API: ', url)

    const result = await superagent.get(url).query({ idAssure: 337747 })
    //.send({ idAssure: '337747'}) // sends a JSON post body
    //console.log(result.body.items);

    var libelle = ''
    var resarray = []
    for (var k in result.body.items) {
      if (libelle !== result.body.items[k].libelle) {
        var actes = []
        for (var l in result.body.items) {
          if (result.body.items[k].libelle === result.body.items[l].libelle) {
            actes.push({
              acte_name: result.body.items[l].libelles,
              acte_tiers: result.body.items[l].tiers,
              acte_calc: result.body.items[l].codecalc,
              acte_limite: result.body.items[l].limite,
            })
          }
        }
        resarray.push({
          libelle: result.body.items[k].libelle,
          actes: actes,
        })
        libelle = result.body.items[k].libelle
      }
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      message: 'List of actes',
      data: { actes: resarray },
    })
  } catch (e) {
    console.log(e)
    next(e)
  }
}

exports.updateActesByFamilly = async (req, res, next) => {
  try {
    var url = config.IGAapi + '/api/actes/GetActeFamilly'
    console.log('GET API: ', url)

    // curl.get(url, {}, function(err, response, data){
    //     console.log("err", err);
    //     console.log("response", response);
    //     console.log("data", data);
    // });

    // try {
    //     const result = await superagent.get(url);
    //     console.log(result);
    //     res.status(200).json({
    //         action : req.url,
    //         method : req.method,
    //         data : result,
    //     });
    // } catch (err) {
    //     console.error(err);
    //     res.status(400).json({
    //         action : req.url,
    //         method : req.method,
    //     });
    // }

    superagent
      .get(url)
      //.send({ name: 'Manny', species: 'cat' }) // sends a JSON post body
      // .set('Authorization', config.token_api_SIREN)
      //.set('Agent', new https.Agent({ rejectUnauthorized: false }))
      //.set('Accept', 'application/json')
      .end((err, data) => {
        // Calling the end function will send the request
        data = JSON.parse(data)
        console.log(data)
        console.log(err)
        //data = JSON.parse(data.text);
        res.status(200).json({
          action: req.url,
          method: req.method,
          //data : data,
          //err: err,
        })
      })
  } catch (e) {
    console.log(e)
    next(e)
  }
}

exports.detectUpdates = async (source, dest, compare) => {
  try {
    var result = [];
    for (var k in compare) {
      console.log("COMPARE (" + compare[k].source + "): ", source[compare[k].source], " -- ", dest[compare[k].dest]);
      if (typeof source[compare[k].source] !== 'undefined' &&
        // typeof dest[compare[k].dest] !== 'undefined' && 
        (source[compare[k].source] != null ? source[compare[k].source].toLowerCase() : source[compare[k].source]) !== (dest[compare[k].dest] != null ? dest[compare[k].dest].toLowerCase() : dest[compare[k].dest]))
        result.push({
          variable_name: compare[k].dest,
          origin: dest[compare[k].dest],
          new: source[compare[k].source]
        });
    }
    return result;
  } catch (e) {
    console.log(e);
  }
}

exports.sendGestionnaireUpdates = async (data, info, send = true) => {
  try {
    var tochange = await this.detectUpdates(
      data.source,
      data.dest,
      data.compare,
    )
    //console.log(tochange);

    if (send) {
      Email.send_template_email('email_IGANotifyChanges.dust', {
        email: config.mail_to_send_gestionnaire,
        subject: '[Green Santé] Modification à effectuer',
        source_desc: info.desc,
        source_name: info.name,
        source_id: info.id,
        tochange: tochange,
      })
    } else {
    }
  } catch (e) {
    console.log(e)
  }
}

exports.updateCompanyInfos = async (req, res, next) => {
  try {
    var company_id = parseInt(req.query.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    var data = {}
    data.source = await getCompanyInfoByCompanyId(company_id)

    var url =
      config.IGAapi +
      '/api/Entreprise/getIdentityEntrepriseByID/' +
      data.source.IGA_company_id
    console.log('GET API: ', url)
    //const result = await superagent.get(url).query({idAssure: 337747});
    const result = await superagent.get(url).query()
    data.dest = result.body.item

    data.compare = [
      { source: 'name', dest: 'raisonSociale' },
      { source: 'siret', dest: 'siret' },
      { source: 'IGA_contact_email', dest: 'email' },
    ]

    this.sendGestionnaireUpdates(data, {
      desc: "les informations de l'entreprise",
      name: data.source.name,
      id: data.source.IGA_company_id,
    })

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: 'Data to modify sended',
    })
  } catch (e) {
    //console.log(e);
    next(e)
  }
}

exports.updateUserInfos = async (req, res, next) => {
  try {
    var user_id = parseInt(req.query.user_id) || null;
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, "user_id is required");

    var data = {};
    data.source = await getUserByUserId(user_id);
    let [address, contact] = await Promise.all([getUserAddressById(data.source.address_id), getUserContactById(data.source.contact_id)]);
    data.source = { ...data.source, ...address, ...contact };

    var url = config.IGAapi + "/api/Assure/GetIdentiteAssure/" + data.source.IGA_idassure;
    console.log("GET API: ", url);
    const result = await superagent.get(url).query();
    data.dest = result.body.item;
    data.dest = { ...data.dest, ...data.dest.address }

    // console.log(data.source);
    // console.log(data.dest);

    data.compare = [
      { source: "firstname", dest: "prenom" },
      { source: "lastname", dest: "nom" },
      { source: "ownersecunumber", dest: "noSS" },
      { source: "birthday", dest: "date_naissance" },
      { source: "civiliteIGA", dest: "civilite" },
      { source: "maritalstatusIGA", dest: "situation_familiale" },
      { source: "phone", dest: "tel1" },
      { source: "phone2", dest: "tel2" },
      { source: "country", dest: "pays" },
      { source: "postcode", dest: "cp" },
      { source: "city", dest: "ville" },
      { source: "road_1", dest: "adresse_1" },
    ];

    var tochange = await this.detectUpdates(data.source, data.dest, data.compare);
    //console.log(tochange);

    this.sendGestionnaireUpdates(data, {
      desc: "les informations de l'assurée",
      name: data.source.name,
      id: data.source.IGA_idassure
    });

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: "Data to modify sended"
    });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}

exports.userGetEvent = async (req, res, next) => {
  try {
    // var user_id = parseInt(req.query.user_id) || null;
    // if (!user_id || !Number.isInteger(user_id) || user_id == 0)
    //     return Utils.mwarn(res, req, "user_id is required");

    // var data = {};
    // data.source = await getUserByUserId(user_id);
    // let [address, contact] = await Promise.all([getUserAddressById(data.source.address_id), getUserContactById(data.source.contact_id)]);
    // data.source = {...data.source, ...address, ...contact};

    // var url = config.IGAapi+"/api/Assure/GetIdentiteAssure/"+data.source.IGA_idassure; 
    // console.log("GET API: ",url);
    // const result = await superagent.get(url).query();
    // data.dest = result.body.item;
    // data.dest = {...data.dest, ...data.dest.address}

    // // console.log(data.source);
    // // console.log(data.dest);

    // data.compare = [
    //     {source: "firstname",    dest: "prenom"},
    //     {source: "lastname",   dest: "nom"},
    //     {source: "ownersecunumber",   dest: "noSS"},
    //     {source: "birthday",   dest: "date_naissance"},
    //     {source: "civiliteIGA",   dest: "civilite"},
    //     {source: "maritalstatusIGA",   dest: "situation_familiale"},
    //     {source: "phone",   dest: "tel1"},
    //     {source: "phone2",   dest: "tel2"},
    //     {source: "country",   dest: "pays"},
    //     {source: "postcode",   dest: "cp"},
    //     {source: "city",   dest: "ville"},
    //     {source: "road_1",   dest: "adresse_1"},
    // ];

    // var tochange = await this.detectUpdates(data.source, data.dest, data.compare);
    // //console.log(tochange);

    // this.sendGestionnaireUpdates(data, {
    //     desc : "les informations de l'assurée",
    //     name : data.source.name,
    //     id : data.source.IGA_idassure
    // });

    // res.status(200).json({
    //     action : req.url,
    //     method : req.method,
    //     message : "Data to modify sended"
    // });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}

exports.updateCarteTP = async (req, res, next) => {
  try {
    var user_id = parseInt(req.query.user_id) || null;
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, "user_id is required");

    var data = {};
    data.userinfo = await getUserByUserId(user_id);
    data.carddata = await getCardDataByUserId(user_id);

    (gl_debug ? data.userinfo.IGA_idassure = 331257 : null); // DEBUG
    var url = config.IGAapi + "/api/Assure/GetCartesTP?idassure=" + data.userinfo.IGA_idassure;
    console.log("GET API: ", url);
    const result = await superagent.get(url).query();
    data.source = result.body.items;

    var resGS = [];
    if (data.carddata) {
      for (var k in data.source) {
        //console.log("COMPARE: ", data.source[k].lib_famille,"=>", data.carddata.find(e => e.name === data.source[k].lib_famille))
        if (data.carddata.find(e => e.name === data.source[k].lib_famille) === undefined)
          resGS.push(data.source[k]);
      }
    } else
      resGS = data.source;

    // CHANGEMENT
    //console.log(data.source);

    resGS.forEach(e => insertCardDataByGuaranteePackId(data.userinfo.guarantee_pack_id, e.lib_codefamille, e.lib_famille, e.organismeTp, e.periode, e.dateDemande, e.lib_ccalc));

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: "Data to modify sended"
    });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}

exports.updateEventFamily = async (req, res, next) => {
  try {
    var url = config.IGAapi + "/api/references/GetFamilleEvents";
    console.log("GET API: ", url);
    const result = await superagent.get(url).query();
    var data = result.body.items;

    //console.log(data);

    data.forEach(e => updateIGAEventFamily(e.value, e.text));
    //resGS.forEach(e => insertCardDataByGuaranteePackId(data.userinfo.guarantee_pack_id, e.lib_codefamille, e.lib_famille, e.organismeTp, e.periode, e.dateDemande,  e.lib_ccalc));

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: "Data to modify sended"
    });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}

exports.updateEventType = async (req, res, next) => {
  try {
    var url = config.IGAapi + "/api/references/GetTypeEvents";
    console.log("GET API: ", url);
    const result = await superagent.get(url).query();
    var data = result.body.items;

    //console.log(data);

    data.forEach(e => updateIGAEventType(e.value, e.text, e.tag));
    //resGS.forEach(e => insertCardDataByGuaranteePackId(data.userinfo.guarantee_pack_id, e.lib_codefamille, e.lib_famille, e.organismeTp, e.periode, e.dateDemande,  e.lib_ccalc));

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: "Data to modify sended"
    });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}


exports.updateCollege = async (req, res, next) => {
  try {
    var url = config.IGAapi + "/api/references/GetTypeColleges";
    console.log("GET API: ", url);
    const result = await superagent.get(url).query();
    var data = result.body.items;

    //console.log(data);

    data.forEach(e => updateCollegeData(e.value, e.text));
    //resGS.forEach(e => insertCardDataByGuaranteePackId(data.userinfo.guarantee_pack_id, e.lib_codefamille, e.lib_famille, e.organismeTp, e.periode, e.dateDemande,  e.lib_ccalc));

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: "Data to modify sended"
    });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}

exports.updateRegime = async (req, res, next) => {
  try {
    var url = config.IGAapi + "/api/references/GetRegimes";
    console.log("GET API: ", url);
    const result = await superagent.get(url).query();
    var data = result.body.items;

    //console.log(data);

    data.forEach(e => updateRegimeData(e.valueStr, e.text));

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: "Data to modify sended"
    });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}

exports.updateFormeJuridique = async (req, res, next) => {
  try {
    var url = config.IGAapi + "/api/references/GetFormeJuridique";
    console.log("GET API: ", url);
    const result = await superagent.get(url).query();
    var data = result.body.items;

    //console.log(data);

    data.forEach(e => updateFormeJuridique(e.value, e.text, e.tag));

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: "Data to modify sended"
    });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}

exports.updateModePaiement = async (req, res, next) => {
  try {
    var url = config.IGAapi + "/api/references/GetModePaiements";
    console.log("GET API: ", url);
    const result = await superagent.get(url).query();
    var data = result.body.items;

    console.log(data);

    data.forEach(e => updateModePaiement(e.value, e.text));

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: "Data to modify sended"
    });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}

exports.updateFraisByAssure = async (req, res, next) => {
  try {
    var user_id = parseInt(req.query.user_id) || null;
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, "user_id is required");

    var userinfo = await getUserByUserId(user_id);

    var url = config.IGAapi + "/api/Decompte/GetFraisMedicauxBySearchCriteria";
    console.log("POST API: ", url);
    const result = await superagent.post(url).send(
      {
        "Filters": [
          {
            "PropertyName": "idAssure",
            "Value": userinfo.IGA_idassure
          },
          {
            "PropertyName": "listeDecomptes",
            "Value": "true"
          },
          {
            "PropertyName": "idPS",
            "Value": "0"
          },
          {
            "PropertyName": "isHisto",
            "Value": "true"
          }
        ],
        "Skip": 0,
        "Take": config.IGA_post_GetFraisMedicauxBySearchCriteria_Take
      }
    ).query();
    var data = result.body.items;

    data.forEach(e => {
      updateIGAEvent(user_id, e);
    });

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: "Data to modify sended"
    });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}

exports.createCompany = async (req, res, next) => {
  try {
    var company_id = parseInt(req.query.company_id) || null;
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, "company_id is required");

    var company = await getCompanyByCompanyId(company_id);
    var address = await getAddressByAddressId(company.address_id);
    var contact = await getContactByContactId(company.contact_id);
    var formejuridique = await getIGAFormeJuridique(company.IGA_forme_juridique_id);

    console.log(company);

    var url = config.IGAapi + "/api/SouscriptionFormViewModel/MakeTiers";
    console.log("POST API: ", url);
    var input =
    {
      "From": 3, // Mode 3 pour souscription collective , Mode 1 Souscription Individuelle, Mode2 Souscription TNS
      "IsEditSouscripteur": false,
      "TypeSaisie": config.IGA_typeSaisie,
      "ErrorMsgs": [],
      "IdCourtier": config.IGA_idCourtier, // (liste des courtiers fournie à partir de web service api/production/GetCourtier/ dont les paramètres : parameters= From (3,1,2))
      "DateEffet": "2020-01-01T00:00:00", // TODO
      "IdProduit": 1147, // TODO
      "IdGamme": 1147, // TODO
      "IdCollege": 92, // TODO
      "CollegeSpecifique": "EXPATRIES", // TODO
      "JustifTierVM": [],
      "Garanties": config.IGA_company_create_default_garantie_added,
      "MotifFin": null,
      "EstForcer": false,
      "NomUser": null,
      "MotifForcage": null,
      "Salaire": 0,
      "Idref_combinaison": null,
      "tierEntreprise": null,
      "idtierEntreprise": null,
      "idEntrepriseSouscritpeur": null,
      "CodeReprise": null,
      "IdFormeJuridique": formejuridique.IdFormeJuridique, // TODO
      "RaisonSociale": company.name, // TODO
      "Fax": null,
      "Siret": company.siret, // TODO
      "CodeNaf": company.codenaf, // TODO
      "IdHolding": null,
      "IdPaysEntreprise": config.IGA_DefaultCountry,
      "PaysEntreprise": null,
      "IdVilleEntreprise": null,
      "VilleEntreprise": address.city, // TODO
      "IdDepartementEntreprise": null,
      "DepartementEntreprise": parseInt(parseInt(address.postcode) / 1000), // TODO
      "IdCpEntreprise": null,
      "CpEntreprise": parseInt(address.postcode), // TODO
      "adresse_1Entreprise": address.road_1, // TODO
      "adresse_2Entreprise": address.road_2,
      "adresse_3Entreprise": null,
      "AdrDateEffetEntreprise": "2020-01-01T00:00:00", // ??
      "AdrDateEndEntreprise": null, // ??
      "IndicatifTel_persoEntreprise": "(+33)",
      "Tel_persoEntreprise": contact.phone, // TODO
      "IndicatifTel_proEntreprise": "(+33)",
      "Tel_proEntreprise": contact.phone2,
      "IndicatifMobileEntreprise": "(+33)",
      "MobileEntreprise": null,
      "IndicatifFaxEntreprise": "(+33)",
      "FaxEntreprise": null,
      "EmailEntreprise": contact.email,
      "language": config.IGA_default_language, // TODO
      "IdLangueCommunicationEntreprise": config.IGA_default_language, // TODO
      "TnsNomPropre": false,
      "IdCivilite": 1, // DE QUI ?
      "ToGenerNumC": false,
      "IdDevise": config.IGA_defaultDevise,
      "IdZone": config.IGA_defaultZone,
      "IdRegime": config.IGA_company_create_default_IdRegime,  // (valeur par défaut pour les régimes domestiques)
      "IdTypeRegime": config.IGA_company_create_default_IdTypeRegime, // ( valeur par défaut régime non unique puisque le type de marché est domestique)
      "IdUser": config.IGA_company_create_default_IdUser, // valeur par défaut pour identifier les souscriptions souscrites à partir de green santé (elle peut être modifiée lors de mise en place en prod)
    }
    console.log(input)

    var result = await superagent.post(url).send(input).query();
    result = result.body.item;

    console.log(result);
    updateCompanyByCompany_id2(company_id, { IGA_company_id: result.idEntrepriseSouscritpeur });

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: "Data to modify sended"
    });
  } catch (e) {
    //console.log(e);
    next(e);
  }
}

exports.createCompanyContract = async (req, res, next) => {
  try {
    var company_id = parseInt(req.query.company_id) || null;
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, "company_id is required");

    var company = await getCompanyByCompanyId(company_id);
    var address = await getAddressByAddressId(company.address_id);
    var contact = await getContactByContactId(company.contact_id);
    var formejuridique = await getIGAFormeJuridique(company.IGA_forme_juridique_id);

    console.log(company);

    var url = config.IGAapi + "/api/SouscriptionFormViewModel/MakeSouscription";
    console.log("POST API: ", url);
    var input =
    {
      "From": 3,
      "IsEditSouscripteur": true,
      "TypeSaisie": config.IGA_typeSaisie,
      "ErrorMsgs": [],
      "IdCourtier": config.IGA_idCourtier,
      "DateEffet": "2020-01-01T00:00:00", // TODO
      // INFO CONTRAT
      "IdProduit": 1147, // TODO
      "IdGamme": 1147, // TODO
      "IdCollege": 92, // TODO
      "IdPorteurRisque": 2107,
      /////////////////////////////
      "CollegeSpecifique": "EXPATRIES", // TODO
      "JustifTierVM": [],
      "Garanties": config.IGA_company_create_default_garantie_added,

      "NumContrat": "test2", // c’est un numéro saisi par l’écran si le paramétrage de produit est à forcer (détection si le paramétrage est à forcer ou non via le web service api/Assure/getCombinaisonByGamme)
      "Risque": null,
      "MotifFin": null,
      "StatutSouscription": null,
      "CollegeSouscription": null,
      "GammeProduitStr": null,
      "souscription": null,
      "SouscriptionsPending": [],
      "EstForcer": false,
      "NomUser": null,
      "MotifForcage": null,
      "Salaire": 0,
      "Idref_combinaison": 1041, // identifié à partir de web service api/Assure/GetNumeroContrat (il retourne aussi numcontrat ou le paramétrage n’est pas à forcer)
      "tierEntreprise": null,
      "idtierEntreprise": null,
      "idEntrepriseSouscritpeur": company.IGA_company_id,
      "IdFormeJuridique": formejuridique.IdFormeJuridique, // TODO
      "RaisonSociale": company.name, // c’est le même view model que la méthode Make Tiers donc il combine les paramètres des deux méthodes. NB : make souscription idEntrepriseSouscritpeur est obligatoire.
      "Fax": null,
      "Siret": company.siret, // TODO
      "CodeNaf": company.codenaf, // TODO
      "IdHolding": null,
      "IdPaysEntreprise": config.IGA_DefaultCountry,
      "PaysEntreprise": null,
      "IdVilleEntreprise": null,
      "VilleEntreprise": address.city, // TODO
      "IdDepartementEntreprise": null,
      "DepartementEntreprise": parseInt(parseInt(address.postcode) / 1000), // TODO
      "IdCpEntreprise": null,
      "CpEntreprise": parseInt(address.postcode), // TODO
      "adresse_1Entreprise": address.road_1, // TODO
      "adresse_2Entreprise": address.road_2,
      "adresse_3Entreprise": null,
      "AdrDateEffetEntreprise": "2020-01-01T00:00:00", // ??
      "AdrDateEndEntreprise": null, // ??
      "IndicatifTel_persoEntreprise": "(+33)",
      "Tel_persoEntreprise": contact.phone, // TODO
      "IndicatifTel_proEntreprise": "(+33)",
      "Tel_proEntreprise": contact.phone2,
      "IndicatifMobileEntreprise": "(+33)",
      "MobileEntreprise": null,
      "IndicatifFaxEntreprise": "(+33)",
      "FaxEntreprise": null,
      "EmailEntreprise": contact.email,

      "IdCivilite": 1, // DE QUI ?
      "ToGenerNumC": false,
      "IdDevise": config.IGA_defaultDevise,
      "IdZone": config.IGA_defaultZone,
      "IdRegime": config.IGA_company_create_default_IdRegime,
      "IdTypeRegime": config.IGA_company_create_default_IdTypeRegime,

      "IdPaysNationalite": null,
      "IdPaysExpatriation": null,
      "IdLangueCommunication": null,

      "WizardChamps": [],
      "ValuesDataComp": [ // ce sont des informations complémentaires api/production/GetinfosComplementairesByProduit
        {
          "First": 90337,
          "Second": null
        }

      ],
      "IdTypeExercice": 2, // api/Production/GetTypeExcerciceByProduit
      "IdJourAppel": 126, // jour d’appel fournie via le web service api/production/GetJourAppelByProduit/
      "IdModeCalcul": 1, // api/tiers/GetModeCalcByProduit
      "Payeurs": [
        {
          "IdGarantie": 1149,
          "IdPayer": 0, // 0 si le payeur est souscripteur, liste de choix des payeurs fournis par le web service api/production/GetPayeurByProduit
          "IdFrequence": [
            1 // api/production/GetFrequenceByProduit
          ],
          "IdType": 1, // api/production/GetTypeEcheanceByproduit
          "IdModePaiement": [
            1 // oui il correspond au mode paiement chèque :api/tiers/GetModePaiement
          ],
          "Rib": { // si le mode de paiement choisi est chèque (idModePaiement =1) donc pas d’envoi de l’iban et bic si le mode de paiement est prélèvement ou virement (idModePaiement  =2 ou 3) on alimente les champs Iban , bic et même les champs RUM , IdRefTypeRUM, IdRefStatutRUM, DateSignature
            "Id": null,
            "IdModePaiement": 1,
            "Titulaire": "100", // c'est le nom de la personne
            "Domiciliation": null,
            "IBAN": null,
            "BIC": null,
            "DateSignature": null,
            "RUM": null,
            "IdRefTypeRUM": null,
            "IdRefStatutRUM": null,
            "EstSepa": false, // en cas domestique il doit être true
            "DateEffet": "2020-12-11T00:00:00",
            "DateFin": null,
            "MotifResil": null,
            "IdPays": 1,

            "ARecuMandatSepa": false,

            "IdDevise": 1,

            "SoinExterne": false,
            "Honoraire": false,
            "FraisSejour": false,

          }
        },
        {
          "IdGarantie": 1150,
          "IdPayer": 0,
          "IdFrequence": [
            1
          ],
          "IdType": 1,
          "IdModePaiement": [
            1
          ],
          "Rib": {
            "Id": null,
            "IdModePaiement": 1,
            "Titulaire": "100",

            "EstSepa": false,
            "DateEffet": "2020-12-11T00:00:00",
            "DateFin": null,
            "MotifResil": null,
            "IdPays": 1,

            "ARecuMandatSepa": false,

            "IdDevise": 1,

            "SoinExterne": false,
            "Honoraire": false,
            "FraisSejour": false,

          }
        }
      ],
      "IdTierPayant": 1253, // il est récupéré via le web service api/tiers/GetTiersPayant
      "IdUser": config.IGA_company_create_default_IdUser,
    }

    console.log(input)

    var result = await superagent.post(url).send(input).query();
    result = result.body.item;

    console.log(result);
    updateCompanyByCompany_id2(company_id, { IGA_company_id: result.idEntrepriseSouscritpeur });


    // try {
    //   var user_id = parseInt(req.query.user_id) || null
    //   if (!user_id || !Number.isInteger(user_id) || user_id == 0)
    //     return Utils.mwarn(res, req, 'user_id is required')
    //   var data = {}
    //   data.source = await getUserByUserId(user_id)

    //   var url =
    //     config.IGAapi +
    //     '/api/Assure/GetIdentiteAssure/' +
    //     data.source.IGA_idassure
    //   console.log('GET API: ', url)
    //   //const result = await superagent.get(url).query({idAssure: 337747});
    //   const result = await superagent.get(url).query()
    //   data.dest = result.body.item

    //   console.log(data.source)
    //   console.log(data.dest)

    //   data.compare = [
    //     { source: 'firstname', dest: 'prenom' },
    //     { source: 'lastname', dest: 'nom' },
    //     { source: 'ownersecunumber', dest: 'noSS' },
    //   ]

    // this.sendGestionnaireUpdates(data, {
    //     desc : "les informations de l'entreprise",
    //     name : data.source.name,
    //     id : data.source.IGA_company_id
    // });

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: 'Data to modify sended',
    })
  } catch (e) {
    //console.log(e);
    next(e)
  }
}

exports.fetchEmailsImap = async (req, res, next) => {
  const status = req.query.status
  try {
    const connection = await imaps.connect(configImap)
    await connection.openBox('INBOX')
    const emailsData = await connection.search(searchCriteria, fetchOptions)
    const emails = await structurEmails(emailsData)
    await insertEmailsBD(emails)
    const results = await fetchEmailsBD(status)
    const dataFinal = await filitreKeyEmails(results)

    res.status(200).json({
      action: req.url,
      method: req.method,
      emails: dataFinal,
    })
  } catch (error) {
    console.log(error)
  }
}

exports.sendEmailsImap = async (req, res, next) => {
  try {
    const email = req.body
    if (email) {
      await send(email)
      const emailUpdate = await updateEmailStatus(email.emaile_id)
      const emailFinal = await filitreKeyEmails(emailUpdate)

      res.status(200).json({
        action: req.url,
        method: req.method,
        emaile: emailFinal,
      })
    }
  } catch (error) {
    console.log(error)
  }
}
