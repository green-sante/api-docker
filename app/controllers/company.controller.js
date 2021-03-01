const Utils = require('../Utils.js')
const ControlData = require('../ControlData.js')
const {
  saveCompany,
  getCompaniesList,
  updateCompanyByCompany_id,
  getCompanyLiveByCompanyId,
  getCompanyBarometer,
  getContratTypeByCompanyId,
  getCompanyDocsByCompanyId,
  getCompanyAccessByCompanyId,
  getCompanyInfoByCompanyId,
  companyUpdateByCompanyId,
  getMessageByCompanyId,
  getCompanyStatusByCompanyId,
  findMessageById,
  fetchCompanyStatus,
  updateStatusCopmnay,
  findCompanyById,
  getCompaniesListByUserId,
} = require('../queries/company.queries')
const {
  getNewRegistrationKey,
  sendRegistrationKey,
} = require('./tools.controller')
const {
  insertAddress,
  getCCN,
  getTopQuestion,
  getNewsByCompanyId,
  saveNewsReaded,
  updateAddressByCompanyId,
  insertMessage,
  getFileByCompanyId,
  insertCompanyFile,
} = require('../queries/tools.queries')
const {
  userUpdateAccessByValue,
  getUserByEmail,
  userCreate,
} = require('../queries/user.queries')
const Email = require('../Emails.js');
const config = require('../config.js')
const { updateStatus } = require('../queries/email.queries.js')



exports.saveUserCompanyNewsRead = async (req, res, next) => {
  try {
    var news_id = parseInt(req.body.newsid) || null
    if (!news_id || !Number.isInteger(news_id) || news_id == 0)
      return Utils.mwarn(res, req, 'news_id is required')

    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    saveNewsReaded(user_id, news_id)

    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
    })
  } catch (e) {
    next(e)
  }
}

exports.postCompanyAccess = async (req, res, next) => {
  try {
    var company_id = parseInt(req.params.company_id) || null;
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, "company_id is required");

    var accesstype_id = parseInt(req.body.accesstype_id) || null;
    if (!accesstype_id || !Number.isInteger(accesstype_id) || accesstype_id == 0)
      return Utils.mwarn(res, req, "accesstype_id is required");


    // TESTER SI IL Y A UN EMAIL
    // SI NON =>
    if (!ControlData.validateEmail(req.body.email)) {
      console.log(req.body);
      var user_id = parseInt(req.body.user_id) || null;
      if (!user_id || !Number.isInteger(user_id) || user_id == 0)
        return Utils.mwarn(res, req, "user_id is required");
      userUpdateAccessByValue(user_id, company_id, accesstype_id, req.body.value);
      res.status(200).json({
        action: req.url,
        method: req.method,
        token: newtoken,
        message: "User exist, updated access done"
      });
    } else {
      // SI OUI =>
      // TESTER SI LE USER EXISTE
      const rows = await getUserByEmail(req.body.email)
      if (rows && rows.email === req.body.email) {
        userUpdateAccessByValue(
          rows.user_id,
          company_id,
          accesstype_id,
          req.body.value,
        )
        res.status(200).json({
          action: req.url,
          method: req.method,
          token: newtoken,
          message: 'User exist, updated access done',
        })
      } else {
        // SI NON =>
        // CREER LE USER
        var new_user_id = await userCreate(
          req.body.email,
          '',
          req.body.firstname,
          req.body.lastname,
          '',
        )
        // LUI ENVOYER UNE REGISTRATION KEY POUR QU IL CREE SON MOT DE PASSE
        sendRegistrationKey(
          req.body.email,
          req.body.firstname,
          new_user_id,
          company_id,
          accesstype_id,
        )
        userUpdateAccessByValue(
          new_user_id,
          company_id,
          accesstype_id,
          req.body.value,
        )
        res.status(200).json({
          action: req.url,
          method: req.method,
          token: newtoken,
          message: 'Registration send and access done',
        })
      }
    }
  } catch (e) {
    next(e)
  }
}

exports.postCompanyMessage = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    var response_message_id = parseInt(req.body.response_message_id) || null

    const newMessage = await insertMessage(
      user_id,
      company_id,
      response_message_id,
      req.body.message,
    )
    const message = await findMessageById(newMessage)
    console.log(newMessage)

    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      message: message,
    })
  } catch (e) {
    next(e)
  }
}

exports.getCompanyMessage = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    var start = 0
    var nbresults = config.nb_results_by_page
    if (req.body.start) start = req.body.start
    if (req.body.nbresults) nbresults = req.body.nbresults

    var rows = await getMessageByCompanyId(company_id, start, nbresults)

    var resarray = []
    var responses = []
    var prev_message_id = 0
    for (var k in rows) {
      //mlog(rows);
      if (rows[k].response_message_id != null) {
        if (!Array.isArray(responses[rows[k].response_message_id]))
          responses[rows[k].response_message_id] = []
        responses[rows[k].response_message_id].push({
          message_id: rows[k].message,
          sender: rows[k].sender,
          text: rows[k].text,
          datecreate: rows[k].datecreate,
        })
      } else {
        resarray.push({
          message_id: rows[k].message_id,
          sender: rows[k].sender,
          text: rows[k].text,
          datecreate: rows[k].datecreate,
          responses: responses,
        })
      }
    }
    for (var k in resarray) {
      if (
        resarray[k].message_id &&
        Array.isArray(responses[resarray[k].message_id])
      )
        resarray[k].responses = responses[resarray[k].message_id]
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        messages: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.postCompanyInfo = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    if (req.body.iban) {
      var company = {
        iban: req.body.iban || '',
      }
      companyUpdateByCompanyId(company_id, company)
    } else {
      var address = {
        road_1: req.body.address1 || '',
        road_2: req.body.address2 || '',
        postcode: req.body.postcode || '',
        city: req.body.city || '',
      }
      updateAddressByCompanyId(company_id, address)
    }

    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
    })
  } catch (e) {
    next(e)
  }
}

exports.getCompanyInfo = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    var rows = await getCompanyInfoByCompanyId(company_id)

    if (rows) {
      res.status(200).json({
        action: req.url,
        method: req.method,
        token: newtoken,
        data: {
          companyname: rows.name,
          barometeresvalue: rows.barometeresvalue || Utils.getRandomInt(100),
          totalspend: rows.totalspend || Utils.getRandomInt(100),
          totalpaid: rows.totalpaid || Utils.getRandomInt(100),
          chart: [],
          siret: rows.siret,
          ccn: rows.ccnname,
          idcc: rows.idcc,
          address: rows.road_1 + ' ' + rows.road_2,
          postalcode: rows.postcode,
          city: rows.city,
          iban: rows.iban,
        },
      })
    } else {
      Utils.mwarn(res, req, 'No data available')
    }
  } catch (e) {
    next(e)
  }
}

exports.getCompanyAccess = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    const rows = await getCompanyAccessByCompanyId(company_id)

    var resarray = []
    for (var k in rows) {
      //mlog(rows);
      resarray.push({
        id: rows[k].user_id,
        firstname: rows[k].firstname,
        lastname: rows[k].lastname,
        email: rows[k].email,
        phone: rows[k].phone,
        accesstype_name: rows[k].name,
        accesstype_id: rows[k].accesstype_id,
        enable: rows[k].enable,
      })
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        users: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getCompanyDocs = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    var doctype = parseInt(req.query.doctype) || ''
    var search = req.query.search || ''

    const rows = await getCompanyDocsByCompanyId(company_id, doctype, search)

    var resarray = []
    for (var k in rows) {
      //mlog(rows);
      resarray.push({
        id: rows[k].file_id,
        doctype: rows[k].doctype,
        doctype_id: rows[k].doctype_id,
        name: rows[k].name,
        date: rows[k].date,
        filesize: rows[k].filesize,
        amount: rows[k].amount || null,
        docpath: config.www_filepath + rows[k].path + rows[k].realname,
      })
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        docs: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getContractType = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    const rows = await getContratTypeByCompanyId(user_id, company_id)

    var resarray = []
    for (var k in rows) {
      //mlog(rows);
      resarray.push({
        id: rows[k].contracttype_id,
        contracttype: rows[k].name,
        totalcontribution: rows[k].totalcontribution,
        companycontribution: rows[k].companycontribution,
      })
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        contracts: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getCompanyDashboard = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    const company = await getCompanyBarometer(user_id, company_id)
    const topquestion = await getTopQuestion()
    const news = await getNewsByCompanyId(company_id)
    const status = await getCompanyStatusByCompanyId(company_id);

    console.log(status);

    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        companyname: company ? company.name : '',
        company_statud_id: status.companystatus_id,
        company_status_name: status.description,
        company_status_color: status.color,
        barometeresvalue:
          (company ? company.barometeresvalue : '') || Utils.getRandomInt(100),
        totalspend:
          (company ? company.totalspend : '') || Utils.getRandomInt(50000),
        totalpaid:
          (company ? company.totalpaid : '') || Utils.getRandomInt(30000),
        chart: [],
        topquestion: topquestion ? topquestion.subject : '',
        topresponse: topquestion ? topquestion.response : '',
        newsinfo: news.length > 0 ? news : [],
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getCompanyLive = async (req, res, next) => {
  try {
    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    var idstart = 0
    var nbresults = parseInt(config.nb_results_by_page)
    if (req.query.idstart) idstart = parseInt(req.query.idstart)
    if (req.query.nbresults) nbresults = parseInt(req.query.nbresults)

    const rows = await getCompanyLiveByCompanyId(company_id, idstart, nbresults)

    var resarray = []
    for (var k in rows) {
      //mlog(rows);
      params = []
      if (rows[k].params) params = JSON.parse(rows[k].params)
      resarray.push({
        id: rows[k].event_id,
        type_id: rows[k].eventtype_id,
        type_name: rows[k].typename,
        type_desc: rows[k].typedesc,
        name: rows[k].message,
        desc: null,
        date_creation: rows[k].date_creation,
        date_updated: rows[k].date_updated || null,
        date_done: params.datedone || null,
        status_id: rows[k].eventstatus_id,
        status_name: rows[k].eventname,
        status_desc: rows[k].eventdesc,
        paidbyowner: params.paidbyawner || null,
        totalpaid: params.totalpaid || null,
        refund: params.refund || null,
        refunddesc: params.refunddesc || null,
      })
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        logs: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getCompaniesList = async (req, res, next) => {
  // const user_id = req.query.user_id

  const user_id = parseInt(req.query.user_id) || null
  let rows
  try {
    if (!req.decoded.isadmin) {
      return Utils.mwarn(res, req, 'Admin private')
    }

    if (user_id) {
      rows = await getCompaniesListByUserId(user_id)
    } else {
      rows = await getCompaniesList()
    }

    var resarray = []
    if (rows.length > 0) {
      for (var k in rows) {
        //mlog(rows);
        resarray.push({
          company_id: rows[k].company_id,
          company_name: rows[k].name,
          date_creation: rows[k].date_creation,
          nbusers: rows[k].nbusers,
          nbmessages: rows[k].nbmessages,
          siret: rows[k].siret,
          phone: rows[k].phone,
          status_name: rows[k].status_name,
          status_description: rows[k].status_description,
          status_color: rows[k].status_color,
          barometeresvalue: rows[k].barometeresvalue || Utils.getRandomInt(100),
          ccn_name: rows[k].ccn_name,
          road_1: rows[k].road_1,
          postcode: rows[k].postcode,
          city: rows[k].city,
          tel: rows[k].tel,
          email: rows[k].email,
        })
      }
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        companies: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.updateCompany = async (req, res, next) => {
  try {
    //mlog(user_id+': '+req.method+' '+req.url);
    var company_id = parseInt(req.body.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    var company_name = req.body.company_name || null
    if (
      !company_name ||
      (typeof company_name === 'string' && company_name instanceof String) ||
      company_name == ''
    )
      return Utils.mwarn(res, req, 'company_name is required')

    var siret = parseFloat(req.body.siret) || null
    if (!siret || !ControlData.isNumeric(siret) || siret == 0)
      return Utils.mwarn(res, req, 'Siret is required')

    var companystatus_id = parseInt(req.body.companystatus_id) || null
    if (
      !companystatus_id ||
      !Number.isInteger(companystatus_id) ||
      companystatus_id == 0
    )
      return Utils.mwarn(res, req, 'companystatus_id is required')

    var address_id = parseInt(req.body.address_id) || null
    var address_info = {}
    if (req.body.address_info) address_info = JSON.parse(req.body.address_info)

    var ccn_id = parseInt(req.body.ccn_id) || null
    if (!ccn_id || !Number.isInteger(ccn_id) || ccn_id == 0)
      return Utils.mwarn(res, req, 'ccn_id is required')

    var iban = req.body.iban || null
    var old_insurer = req.body.old_insurer || null
    var effectif = req.body.effectif || null

    var pricing_age_id = parseInt(req.body.pricing_age_id) || null
    if (
      !pricing_age_id ||
      !Number.isInteger(pricing_age_id) ||
      pricing_age_id == 0
    )
      return Utils.mwarn(res, req, 'pricing_age_id is required')

    var companypourcent = parseInt(req.body.companypourcent) || null
    if (
      !companypourcent ||
      !Number.isInteger(companypourcent) ||
      companypourcent == 0
    )
      return Utils.mwarn(res, req, 'companypourcent is required')

    var pricing_struct_tarif_id =
      parseInt(req.body.pricing_struct_tarif_id) || null
    if (
      !pricing_struct_tarif_id ||
      !Number.isInteger(pricing_struct_tarif_id) ||
      pricing_struct_tarif_id == 0
    )
      return Utils.mwarn(res, req, 'pricing_struct_tarif_id is required')

    const result = await updateCompanyByCompany_id(
      company_id,
      company_name,
      siret,
      companystatus_id,
      address_id,
      address_info,
      ccn_id,
      old_insurer,
      effectif,
      pricing_age_id,
      companypourcent,
      pricing_struct_tarif_id,
    )
    if (result) {
      res.status(200).json({
        action: req.url,
        method: req.method,
        message: 'company is updated',
      })
    } else {
      res.status(400).json({
        action: req.url,
        method: req.method,
        message: 'error saving company',
      })
    }
  } catch (e) {
    next(e)
  }
}

exports.postCompany = async (req, res, next) => {
  try {
    //mlog(user_id+': '+req.method+' '+req.url);

    var name = req.body.name || null
    if (
      !name ||
      (typeof name === 'string' && name instanceof String) ||
      name == ''
    )
      return Utils.mwarn(res, req, 'Name is required')

    var siret = parseFloat(req.body.siret) || null
    if (!siret || !ControlData.isNumeric(siret) || siret == 0)
      return Utils.mwarn(res, req, 'Siret is required')

    var idcc = parseInt(req.body.idcc) || null
    if (!idcc || !Number.isInteger(idcc) || idcc == 0)
      return Utils.mwarn(res, req, 'idcc is required')
    else var ccn_id = await getCCN(idcc)

    var address = req.body.address || null
    if (
      !address ||
      (typeof address === 'string' && address instanceof String) ||
      address == ''
    )
      return Utils.mwarn(res, req, 'address is required')

    var postalcode = parseInt(req.body.postalcode) || null
    if (!postalcode || !Number.isInteger(postalcode) || postalcode == 0)
      return Utils.mwarn(res, req, 'postalcode is required')

    var city = req.body.city || null
    if (
      !city ||
      (typeof city === 'string' && address instanceof String) ||
      city == ''
    )
      return Utils.mwarn(res, req, 'city is required')

    var insurer = req.body.insurer || ''
    var effectif = parseInt(req.body.effectif) || null

    var age_id = parseInt(req.body.age_id) || null
    if (!age_id || !Number.isInteger(age_id) || age_id == 0)
      return Utils.mwarn(res, req, 'age_id is required')

    var companypourcent = parseInt(req.body.companypourcent) || null
    if (
      !companypourcent ||
      !Number.isInteger(companypourcent) ||
      companypourcent == 0
    )
      return Utils.mwarn(res, req, 'companypourcent is required')

    var struct_tarif_id = parseInt(req.body.struct_tarif_id) || null
    if (
      !struct_tarif_id ||
      !Number.isInteger(struct_tarif_id) ||
      struct_tarif_id == 0
    )
      return Utils.mwarn(res, req, 'struct_tarif_id is required')

    var guarantee_pack_id = parseInt(req.body.guarantee_pack_id) || null
    if (
      !guarantee_pack_id ||
      !Number.isInteger(guarantee_pack_id) ||
      guarantee_pack_id == 0
    )
      return Utils.mwarn(res, req, 'guarantee_pack_id is required')

    const address_id = await insertAddress(address, postalcode, city)
    if (!address_id)
      return Utils.merror(res, req, err, 'error while insertAddress')

    const company_id = await saveCompany(
      name,
      siret,
      address_id,
      ccn_id,
      insurer,
      effectif,
      age_id,
      companypourcent,
      struct_tarif_id,
    )
    if (company_id) {
      var registrationkey = await getNewRegistrationKey(
        config.useraccess_company,
        null,
        null,
        company_id,
      )
      res.status(200).json({
        action: req.url,
        method: req.method,
        data: {
          company_id: company_id,
          registrationkey: registrationkey,
        },
      })
    } else {
      res.status(400).json({
        action: req.url,
        method: req.method,
        message: 'error saving company',
      })
    }
  } catch (e) {
    next(e)
  }
}

exports.getMissingDocs = async (req, res, next) => {
  try {
    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    var company_status_id = parseInt(req.params.company_status_id) || null
    if (!company_status_id || !Number.isInteger(company_status_id) || company_status_id == 0)
      return Utils.mwarn(res, req, 'company_status_id is required')

    if (company_status_id == config.company_status_id_pending) {
      console.log("Status Pending missing docs")
      // test si il y a le KBIS enregistré
      var KBIS = await getFileByCompanyId(company_id, config.filetype_id_KBIS)
      // test si il y a un RIB
      var RIB = await getFileByCompanyId(company_id, config.filetype_id_RIB)
      //const docspending = await getDocsPending(company_id)
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        company_status_id,
        rib: (RIB && typeof RIB[0] != 'undefined' ? RIB[0] : false),
        kbis: (KBIS && typeof KBIS[0] != 'undefined' ? KBIS[0] : false),
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getCompanyStatus = async (req, res, next) => {
  try {
    const status = await fetchCompanyStatus()
    res.status(200).json({
      action: req.url,
      method: req.method,
      status: status,
    })
  } catch (error) {
    console.log(error)
    next(error)
  }
}

async function saveCompanyFile(user_id, company_id, filetype_id, filedata) {
  var save = await Utils.saveFileOnDisk(user_id, filedata);
  if (save.result == true) {
    insertCompanyFile(filetype_id, company_id, user_id, save.filename_orig, save.filename_new, "", 0, save.filedir, save.mimetype, save.filesize)
    return ({ filename_orig: save.filename_orig, filedir: save.filedir, filename_new: save.filename_new })
  } else {
    console.log("ERROR: " + save.error)
    return false;
  }
}

exports.postMissingDocs = async (req, res, next) => {
  try {
    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    var company_status_id = parseInt(req.params.company_status_id) || null
    if (!company_status_id || !Number.isInteger(company_status_id) || company_status_id == 0)
      return Utils.mwarn(res, req, 'company_status_id is required')

    var filetype_id = parseInt(req.body.filetype_id) || null
    if (!filetype_id || !Number.isInteger(filetype_id) || filetype_id == 0)
      return Utils.mwarn(res, req, 'filetype_id is required')

    if (company_status_id == config.company_status_id_pending) {
      var file = (req.files ? req.files.filedata : req.body.filedata)
      switch (filetype_id) {
        case (config.filetype_id_KBIS):
          var KBIS = await saveCompanyFile(req.decoded.user_id, company_id, filetype_id, file)
          break
        case (config.filetype_id_RIB):
          var RIB = await saveCompanyFile(req.decoded.user_id, company_id, filetype_id, file)
          break
      }
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        company_status_id,
        rib: (RIB ? RIB.filename_orig : false),
        kbis: (KBIS ? KBIS.filename_orig : false),
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.postCompanyUsers = async (req, res, next) => {
  try {
    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')

    var body = req.body.data || null
    if (!body || (typeof body === 'string' && body instanceof String) || body == '')
      return Utils.mwarn(res, req, 'data is required')

    var emailphone = body.split(/\r\n|\n|\r/)
    console.log(emailphone)

    emailphone.forEach(async e => {
      var registrationkey = await getNewRegistrationKey(config.useraccess_main, null, null, company_id)
      var link = config.www_rootentreprise + '?r=' + registrationkey;
      if (ControlData.validateEmail(e)) {
        Email.send_template_email('email_usercompany_registration.dust', {
          email: e,
          subject: '[Green Santé] Bienvenue chez Green Santé votre nouvelle mutuelle d\'entreprise',
          link: link,
        })
      } else if (ControlData.validatePhone(e)) {
        Utils.sendSMS(e, "Bienvenue chez Green Santé, votre nouvelle mutuelle d'entreprise, affiliez vous vite ici: " + link);
      }
    });

    // if (company_status_id == config.company_status_id_pending) {
    //   var file = (req.files ? req.files.filedata : req.body.filedata)
    //   switch(filetype_id) {
    //     case(config.filetype_id_KBIS):
    //       var KBIS = await saveCompanyFile(req.decoded.user_id, company_id, filetype_id, file)
    //       break
    //     case(config.filetype_id_RIB):
    //       var RIB = await saveCompanyFile(req.decoded.user_id, company_id, filetype_id, file) 
    //       break
    //   }
    // }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
      },
    })
  } catch (e) {
    next(e)
  }
}



/**
 * update le status de lacompany
 * retourner le nouvux entrprise update
 */

exports.updateCompanyStatus = async (req, res, next) => {
  try {

    const company_id = parseInt(req.body.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return Utils.mwarn(res, req, 'company_id is required')


    const company = req.body
    await updateStatusCopmnay(company)
    const newcompany = await findCompanyById(company_id)
    var resarray = []

    for (var k in newcompany) {
      //mlog(newcompany);
      resarray.push({
        company_id: newcompany[k].company_id,
        company_name: newcompany[k].name,
        date_creation: newcompany[k].date_creation,
        nbusers: newcompany[k].nbusers,
        nbmessages: newcompany[k].nbmessages,
        siret: newcompany[k].siret,
        phone: newcompany[k].phone,
        status_name: newcompany[k].status_name,
        status_description: newcompany[k].status_description,
        status_color: newcompany[k].status_color,
        barometeresvalue:
          newcompany[k].barometeresvalue || Utils.getRandomInt(100),
        ccn_name: newcompany[k].ccn_name,
        road_1: newcompany[k].road_1,
        postcode: newcompany[k].postcode,
        city: newcompany[k].city,
        tel: newcompany[k].tel,
        email: newcompany[k].email,
      })
    }

    res.status(200).json({
      action: req.url,
      method: req.method,
      company: resarray,
    })

  } catch (error) {
    console.log(error)
    next(error)
  }
}
