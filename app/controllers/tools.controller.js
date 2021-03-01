const { getInsurer, saveRegistrationKey, getAllAccessType, getRegistrationKey, updateRegistrationKey, saveRegistrationKeyData } = require('../queries/tools.queries')
const { findCompanyById } = require('../queries/company.queries')
const { getUserByEmail } = require('../queries/user.queries')
const { updateUserAccess } = require("../queries/useraccess.queries");
const Utils = require('../Utils.js')
const ControlData = require('../ControlData.js')
const Email = require('../Emails.js')
var osu = require('node-os-utils')
const serial = require('generate-serial-key')
const config = require('../config.js')
const path = require('path')
const { PDFNet } = require('@pdftron/pdfnet-node')
const { PDFDocument } = require('pdf-lib')
let pdf = require('html-pdf')
const fs = require('fs')
const PDFMerger = require('pdf-merger-js')
const fetch = require('node-fetch')
const { guarantee_pack_id_default } = require('../config.js')
const { convertHtmlToPdf, embedPdf, mergePdf, replaceText } = require('../service/pdf')

exports.getToolsInsurer = async (req, res, next) => {
  try {
    const rows = await getInsurer()
    var resarray = []
    if (rows.length > 0) {
      for (var k in rows) {
        resarray.push({
          id: rows[k].insurer_id,
          name: rows[k].name,
        })
      }
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      message: 'List of all insurer',
      data: { insurer: resarray },
    })
  } catch (e) {
    next(e)
  }
}

exports.getOsInformations = async (req, res, next) => {
  try {
    var infos = []

      /*
          info['cpu'] = await osu.cpu.usage();
          //info['loadavg'] = await osu.cpu.loadavg();
          info['drive'] = await osu.drive.info();
          info['memory'] = await osu.mem.info();
          info['proc'] = await osu.proc.totalProcesses();
          */

      ;[
        infos['cpu'],
        infos['drive'],
        infos['memory'],
        infos['proc'],
      ] = await Promise.all([
        osu.cpu.usage(),
        osu.drive.info(),
        osu.mem.info(),
        osu.proc.totalProcesses(),
      ])

    //console.log(infos);

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: 'Os Informations',
      data: {
        cpu: infos['cpu'],
        drive: infos['drive'],
        memory: infos['memory'],
        proc: infos['proc'],
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.sendRegistrationKey = async (
  email,
  firstname,
  user_id,
  company_id = null,
  accesstype_id,
) => {
  // TODO: TESTER SI LA REGLINK EXIST DEJA EN BDD ?
  // SI OUI: REGENERER UNE REGLINK
  var registrationkey = serial.generate(16, '-', 4)
  var key = await saveRegistrationKey(
    accesstype_id,
    registrationkey,
    email,
    user_id,
    company_id,
  )

  Email.send_template_email('email_registration.dust', {
    email: email,
    subject: '[Green Santé] Vous pouvez maintenant créer votre mot de passe',
    surname: firstname,
    link: config.www_rootback + 'registerpass/' + registrationkey,
  })
  return key
}

exports.getNewRegistrationKey = async (
  accesstype_id,
  email,
  user_id,
  company_id,
) => {
  // TODO: TESTER SI LA REGLINK EXIST DEJA EN BDD ?
  // SI OUI: REGENERER UNE REGLINK
  var registrationkey = serial.generate(16, '-', 4)
  var key = await saveRegistrationKey(
    accesstype_id,
    registrationkey,
    email,
    user_id,
    company_id,
  )
  return key
}

exports.saveRegistrationKeyData = async (req, res, next) => {
  try {
    console.log("req.body", req.body)
    var regkey = req.body.regkey || null;
    if (!regkey || (typeof regkey === 'string' && regkey instanceof String) || regkey == "")
      return Utils.mwarn(res, req, "registrationkey is required");

    var savedata = req.body.savedata || null;
    if (!savedata || (typeof savedata === 'string' && savedata instanceof String) || savedata == "")
      return Utils.mwarn(res, req, "No data to save");

    var key = await saveRegistrationKeyData(regkey, savedata)

    res.status(200).json({
      action: req.url,
      method: req.method,
    })
  } catch (e) {
    next(e)
  }
}

exports.getAccessType = async (req, res, next) => {
  try {
    var rows = await getAllAccessType()

    var resarray = []
    for (var k in rows) {
      //mlog(rows);
      resarray.push({
        id: rows[k].accesstype_id,
        name: rows[k].name,
        desc: rows[k].description,
      })
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        accesstype: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.testEmail = async (req, res, next) => {
  try {
    var email = req.query.email || null;
    if (!email || (typeof email === 'string' && email instanceof String) || email == "")
      return Utils.mwarn(res, req, "email is required");

    var key = req.query.key || null;
    if (!key || (typeof key === 'string' && key instanceof String) || key == "")
      return Utils.mwarn(res, req, "registrationkey is required");

    // SI LA KEY A DEJA ETE UTILISE RETURN WARNING
    var regkey = await getRegistrationKey(key);
    if (regkey && (regkey.user_id != null || regkey.email != null)) {
      res.status(200).json({
        action: req.url,
        method: req.method,
        message: "Registration key already used",
        keyused: true
      })
      return;
    }

    var result = false;
    if (ControlData.validateEmail(email)) {
      // SI L EMAIL EXISTE DEJA, ON LUI DONNE LES DROITS SUR CETTE ENTREPRISE
      var user = await getUserByEmail(email);
      if (user) {
        //console.log(user.user_id, user.company_id, config.useraccess_company)
        updateUserAccess(user.user_id, user.company_id, config.useraccess_company, 1);
        updateRegistrationKey(key, user.user_id, email);
        result = true;
      }
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      data: result,
      savedata: regkey.savedata
    })
  } catch (e) {
    next(e)
  }
}

async function generatePDF(inputfileModel, data, outputfile = null) {
  // const model = path.join(config.basedir + config.pdf_path + '/models/' + inputfileModel)
  // const filecreated = path.resolve(config.basedir + config.pdf_path + '/production/' + outputfile || "testfile.pdf")

  // // const replaceText = async () => {
  // //     const pdfDoc = await PDFNet.PDFDoc.createFromFilePath(model)
  // //     await pdfDoc.initSecurityHandler()
  // //     const replacer = await PDFNet.ContentReplacer.create()
  // //     const page = await pdfDoc.getPage(1)

  // //     const reader = await PDFNet.ElementReader.create()
  // //     reader.beginOnPage(page)

  // //     for (const [key, value] of Object.entries(data)) {
  // //         console.log(`${key}: ${value}`);
  // //         await replacer.addString(key, value)
  // //     }
  // //     // await replacer.addString('COMPANY_NAME', company[0].name)
  // //     // await replacer.addString('COMPANY_USER_NAME', 'khaled')
  // //     // await replacer.addString('GUARANTEE_PACK_NAME', 'eco')

  // //     await replacer.process(page)
  // //     pdfDoc.save(filecreated, PDFNet.SDFDoc.SaveOptions.e_linearized)
  // // }

  // await PDFNet.runWithCleanup(replaceText(model, filecreated, 1, data))

  await PDFNet.initialize();

  const doc = await PDFNet.PDFDoc.createFromFilePath(config.basedir + config.pdf_path + '/models/' + inputfileModel);
  doc.initSecurityHandler();

  const replacer = await PDFNet.ContentReplacer.create();
  const page = await doc.getPage(1);

  for (const [key, value] of Object.entries(data)) {
    console.log(`${key}: ${value}`);
    await replacer.addString(key, value)
  }

  await replacer.process(page);
  await doc.save(config.basedir + config.pdf_path + '/production/' + outputfile || "testfile.pdf", PDFNet.SDFDoc.SaveOptions.e_remove_unused);
}

exports.generatecarteTP = async (req, res, next) => {
  try {
    console.log("req.query.user_id", req.query.user_id)

    var user_id = parseInt(req.query.user_id) || null
    if (!user_id || !Number.isInteger(user_id) || user_id == 0)
      return Utils.mwarn(res, req, 'user_id is required')

    generatePDF(config.pdf_carteTP_model,
      {
        'ADDR1': 'Lalalalaaa',
        'TXT1': 'Lalalalaaa',
        'NOM': 'Raphael CARENTON',
      })

    // TODO
    res.status(200).json({
      action: req.url,
      method: req.method,
      //data: result,
    })
  } catch (e) {
    next(e)
  }
}

exports.getcompanycontract = async (req, res, next) => {
  try {
    var company_id = req.query.company_id || null;
    if (!company_id || (typeof company_id === 'string' && company_id instanceof String) || company_id == "")
      return Utils.mwarn(res, req, "company_id is required");


    // TODO
    res.status(200).json({
      action: req.url,
      method: req.method,
      data: result,
      savedata: regkey.savedata
    })
  } catch (e) {
    next(e)
  }
}



exports.getcompanycontract = async (req, res, next) => {
  try {
    var company_id = req.query.company_id || null;
    if (!company_id || (typeof company_id === 'string' && company_id instanceof String) || company_id == "")
      return Utils.mwarn(res, req, "company_id is required");


    // TODO
    res.status(200).json({
      action: req.url,
      method: req.method,
      data: result,
      savedata: regkey.savedata
    })
  } catch (e) {
    next(e)
  }
}

exports.getPDFQuote = async (req, res, next) => {
  // pathFiles
  const orginalPath = path.resolve(__dirname, '../content/pdf/models/test22.pdf')
  const outputPath = path.resolve(__dirname, '../content/pdf/orginal-replace.pdf')
  const cleantPath = path.resolve(__dirname, '../content/pdf/orginal-replace-clean.pdf')

  const templetePath = path.resolve(__dirname, '../content/pdf/templete.pdf')
  const htmlFile = path.join(__dirname, '../devis.html')
  const garantiepath = path.join(__dirname, '../content/pdf/garantie.pdf')
  const embedpath = path.join(__dirname, '../content/pdf/embed.pdf')
  const tmppath = path.join(__dirname, '../content/pdf/tmp.pdf')
  const company_id = req.params.company_id

  try {
    /////////////// querys///////////////

    const company = await findCompanyById(company_id)

    /////////////// remplaceTexte//////////////
    await replaceText(orginalPath, outputPath, cleantPath)
    /////// Convert html to pdf /////////////////
    // const garantiePdf = await convertHtmlToPdf(
    //   'http://dev.green-sante.fr/devis.php?gpid=' +
    //   `${company_id}` +
    //   `&token=` +
    //   `${newtoken}`,
    //   htmlFile,
    //   garantiepath,
    // )

    ///////////// fusionne un pdf dans un pdf /////////////////

    // const config = { scale: 0.8, x: 20, y: 60 }
    // const embepagedPdf = await embedPdf(
    //   templetePath,
    //   garantiepath,
    //   embedpath,
    //   config,
    // )

    ///////////// mergez les pdf /////////////////

    // let pages = [
    //   { pdf: orginalPath, pages: '1 to 3' },
    //   { pdf: embedpath },
    //   { pdf: orginalPath, pages: '6 to 12' },
    // ]
    // const mergePaagespdf = await mergePdf(pages, tmppath)
    res.setHeader('Content-Type', 'application/json');
    res.status(200)
    res.send('pdf')
    // MARCHE PAS ENCORE

  } catch (error) {
    console.log(error)
  }




}