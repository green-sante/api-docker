const {
  insertPack,
  UpdatetPack,
  DeletePack,
  getGarantiesByGuaranteePackById,
  findAllGuaranteeActivity,
  SaveGuaranteeActivity,
  FindGuaranteeActivityById,
  UpdateGuaranteeActivity,
  DeleteGuaranteeActivity,
  FindAllGuaranteCategory,
  FindGuaranteCategoryByActivityId,
  UpdateGuaranteCategory,
  UpdateGuaranteCategoryByActivityId,
  FindAllGaranties,
  SaveGuaranteeValue,
  getAllGaranteePack,
  SaveGuaranteeCategory,
  FindGuaranteeCategoryById,
  SaveGuarante,
  FindGuaranteById,
  findPackById,
  getGaranteeValueByGuaranteeId,
} = require('../queries/guarantee.queries')
const Utils = require('../Utils.js')
const Email = require('../Emails.js')
var config = require('../config') // get our config file
const Guarantee = require('../Guarantee.js')
const { query } = require('express')

exports.getGuaranteeValue = async (req, res, next) => {
  try {
    if (!req.decoded.isadmin) return Utils.mwarn(res, req, 'Admin private')

    var guarantee_id = req.params.guarantee_id || null
    if (!guarantee_id) {
      return Utils.mwarn(res, req, 'Need to specify a guarantee_id')
    }

    const rows = await getGaranteeValueByGuaranteeId(guarantee_id)

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

exports.getGuaranteePack = async (req, res, next) => {
  try {
    if (!req.decoded.isadmin) {
      return Utils.mwarn(res, req, 'Admin private')
    }

    const rows = await getAllGaranteePack()

    var resarray = []
    for (var k in rows) {
      //mlog(rows);
      resarray.push({
        guarantee_pack_id: rows[k].guarantee_pack_id,
        name: rows[k].name,
        description: rows[k].description,
      })
    }
    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        guarantee_pack: resarray,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.getGuaranteePackInfos = async (req, res, next) => {
  try {
    if (!req.decoded.isadmin) return Utils.mwarn(res, req, 'Admin private')

    var guarantee_pack_id = parseInt(req.params.guarantee_pack_id) || null
    if (
      !guarantee_pack_id ||
      !Number.isInteger(guarantee_pack_id) ||
      guarantee_pack_id == 0
    )
      return Utils.mwarn(res, req, 'guarantee_pack_id is required')

    const rows = await getGarantiesByGuaranteePackById(
      guarantee_pack_id,
      req.query.search,
      req.query.maxresults,
    )
    console.log(rows)
    const activities = await Guarantee.orderGarantiesByActivities(rows)

    res.status(200).json({
      action: req.url,
      method: req.method,
      token: newtoken,
      data: {
        packname: rows ? rows[0].packname : null,
        packdesc: rows ? rows[0].packdesc : null,
        activities: activities,
      },
    })
  } catch (e) {
    next(e)
  }
}

exports.savePack = async (req, res, next) => {
  try {
    const newpack = await insertPack(req.body)
    const pack = await findPackById(newpack.insertId)

    res.status(200).json({
      action: req.url,
      method: req.method,
      pack: pack,
    })
  } catch (e) {
    console.log(e)
  }
}

exports.updatePack = async (req, res, next) => {
  try {
    const pack = await UpdatetPack(req.params.guarantee_pack_id, req.body)

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: 'pack update successfully',
    })
  } catch (e) {
    console.log(e)
  }
}

exports.deletePack = async (req, res, next) => {
  try {
    const pack = await DeletePack(req.params.guarantee_pack_id)

    res.status(200).json({
      action: req.url,
      method: req.method,
      message: 'pack delete successfully',
    })
  } catch (e) {
    console.log(e)
  }
}

exports.findGuaranteeActivity = async (req, res, next) => {
  try {
    const activities = await findAllGuaranteeActivity()

    res.status(200).json({
      action: req.url,
      method: req.method,
      activities: activities,
    })
  } catch (e) {
    next(e)
  }
}

exports.saveGuaranteeActivity = async (req, res, next) => {
  try {
    const saveActivitie = await SaveGuaranteeActivity(req.body)
    const guaranteeActivitie = await FindGuaranteeActivityById(
      saveActivitie.insertId,
    )
    res.status(200).json({
      action: req.url,
      method: req.method,
      guaranteeActivitie: guaranteeActivitie,
    })
  } catch (e) {
    next(e)
  }
}

exports.updateGuaranteeActivity = async (req, res, next) => {
  try {
    const updateActivitie = await UpdateGuaranteeActivity(
      req.body,
      req.params.guarantee_activity_id,
    )
    const guaranteeActivitie = await FindGuaranteeActivityById(
      req.params.guarantee_activity_id,
    )

    res.status(200).json({
      action: req.url,
      method: req.method,
      guaranteeActivitie: guaranteeActivitie,
    })
  } catch (e) {
    next(e)
  }
}

exports.deleteGuaranteeActivity = async (req, res, next) => {
  try {
    const deleteActivitie = await DeleteGuaranteeActivity(
      req.params.guarantee_activity_id,
    )
    res.status(200).json({
      action: req.url,
      method: req.method,
      guaranteeActivitie: deleteActivitie,
    })
  } catch (e) {
    next(e)
  }
}

exports.findAllGuaranteCategory = async (req, res, next) => {
  try {
    const guarantee_activity_id = req.query.guarantee_activity_id
    const categories = await FindAllGuaranteCategory(guarantee_activity_id)

    res.status(200).json({
      action: req.url,
      method: req.method,
      categories: categories,
    })
  } catch (e) {
    next(e)
  }
}

exports.saveGuaranteCategory = async (req, res, next) => {
  try {
    const body = req.body
    const guarantee_activity_id = req.query.guarantee_activity_id
    const newCategorie = await SaveGuaranteeCategory(
      body,
      guarantee_activity_id,
    )
    const categorie = await FindGuaranteeCategoryById(newCategorie.insertId)

    res.status(200).json({
      action: req.url,
      method: req.method,
      categorie: categorie,
    })
  } catch (e) {
    next(e)
  }
}

exports.updateGuaranteCategory = async (req, res, next) => {
  try {
    const categorie = await UpdateGuaranteCategory(
      req.body,
      req.params.guarantee_category_id,
    )
    res.status(200).json({
      action: req.url,
      method: req.method,
      categories: categorie,
    })
  } catch (e) {
    next(e)
  }
}

exports.findGuaranteCategoryByActivityId = async (req, res, next) => {
  try {
    const categories = await FindGuaranteCategoryByActivityId(
      req.params.guarantee_activity_id,
    )

    res.status(200).json({
      action: req.url,
      method: req.method,
      categories: categories,
    })
  } catch (e) {
    next(e)
  }
}

exports.updateGuaranteCategoryByActivityId = async (req, res, next) => {
  try {
    const guarantee_activity_id = req.params.guarantee_activity_id
    const guarantee_category_id = req.query.guarantee_category_id
    console.log(guarantee_category_id)

    const categorie = await UpdateGuaranteCategoryByActivityId(
      guarantee_activity_id,
      guarantee_category_id,
    )

    res.status(200).json({
      action: req.url,
      method: req.method,
      categorie: categorie,
    })
  } catch (e) {
    next(e)
  }
}

exports.findAllGuarantes = async (req, res, next) => {
  const guarantee_activity_id = req.query.guarantee_activity_id
  const guarantee_category_id = req.query.guarantee_category_id

  try {
    const garanties = await FindAllGaranties(
      guarantee_activity_id,
      guarantee_category_id,
    )

    res.status(200).json({
      action: req.url,
      method: req.method,
      garanties: garanties,
    })
  } catch (e) {
    next(e)
  }
}
exports.saveGuarante = async (req, res, next) => {
  try {
    const guarantee_activity_id = req.query.guarantee_activity_id
    const guarantee_category_id = req.query.guarantee_category_id

    const body = req.body
    const newGarantie = await SaveGuarante(
      body,
      guarantee_activity_id,
      guarantee_category_id,
    )
    const garantie = await FindGuaranteById(newGarantie.insertId)

    res.status(200).json({
      action: req.url,
      method: req.method,
      garantie: garantie,
    })
  } catch (e) {
    next(e)
  }
}

exports.saveGuaranteeValue = async (req, res, next) => {
  const body = req.body
  try {
    const garantieValue = await SaveGuaranteeValue(body)

    res.status(200).json({
      action: req.url,
      method: req.method,
      garanties: garantieValue,
    })
  } catch (e) {
    next(e)
  }
}


