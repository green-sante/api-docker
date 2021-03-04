const { getUserByEmail, getUserExemption, getUserByRegistrationkey, insertUserSimple, insertUser, getUserBarometer, getUserInfoByUserId, postUserInfoByUserId, getUserEvents, getAllUsers, getUserContactById, getUserAddressById, getUserExemptionById, updateUserByUserId, getAllUserByCompanyId, getUserGuaranteesByUserId, getUserGuarantees, getUserGuaranteeValues, getUserRecipentsByUserId, saveUserRecipentsByUserId, saveUserAskHospital, getUserMessageByUserId, postUserMessageByUserId, getNbUsersByCompanyId, getAllUserByCompany, findFilesByUserId,fetchMessageByUserId } = require("../queries/user.queries");
const { getCompanyAccessByUserId } = require("../queries/company.queries");
const { updateUserAccess } = require("../queries/useraccess.queries");
const { getGaranteePackById } = require("../queries/guarantee.queries");
const { getContractTypeById, insertAddress, updateAddress, updateContact, insertUserFile, getCardDataByUserId } = require("../queries/tools.queries");
const { getToken } = require("./token.controller");
const { getTopQuestion, getNews, saveNewsReaded, insertRecipient, updateRegistrationKey, insertCompanyFile, insertEventByUserId } = require("../queries/tools.queries");
const Utils = require('../Utils.js');
const ControlData = require('../ControlData.js');
const Email = require('../Emails.js');
var config = require('../config'); // get our config file
const fs = require("fs");
const Guarantee = require('../Guarantee.js');
var dateFormat = require('dateformat');

exports.postUserFile = async (req, res, next) => {
  try {
    //let filedir = dateFormat(new Date(), "yyyy-mm") + "/"; // REPERTOIRE DU MOIS
    //let filelocation = config.www_filedirectory + filedir; // DIR EXACT OU STOCKER LES ENVOIS
    console.log("postUserFile")

    var file = await Utils.saveFileOnDisk(req.decoded.user_id, req.body.file)
    if (file.result) {
      res.status(200).json({
        action: req.url,
        method: req.method,
        token: newtoken,
        result: 'File uploaded succesfully!',
      });
    } else {
      Utils.merror(res, req, 'File uploading problem')
    }

    // // CREATION DU REPERTOIRE DU MOIS SI IL N EXISTE PAS
    // if (!fs.existsSync(filelocation)) {
    //   fs.mkdir(filelocation, (err) => {
    //     if (err) {
    //       return console.error(err);
    //     }
    //     console.log('Directory ' + filelocation + ' created successfully!');
    //   });
    // }

    // console.log("req.files", req.files)
    // console.log("req.body", req.body)

    // if (!req.files || Object.keys(req.files).length === 0) {
    //   return Utils.mwarn(res, req, "No files were uploaded.");
    // }

    // for (let i = 0; i < 50; i++) {
    //   let sampleFile = req.files.file;
    //   var filename = req.decoded.user_id + "_" + i + "_" + req.files.file.name;
    //   //mlog(filename);
    //   filename = Utils.encrypt(filename);
    //   if (!fs.existsSync(filelocation + filename)) {
    //     //file not exists
    //     sampleFile.mv(filelocation + filename, function (err) {
    //       if (err)
    //         return merror(res, req, err, 'error post user file (mv): ');
    //       const affectedRows = insertUserFile(req.decoded.user_id, ControlData.sqlescstr(req.files.file.name), filename, ControlData.sqlescstr(req.body.comment), ControlData.sqlescstr(req.body.type), filedir, ControlData.sqlescstr(req.files.file.mimetype), Utils.formatBytes(req.files.file.size));
    //       res.status(200).json({
    //         action: req.url,
    //         method: req.method,
    //         token: newtoken,
    //         result: 'File uploaded succesfully!',
    //       });
    //     });
    //     return;
    //   }
    // }
    // Utils.mwarn(res, req, "Finename already exist, please change");
  } catch (e) {
    //console.log("iciciccccccciiii", e)
    next(e);
  }
}


// exports.postUserFile = async (req, res, next) => {
//   try {
//     let filedir = dateFormat(new Date(), 'yyyy-mm') + '/' // REPERTOIRE DU MOIS
//     let filelocation = config.www_filedirectory + filedir // DIR EXACT OU STOCKER LES ENVOIS

//     // CREATION DU REPERTOIRE DU MOIS SI IL N EXISTE PAS
//     if (!fs.existsSync(filelocation)) {
//       fs.mkdir(filelocation, (err) => {
//         if (err) {
//           return console.error(err)
//         }
//         console.log('Directory ' + filelocation + ' created successfully!')
//       })
//     }

//     if (!req.files || Object.keys(req.files).length === 0) {
//       return Utils.mwarn(res, req, 'No files were uploaded.')
//     }

//     for (let i = 0; i < 50; i++) {
//       let sampleFile = req.files.file
//       var filename = req.decoded.user_id + '_' + i + '_' + req.files.file.name
//       //mlog(filename);
//       filename = Utils.encrypt(filename)
//       if (!fs.existsSync(filelocation + filename)) {
//         //file not exists
//         sampleFile.mv(filelocation + filename, function (err) {
//           if (err) return merror(res, req, err, 'error post user file (mv): ')
//           const affectedRows = insertFile(
//             req.decoded.user_id,
//             ControlData.sqlescstr(req.files.file.name),
//             filename,
//             ControlData.sqlescstr(req.body.comment),
//             ControlData.sqlescstr(req.body.type),
//             filedir,
//             ControlData.sqlescstr(req.files.file.mimetype),
//             Utils.formatBytes(req.files.file.size),
//           )
//           res.status(200).json({
//             action: req.url,
//             method: req.method,
//             token: newtoken,
//             result: 'File uploaded succesfully!',
//           })
//         })
//         return
//       }
//     }
//     Utils.mwarn(res, req, 'Finename already exist, please change')
//   } catch (e) {
//     next(e)
//   }
// }

exports.updateUser = async (req, res, next) => {
  try {
    console.log(req)

    var user_id = parseInt(req.body.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var address_id = parseInt(req.body.address_id) || null
    var address_info = {}
    if (req.body.address_info) address_info = JSON.parse(req.body.address_info)

    var contact_id = parseInt(req.body.contact_id) || null
    var contact_info = {}
    if (req.body.contact_info) contact_info = JSON.parse(req.body.contact_info)

    req.body.contact_id = await updateContact(contact_id, contact_info)
    req.body.address_id = await updateAddress(address_id, address_info)

    console.log(req.body)

    const affectedRows = await updateUserByUserId(user_id, req.body)

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: 'User is updated',
    })
  } catch (e) {
    next(e)
  }
}

exports.postUserAskHospital = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var jsondata = JSON.stringify({
      finesscode: ControlData.sqlescstr(req.body.finesscode),
      contactinfo: ControlData.sqlescstr(req.body.contactinfo),
      dmtcode: ControlData.sqlescstr(req.body.dmtcode),
      date_operation: ControlData.sqlescstr(req.body.date_operation),
      date_exit: ControlData.sqlescstr(req.body.date_exit),
    })

    const newuser_uid = await saveUserAskHospital(
      user_id,
      req.body.comment,
      jsondata,
    )

    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      result: 'User askhospital well added',
    })
  } catch (e) {
    next(e)
  }
}

exports.postUserRecipients = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var email = req.body.email || null
    // if (!email || (typeof email === 'string' && email instanceof String) || email == '')
    //   return Utils.mwarn(res, req, 'email is required')

    var recipienttype_id = parseInt(req.body.recipienttype) || null
    if (!recipienttype_id || !Number.isInteger(recipienttype_id) || recipienttype_id == 0)
      return Utils.mwarn(res, req, 'recipienttype_id is required')

    var recipientiban = req.body.recipientiban || null

    console.log("Add Recipient req.body:", req.body)

    // TODO Tester si le user exist deja dans la BDD user
    // TODO Chercher le company_id du user pour l'ajouter au news user
    const newuser_uid = await saveUserRecipentsByUserId(
      user_id,
      email,
      ControlData.sqlescstr(req.body.firstname),
      ControlData.sqlescstr(req.body.lastname),
      ControlData.sqlescstr(req.body.secunumber),
      ControlData.sqlescstr(req.body.recipientiban),
    )
    const recipient_id = await insertRecipient(
      user_id,
      newuser_uid,
      recipienttype_id,
    )

    // Ajout de l'évenement pour l'utilisateur 
    insertEventByUserId(user_id, config.event_addrecipient_id, "Ajout d'un nouveau béneficiaire (" + ControlData.sqlescstr(req.body.firstname) + ")",
      {
        email: email,
        newuser_id: newuser_uid,
        firstname: ControlData.sqlescstr(req.body.firstname),
        lastname: ControlData.sqlescstr(req.body.lastname),
        secunumber: ControlData.sqlescstr(req.body.secunumber),
        recipientiban: ControlData.sqlescstr(req.body.recipientiban) || null,
      })

    // Ajout de l'évenement pour le nouveau beneficiaire
    insertEventByUserId(newuser_uid, config.event_newrecipient_id, "Création de votre compte beneficiaire",
      {
        email: email,
        fromuser_id: user_id,
        firstname: ControlData.sqlescstr(req.body.firstname),
        lastname: ControlData.sqlescstr(req.body.lastname),
        secunumber: ControlData.sqlescstr(req.body.secunumber),
        recipientiban: ControlData.sqlescstr(req.body.recipientiban)
      })

    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      result: 'User recipient well added',
    })
  } catch (e) {
    next(e)
  }
}

exports.getUserMessage = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var start = 0
    var nbresults = config.nb_results_by_page
    if (req.body.start) start = req.body.start
    if (req.body.nbresults) nbresults = req.body.nbresults

    const rows = await getUserMessageByUserId(user_id, start, nbresults)

    var resarray = []
    var responses = []
    var prev_message_id = 0
    for (var k in rows) {
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
    console.log(resarray)
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

exports.postUserMessage = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    var response_message_id = parseInt(req.body.response_message_id) || null

    const result = postUserMessageByUserId(
      user_id,
      response_message_id,
      req.body.message,
    )

    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      message: 'Messages well added',
    })
  } catch (e) {
    next(e)
  }
}

exports.getUserRecipients = async (req, res, next) => {
  try {
    var user_id = parseInt(req.decoded.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    const rows = await getUserRecipentsByUserId(user_id)

    var resarray = []
    for (var k in rows) {
      //mlog(rows);
      resarray.push({
        id: rows[k].recipient_user_id,
        email: rows[k].email,
        firstname: rows[k].firstname,
        lastname: rows[k].lastname,
        start: rows[k].datestart,
        enable: rows[k].enable,
      })
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        recipient: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getUserGuaranteesById = async (req, res, next) => {
  try {
    const rows = await getUserGuarantees(
      req.decoded.user_id,
      req.query.activity_id,
      req.query.search,
      req.query.idstart,
    )

    var resarray = []
    var pack = []
    for (var k in rows) {
      //mlog(rows);
      resarray.push({
        guarantee_name: rows[k].guarantee_name,
        guarantee_id: rows[k].guarantee_id,
        activity_name: rows[k].activity_name,
        activity_id: rows[k].guarantee_activity_id,
        guarantee_category_name: rows[k].guarantee_category_name,
        guarantee_category_id: rows[k].guarantee_category_id,
        img: rows[k].img,
        urlsearch: rows[k].img,
        desc: rows[k].description,
      })
        ; (pack.name = rows[k].packname), (pack.desc = rows[k].packdesc)
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        packname: pack.name,
        packdesc: pack.desc,
        guarantees: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getUserGuaranteesByGuaranteeId = async (req, res, next) => {
  try {
    var guarantee_id = req.params.guarantee_id || null

    const rows = await getUserGuaranteeValues(guarantee_id)

    var resarray = []
    for (var k in rows) {
      //mlog(rows);
      resarray.push({
        sector: rows[k].txtvalue,
        desc: rows[k].description,
        value: rows[k].value,
        exemple: rows[k].exemple,
      })
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        values: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getUserGuaranteesByActivities = async (req, res, next) => {
  try {
    const rows = await getUserGuaranteesByUserId(
      req.decoded.user_id,
      req.query.search,
      req.query.maxresults,
    )

    const activities = await Guarantee.orderGarantiesByActivities(rows)
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        packname: rows ? rows[0].packname || null : '',
        packdesc: rows ? rows[0].packdesc || null : '',
        activities: activities,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getUsersList = async (req, res, next) => {
  const company_id = req.query.company_id
  let users = []
  try {
    if (company_id) {
      users = await getAllUserByCompany(company_id)
    } else {
      users = await getAllUsers()
    }

    for (var k in users) {
      //[users[k].]
      users[k].guarantee_pack_info = await getGaranteePackById(
        users[k].guarantee_pack_id,
      )
      users[k].contracttype_name = await getContractTypeById(
        users[k].contracttype_id,
      )
      users[k].contact_info = await getUserContactById(users[k].contact_id)
      users[k].address_info = await getUserAddressById(users[k].address_id)
      users[k].userexemption_info = await getUserExemptionById(
        users[k].userexemption_id,
      )
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      data: {
        users,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getNbUsers = async (req, res, next) => {
  try {
    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return mwarn(res, req, 'company_id is required')

    const rows = await getNbUsersByCompanyId(req.params.company_id)
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        nbusers: rows ? rows.nbusers : null,
      },
    })
  } catch (e) {
    console.log(e)
    next(e)
  }
}

exports.getUserByCompanyId = async (req, res, next) => {
  try {
    var company_id = parseInt(req.params.company_id) || null
    if (!company_id || !Number.isInteger(company_id) || company_id == 0)
      return mwarn(res, req, 'company_id is required')

    var search = req.query.search || ''

    const users = await getAllUserByCompanyId(company_id, search)
    // for(var k in users){
    //     //[users[k].]
    //     users[k].guarantee_pack_info = await getGaranteePackById(users[k].guarantee_pack_id);
    //     users[k].contracttype_name = await getContractTypeById(users[k].contracttype_id);
    //     users[k].contact_info = await getUserContactById(users[k].contact_id);
    //     users[k].address_info = await getUserAddressById(users[k].address_id);
    //     users[k].userexemption_info = await getUserExemptionById(users[k].userexemption_id);
    // }
    //console.log(users);
    res.status(200).json({
      action: req.url,
      method: req.method,
      data: {
        users,
      },
    })
  } catch (e) {
    console.log(e)
    next(e)
  }
}

exports.getUserLive = async (req, res, next) => {
  try {
    var nbstart = 0
    var nbresults = config.nb_results_by_page
    if (req.query.nbstart) nbstart = parseInt(req.query.nbstart)
    if (req.query.nbresults) nbresults = parseInt(req.query.nbresults)

    const rows = await getUserEvents(req.decoded.user_id, nbstart, nbresults)
    params = []
    var resarray = []
    for (var k in rows) {
      //mlog(rows);
      if (rows[k].params) params = JSON.parse(rows[k].params)
      else params = {}
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
        paidbyowner: params.paidbyowner || null,
        totalpaid: params.totalpaid || null,
        refund: params.refund || null,
        refund_secu: params.refund_secu || null,
        refunddesc: params.refunddesc || null,
        color: rows[k].color,
      })
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      data: {
        logs: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.postUserCardTP = async (req, res, next) => {
  try {
    if (ControlData.validateEmail(req.body.emailphone)) {
      Email.send_template_email('email_sponsor.dust', {
        email: req.body.emailphone,
        subject: '[Green Santé] Votre carte de tiers payant',
      })
    } else if (ControlData.validateEmail(req.body.emailphone)) {
      mlog('TODO SEND INFO BY SMS')
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

exports.getUserCarddata = async (req, res, next) => {
  try {
    const rows = await getCardDataByUserId(req.decoded.user_id);
    var resarray = [];
    for (var k in rows) {
      resarray.push({
        "id": rows[k].carddata_id,
        "name": rows[k].name,
        "value": rows[k].value,
        "calc": rows[k].calc,
      });
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        carddata: resarray,
      }
    });
  } catch (e) {
    next(e);
  }
}

exports.userOver50 = async (req, res, next) => {
  try {
    console.log(req.body)

    var files = []
    allfiles = fs.readdirSync(config.entreprise_upload_dir)

    for (var k in allfiles) {
      if (allfiles[k].startsWith(req.body.siret)) files.push(allfiles[k])
    }
    Email.send_template_email('email_newOver50.dust', {
      email: 'raphael@green-sante.fr',
      emailfrom: req.body.email,
      subject: "[Green Santé] Nouvelle demande d'etude tarifaire envoyée",
      name: req.body.name,
      address: req.body.address,
      postalcode: req.body.postalcode,
      city: req.body.city,
      effectif: req.body.effectif,
      siret: req.body.siret,
      idcc: req.body.idcc,
      ccn: req.body.ccn,
      ccn_long: req.body.ccn_long,
      insurer: req.body.insurer,
      files: files,
    })
    res.status(200).json({
      action: req.url,
      method: req.method,
    })
  } catch (e) {
    next(e)
  }
}

exports.postUserSponsor = async (req, res, next) => {
  try {
    if (ControlData.validateEmail(req.body.emailphone)) {
      Email.send_template_email('email_sponsor.dust', {
        email: req.body.emailphone,
        subject: '[Green Santé] Votre ami vous partage des informations',
      })
    } else if (ControlData.validateEmail(req.body.emailphone)) {
      console.log('==========> TODO SEND INFO BY SMS')
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      // token: newtoken,
    })
  } catch (e) {
    console.log(e)
    next(e)
  }
}

exports.getUserAccess = async (req, res, next) => {
  try {
    let access = await getCompanyAccessByUserId(req.decoded.user_id);
    var d = new Date();
    //console.log(d.getMonth()+1);
    d.setMonth(d.getMonth() + 1);
    console.log(d.toLocaleString());
    access.nextmonth = "01/" + (d.getMonth() + 1) + "/" + d.getFullYear()
    console.log(access.nextmonth)
    //var isadmin = false;
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      test: access.nextmonth,
      data: {
        useraccess: access,
      }
    });
  } catch (e) {
    next(e);
  }
}

exports.postUserInfo = async (req, res, next) => {
  try {
    const result = await postUserInfoByUserId(req.body, req.decoded.user_id)
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
    })
  } catch (e) {
    next(e)
  }
}

exports.getUserInfo = async (req, res, next) => {
  try {
    const result = await getUserInfoByUserId(req.decoded.user_id)
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        userstatus: result ? result.userstatus_id : '',
        userstatus_message: result ? result.userstatus_message : '',
        userstatus_date_start: result ? result.userstatus_date_start : '',
        userstatus_date_end: null, // TODO
        ownerfirstname: result ? result.firstname : '',
        ownerlastname: result ? result.lastname : '',
        ownerid: result ? result.user_id : '',
        ownersecunumber: result ? result.ownersecunumber : '',
        ownervalidationurl: result ? result.ownervalidationurl : '', // TODO
        concentrator: result ? result.concentrator : '', // TODO
        teletransmissionnumber: result ? result.teletransmissionnumber : '',
        teletransmissionstateid: result ? result.teletransmissionstateid : '',
        amccode: result ? result.amccode : '',
        cardurl: 'http://www.green-sante.fr/4242424242', // TODO
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.saveUserNewsRead = async (req, res, next) => {
  try {
    var newsid = parseInt(req.body.newsid) || null
    if (!newsid || !Number.isInteger(newsid) || newsid == 0)
      return Utils.mwarn(res, req, 'newsid is required')

    const affectedRows = await saveNewsReaded(req.decoded.user_id, newsid)
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
    })
  } catch (e) {
    next(e)
  }
}

exports.userDashboard = async (req, res, next) => {
  try {
    const barometer = await getUserBarometer(req.decoded.user_id)
    const topquestion = await getTopQuestion()
    const news = await getNews(req.decoded.user_id)
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        companyname: barometer.name,
        barometeresvalue: barometer.barometeresvalue || Utils.getRandomInt(100),
        totalspend: barometer.totalspend || Utils.getRandomInt(3000),
        totalpaid: barometer.totalpaid || Utils.getRandomInt(5000),
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

exports.userLogin = async (req, res, next) => {
  try {
    console.log('userLogin:', req.body.email)
    if (!ControlData.validateEmail(req.body.email)) {
      console.log('error Login email is not allowed: ' + req.body.email)
      res.status(403).json({
        action: req.url,
        method: req.method,
        success: false,
        message: 'error Login email is not allowed',
      })
      return
    }
    const user = await getUserByEmail(req.body.email)
    if (!user) {
      // LE USER N EXISTE PAS
      res.status(403).json({
        action: req.url,
        method: req.method,
        message: 'Authentication failed. User not found.',
        enabled: false,
      })
    } else {
      if (user.password !== req.body.password) {
        res.status(401).json({
          action: req.url,
          method: req.method,
          message: 'Authentication failed. Wrong password.',
          enabled: false,
        })
      } else {
        if (user.enabled == false) {
          res.status(403).json({
            action: req.url,
            method: req.method,
            message: 'Acces denied, account disabled',
            enabled: false,
          })
        } else {
          const access = await getCompanyAccessByUserId(user.user_id)
          //var isadmin = false;
          for (var k in access) {
            user.isadmin =
              user.isadmin == false || access[k].isadmin ? true : false
          }
          res.status(200).json({
            action: req.url,
            method: req.method,
            message: 'Save your token!',
            data: {
              token: await getToken(user),
              expiration: await Utils.expiration_timestamp_get(),
              user_id: user.user_id,
              email: user.email,
              firstname: user.firstname,
              lastname: user.lastname,
              isadmin: user.isadmin,
              useraccess: access,
            },
          })
        }
      }
    }
  } catch (e) {
    console.error('error:', e)
    res.status(404).json({
      action: req.url,
      method: req.method,
      message: 'Error trying to log',
      enabled: false,
    })
  }
}

exports.userLostPassword = async (req, res, next) => {
  try {
    console.log('userLostPassword:', req.body.email)
    if (!ControlData.validateEmail(req.body.email)) {
      console.log('error lostpassword email is not allowed: ' + req.body.email)
      res.status(403).json({
        action: req.url,
        method: req.method,
        success: false,
        message: 'error lostpassword email is not allowed',
      })
      return
    }
    const user = await getUserByEmail(req.body.email)
    //console.log(user);
    if (!user) {
      res.status(404).json({
        action: req.url,
        method: req.method,
        success: false,
        message: 'user not found',
      })
    } else {
      res.status(200).json({
        action: req.url,
        method: req.method,
        success: true,
        message: 'lostpassword have been sended by email',
      })
      Email.send_template_email('email_lostpassword.dust', {
        email: user.email,
        subject: '[Green Santé] Mot de passe oublié sur Green-Sante.fr',
        surname: user.firstname,
        login: user.email,
        password: user.password,
      })
    }
  } catch (e) {
    console.error('error:', e)
    res.status(404).json({
      action: req.url,
      method: req.method,
      message: 'Error trying to log',
      enabled: false,
    })
  }
}

exports.getUserExemption = async (req, res, next) => {
  try {
    console.log('getUserExemption')
    const exemption = await getUserExemption()
    console.log(exemption)
    if (!exemption) {
      res.status(404).json({
        action: req.url,
        method: req.method,
        message: 'No exemption available',
      })
    } else {
      res.status(200).json({
        action: req.url,
        method: req.method,
        data: exemption,
      })
    }
  } catch (e) {
    console.error('error:', e)
    res.status(404).json({
      action: req.url,
      method: req.method,
      message: 'Error trying to log',
      enabled: false,
    })
  }
}

exports.postUserExemption = async (req, res, next) => {
  try {
    console.log('postUserExemption')

    var exemption_id = parseFloat(req.body.exemption_id) || null
    if (
      !exemption_id ||
      !ControlData.isNumeric(exemption_id) ||
      exemption_id == 0
    ) {
      res.status(404).json({
        action: req.url,
        method: req.method,
        message: 'exemption_id is invalid',
      })
      return
    }
    const user = await getUserByRegistrationkey(req.body.registrationkey)
    if (!user) {
      res.status(404).json({
        action: req.url,
        method: req.method,
        message: 'registrationkey is invalid',
      })
    } else {
      const insertId = await insertUserSimple(user)
      if (insertId) {
        res.status(200).json({
          action: req.url,
          method: req.method,
          message: 'user exemption is saved',
        })
      } else {
        res.status(404).json({
          action: req.url,
          method: req.method,
          message: 'error insert user',
        })
      }
    }
  } catch (e) {
    console.error('error:', e)
    res.status(404).json({
      action: req.url,
      method: req.method,
      message: 'Error trying to log',
      enabled: false,
    })
  }
}

exports.getUserFile = async (req, res, next) => {
  try {
    const user_id = parseInt(req.params.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    if (!req.decoded.isadmin) {
      return Utils.mwarn(res, req, 'Admin private')
    }

    const files = await findFilesByUserId(user_id)

    res.status(200).json({
      action: req.url,
      method: req.method,
      data: {
        files: files
      }
    })
  } catch (error) {
    next(error)

  }
}

async function saveUserFile(user_id, company_id, filetype_id, filedata) {
  var save = await Utils.saveFileOnDisk(user_id, filedata);
  if (save.result == true) {
    insertCompanyFile(filetype_id, company_id, user_id, save.filename_orig, save.filename_new, "", 0, save.filedir, save.mimetype, save.filesize)
    return ({ filename_orig: save.filename_orig, filedir: save.filedir, filename_new: save.filename_new })
  } else {
    console.log("ERROR: " + save.error)
    return false;
  }
}

exports.userRegistration = async (req, res, next) => {
  try {
    console.log("userRegistration");

    // SI IL Y A registrationkey C EST DONC UNE AFFILIATION A UNE COMPANY OU UN ACCES A LA PARTIE RH
    if (req.body.registrationkey && req.body.registrationkey != "") {
      console.log("SI IL Y A registrationkey C EST DONC UNE AFFILIATION A UNE COMPANY OU UN ACCES A LA PARTIE RH")
      var user = await getUserByRegistrationkey(req.body.registrationkey);
      if (!user) {
        res.status(404).json({
          action: req.url,
          method: req.method,
          message: "registrationkey is invalid",
        });
      } else {
        user = { ...user, ...req.body };
        // SI LE USER EXISTE ALORS ON LUI DONNE JUSTE LES DROIT D ACCES A CETTE NOUVELLE SOCIETE
        var olduser = await getUserByEmail(user.email)
        if (olduser) {
          console.log("LE USER EXISTE ALORS ON LUI DONNE JUSTE LES DROIT D ACCES A CETTE NOUVELLE SOCIETE", olduser)
          updateUserAccess(olduser.user_id, user.company_id, user.accesstype_id, 1);
          updateRegistrationKey(req.body.registrationkey, olduser.user_id, user.email);
          res.status(200).json({
            action: req.url,
            method: req.method,
            message: 'User is well updated'
          });
        } else {
          // ON INSERT UN NOUVEL UTILISATEUR
          console.log("ON INSERT UN NOUVEL UTILISATEUR");
          console.log(user)
          user.address_id = await updateAddress(0, user);
          const insertId = await insertUser(user, req.body);

          saveUserFile(insertId, user.company_id, config.filetype_id_AttestationDroit, req.files.attestationdroit)
          saveUserFile(insertId, user.company_id, config.filetype_id_CNI_recto, req.files.CNI)

          updateRegistrationKey(req.body.registrationkey, insertId, user.email);

          if (insertId) {
            updateUserAccess(insertId, user.company_id, user.accesstype_id, 1);
            if (config.automatic_registration_back_access) {
              Email.send_template_email('email_registration_2.dust',
                {
                  'email': user.email,
                  'subject': '[Green Santé] Bienvenue dans votre nouvel espace',
                  'firstname': user.firstname,
                  'login': user.email,
                  'link': config.www_webapp,
                });
            }
            res.status(200).json({
              action: req.url,
              method: req.method,
              message: 'User is well inserted',
              data: {
                //token: await getToken({email: user.email, password: req.body.password, user_id:insertId, isadmin:false}),
                //expiration: await Utils.expiration_timestamp_get(), 
                //user_id: insertId, 
                email: user.email,
                firstname: req.body.firstname,
                lastname: req.body.lastname,
              },
            });
          } else {
            res.status(404).json({
              action: req.url,
              method: req.method,
              message: "error insert user",
            });
          }
        }
      }
      // SINON C EST L ENREGISTREMENT D UNE NOUVEL COMPANY DONC IL Y A FORCEMENT UN company_id
    } else if (req.body.company_id && req.body.company_id != "") {
      console.log("SINON C EST L ENREGISTREMENT D UNE NOUVEL COMPANY DONC IL Y A FORCEMENT UN company_id")
      const insertId = await insertUser(user, req.body);
      if (insertId) {
        updateUserAccess(insertId, req.body.company_id, 1, 1);
        updateRegistrationKey(req.body.registrationkey, insertId, req.body.email);
        res.status(200).json({
          action: req.url,
          method: req.method,
          message: 'User is well inserted',
          data: {
            token: await getToken({ email: req.body.email, password: req.body.password, user_id: insertId, isadmin: false }),
            expiration: await Utils.expiration_timestamp_get(),
            user_id: insertId,
            email: req.body.email,
            firstname: req.body.firstname,
            lastname: req.body.lastname,
          },
        });
      } else {
        res.status(404).json({
          action: req.url,
          method: req.method,
          message: "error insert user",
        });
      }
    }
  } catch (e) {
    console.error('error:', e)
    res.status(404).json({
      action: req.url,
      method: req.method,
      message: 'Error trying to log',
      enabled: false,
    })
  }
}

exports.getUserMessageByUserId = async (req, res, next) => {

  let user_id = parseInt(req.params.user_id) || null
  if (!user_id || !Number.isInteger(user_id) || user_id == 0)
    return Utils.mwarn(res, req, 'user_id is required')

  try {
  const messages = await fetchMessageByUserId(user_id)
 const messagesResponses = messages.map((message) => {
  if (message.response_message_id != null) {
    messages.map((e) => {
      if (message.response_message_id === e.message_id) {
        message['responses'] = [e]
      }
    })
  }
  return message
})
const messagessfinale = messages.filter(message => message.response_message_id != null)



console.log('debugger',messagessfinale)
 

    res.status(200).json({
      action: req.url,
      method: req.method,
      data: {
        messages: messagesResponses,
      },
    })
  } catch (error) {
    next(error)
  }


}

