const ControlData = require('../ControlData.js')
const { mysql, db } = require('../Mysql')
const { updateAddress } = require('../queries/tools.queries')
var config = require('../config')
const { query } = require('express')

exports.companyUpdateByCompanyId = async (company_id, company) => {
  const result = await db.query(
    'UPDATE `company` SET ? WHERE `company`.`company_id` = ? ',
    [company, company_id],
  )
  if (result.affectedRows > 0) return result.affectedRows
  else return false
}

exports.getMessageByCompanyId = async (company_id, start, nbresults) => {
  const result = await db.query(
    'SELECT m.message_id, m.sender, m.text, m.datecreate, m.response_message_id FROM `message` m ' +
    'WHERE m.company_id=?',
    [company_id, start, nbresults],
  )
  if (result.length > 0) return result
  else return false
}

exports.findMessageById = async (message_id) => {
  return await db.query(
    'SELECT * FROM  `message` WHERE `message_id`=?',
    message_id,
  )
}

exports.getCompanyInfoByCompanyId = async (company_id) => {
  const result = await db.query(
    'SELECT DISTINCT c.name, c.barometeresvalue, c.totalspend, c.totalpaid, c.siret, (SELECT ccn.name FROM ccn WHERE ccn.ccn_id=c.ccn_id) ccnname, ' +
    '(SELECT ccn.idcc FROM ccn WHERE ccn.ccn_id=c.ccn_id) as idcc, ad.road_1, ad.road_2, ad.postcode, ad.city, c.iban, c.IGA_company_id, c.IGA_contact_email ' +
    'FROM `company` c, `address` ad WHERE c.address_id=ad.address_id AND c.company_id=? ',
    [company_id],
  )
  if (result.length > 0) return result[0]
  else return false
}

exports.getCompanyAccessByCompanyId = async (company_id) => {
  const result = await db.query(
    'SELECT u.user_id, u.firstname, u.lastname, u.email, u.phone, at.name, at.accesstype_id, ua.enable ' +
    'FROM `user` u, `useraccess` ua, `accesstype` at ' +
    'WHERE ua.company_id=? AND u.user_id=ua.user_id AND ua.accesstype_id=at.accesstype_id ' +
    'ORDER BY at.name ASC, u.firstname ASC',
    [company_id],
  )
  if (result.length > 0) return result
  else return false
}

exports.getCompanyDocsByCompanyId = async (company_id, doctype, search) => {
  if (doctype) doctype = ' AND ft.filetype_id=' + doctype + ' '
  else doctype = ''

  if (search)
    search = " AND f.name LIKE '%" + ControlData.sqlescstr(search) + "%' "
  else search = ''

  const result = await db.query(
    'SELECT DISTINCT f.file_id, ft.name as doctype, ft.filetype_id as doctype_id, f.name, f.date, f.filesize, f.path, f.realname, f.amount ' +
    'FROM `file` f, `filetype` ft ' +
    'WHERE f.company_id=? AND ft.filetype_id=f.filetype_id AND user_id is NULL ' +
    doctype +
    search +
    'ORDER BY f.date ASC',
    [company_id],
  )
  if (result.length > 0) return result
  else return false
}

exports.getContratTypeByCompanyId = async (company_id) => {
  const result = await db.query(
    'SELECT gpc.contracttype_id, ct.name, gpc.totalcontribution, gpc.companycontribution ' +
    'FROM `contracttype` ct, `guarantee_pack_contracttype` gpc, `guarantee_pack` gp, `company_guarantee_assoc` cga ' +
    'WHERE ct.contracttype_id=gpc.contracttype_id AND gpc.guarantee_pack_id=gp.guarantee_pack_id AND gp.guarantee_pack_id=cga.guarantee_pack_id AND ' +
    'cga.company_id=? ORDER BY ct.name ASC',
    [company_id],
  )
  if (result.length > 0) return result
  else return false
}

exports.getCompanyBarometer = async (user_id, company_id) => {
  const result = await db.query(
    'SELECT c.name, c.barometeresvalue, c.totalpaid, c.totalspend ' +
    'FROM `company` c, `useraccess` ua WHERE c.company_id=ua.company_id ' +
    'AND ua.user_id=? AND c.company_id=?',
    [user_id, company_id],
  )
  if (result.length > 0) return result[0]
  else return false
}

exports.getCompanyLiveByCompanyId = async (company_id, idstart, nbresults) => {
  try {
    const result = await db.query(
      'SELECT  e.event_id, e.eventtype_id, et.name as typename, et.description as typedesc, e.message, ' +
      'e.date_creation, e.date_updated, e.params, es.eventstatus_id, es.name as eventname, es.description as eventdesc, us.userstatus_id, ' +
      'us.name as userstatus_name, us.description as userstatus_desc ' +
      'FROM `event` e, `eventstatus` es, `eventtype` et,`userstatus` us ' +
      'WHERE e.company_id=? ' +
      'AND et.RHview=1 ' +
      'AND e.eventstatus_id=es.eventstatus_id AND e.eventtype_id=et.eventtype_id ' +
      'AND e.userstatus_id=us.userstatus_id ' +
      'ORDER BY e.date_creation DESC LIMIT ?,?',
      [company_id, idstart, nbresults],
    )
    if (result.length > 0) return result
    else return false
  } catch (e) {
    console.log(e)
  }
}

exports.getCompaniesList = async (
  name,
  siret,
  insertId,
  ccn_id,
  insurer,
  effectif,
  age_id,
  companypourcent,
  struct_tarif_id,
) => {
  try {
    const result = await db.query(
      'SELECT c.company_id, c.name, c.date_creation, c.siret,  ' +
      ' cs.name as status_name, cs.description as status_description, cs.color as status_color, ' +
      ' c.barometeresvalue, cc.name as ccn_name, a.road_1, a.postcode, a.city, a.phone, a.email, ' +
      '(SELECT COUNT(message_id) FROM message WHERE messagestatus_id=? AND company_id=c.company_id) as nbmessages, ' +
      '(SELECT COUNT(u.user_id) FROM `user` u, `useraccess` ua WHERE u.user_id=ua.user_id AND userstatus_id=? AND ua.accesstype_id=? AND ua.company_id=c.company_id) as nbusers ' +
      'FROM `company` c, `companystatus` cs, `ccn` cc, `address` a  ' +
      'WHERE c.companystatus_id=cs.companystatus_id AND c.ccn_id=cc.ccn_id AND c.address_id=a.address_id ' +
      'ORDER BY c.name ASC',
      [
        config.messagestatus_id_unreaded,
        config.userstatus_validated,
        config.useraccess_main,
      ],
    )
    if (result.length > 0) return result
    else return false
  } catch (e) {
    console.log(e)
  }
}

exports.getCompanyAccessByUserId = async (user_id) => {
  try {
    const company = await db.query('SELECT c.company_id, c.name, c.isadmin, a.name as type, a.description, c.companystatus_id FROM `company` c, `useraccess` ua , `accesstype` a ' +
      'WHERE c.company_id=ua.company_id AND ua.user_id=? AND ua.accesstype_id=a.accesstype_id ORDER BY ua.accesstype_id ASC', user_id);
    if (company.length == 0) return false;
    else return company;
  } catch (e) {
    console.log(e)
  }
}

exports.updateCompanyByCompany_id = async (
  company_id,
  name,
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
) => {
  try {
    updateAddress(address_id, address_info)

    var company = {
      company_id: company_id,
      name: name,
      companystatus_id: companystatus_id,
      siret: siret,
      address_id: address_id,
      ccn_id: ccn_id,
      old_insurer: old_insurer,
      effectif: effectif,
      pricing_age_id: pricing_age_id,
      companypourcent: companypourcent,
      pricing_struct_tarif_id: pricing_struct_tarif_id,
    }

    const result = await db.query('UPDATE `company` SET ? WHERE company_id=?', [
      company,
      company_id,
    ])
    //console.log(result);
    if (result.affectedRows) return result.affectedRows
    else return false
  } catch (e) {
    console.log(e)
  }
}


exports.updateCompanyByCompany_id2 = async (company_id, data) => {
  try {
    const result = await db.query('UPDATE `company` SET ? WHERE company_id=?', [data, company_id]);
    //console.log(result);
    if (result.affectedRows) return result.affectedRows
    else return false
  } catch (e) {
    console.log(e)
  }
}

exports.saveCompany = async (
  name,
  siret,
  address_id,
  ccn_id,
  insurer,
  effectif,
  age_id,
  companypourcent,
  struct_tarif_id,
) => {
  try {
    const result = await db.query(
      'INSERT INTO `company` (`name`, `siret`, `address_id`, `ccn_id`, `old_insurer`, `effectif`, `pricing_age_id`, `companypourcent`, `pricing_struct_tarif_id`) ' +
      'VALUES (?);',
      [
        [
          name,
          siret,
          address_id,
          ccn_id,
          insurer,
          effectif,
          age_id,
          companypourcent,
          struct_tarif_id,
        ],
      ],
    )
    //console.log(result);
    if (result.insertId) return result.insertId
    else return false
  } catch (e) {
    console.log(e)
  }
}

exports.findCompanyById = async (company_id) => {
  try {
    return await db.query(
      'SELECT c.company_id, c.name, c.date_creation, c.siret,  ' +
      ' cs.name as status_name, cs.description as status_description, cs.color as status_color, ' +
      ' c.barometeresvalue, cc.name as ccn_name, a.road_1, a.postcode, a.city, a.phone, a.email, ' +
      '(SELECT COUNT(message_id) FROM message WHERE messagestatus_id=? AND company_id=c.company_id) as nbmessages, ' +
      '(SELECT COUNT(u.user_id) FROM `user` u, `useraccess` ua WHERE u.user_id=ua.user_id AND userstatus_id=? AND ua.accesstype_id=? AND ua.company_id=c.company_id) as nbusers ' +
      'FROM `company` c, `companystatus` cs, `ccn` cc, `address` a  ' +
      'WHERE c.companystatus_id=cs.companystatus_id AND  c.company_id=? AND c.ccn_id=cc.ccn_id AND c.address_id=a.address_id ' +
      'ORDER BY c.name ASC',
      [
        config.messagestatus_id_unreaded,
        config.userstatus_validated,
        config.useraccess_main,
        company_id,
      ],
    )
  } catch (e) {
    console.log(e)
  }
}

exports.getCompanyByCompanyId = async (company_id) => {
  var result = await db.query(
    'SELECT * FROM `company` WHERE `company_id` = ?',
    company_id,
  )
  return (result.length > 0 ? result[0] : false)
  try {
  } catch (e) {
    next(e)
  }
}

exports.getCompanyStatusByCompanyId = async (company_id) => {
  var result = await db.query(
    'SELECT cs.companystatus_id, cs.name, cs.color, cs.description FROM `company` c, `companystatus` cs WHERE c.company_id = ? AND c.companystatus_id=cs.companystatus_id ',
    [company_id]
  )
  return (result.length > 0 ? result[0] : false)
  try {
  } catch (e) {
    next(e)
  }
}

exports.fetchCompanyStatus = async () => {
  try {
    return await db.query('SELECT * FROM `companystatus`')
  } catch (error) {
    console.log(error)
  }
}

exports.updateStatusCopmnay = async (company) => {
  let companystatus_id
  switch (company.status) {
    case 'pending':
      companystatus_id = 1
      break
    case 'validate':
      companystatus_id = 2
      break
    case 'banned':
      companystatus_id = 3
      break
    case 'waiting':
      companystatus_id = 4
      break
  }

  try {
    return await db.query(
      'UPDATE `company` SET companystatus_id = ? WHERE company_id=?',
      [companystatus_id, company.company_id],
    )
  } catch (error) {
    console.log(error)
  }
}

exports.getCompaniesListByUserId = async (user_id) => {
  return await db.query(
    'SELECT s.company_id, c.name, c.date_creation, c.siret,  ' +
    ' cs.name as status_name, cs.description as status_description, cs.color as status_color, ' +
    ' c.barometeresvalue, cc.name as ccn_name, a.road_1, a.postcode, a.city, a.phone, a.email, ' +
    '(SELECT COUNT(message_id) FROM message WHERE messagestatus_id=? AND company_id=c.company_id) as nbmessages, ' +
    '(SELECT COUNT(u.user_id) FROM `user` u, `useraccess` ua WHERE u.user_id=ua.user_id AND userstatus_id=? AND ua.accesstype_id=? AND ua.company_id=c.company_id) as nbusers ' +
    'FROM `useraccess` s, `companystatus` cs, `ccn` cc, `address` a , `company` c ' +
    'WHERE s.company_id = c.company_id AND  c.companystatus_id=cs.companystatus_id  AND c.ccn_id=cc.ccn_id AND c.address_id=a.address_id AND s.accesstype_id=1  AND  user_id = ? ' +
    'ORDER BY c.name ASC',
    [
      config.messagestatus_id_unreaded,
      config.userstatus_validated,
      config.useraccess_main,
      user_id,
    ],
  )
}
