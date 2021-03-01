var config = require('../config')
const { mysql, db } = require('../Mysql')

exports.getAllGaranteePack = async () => {
  try {
    const result = await db.query(
      'SELECT g.guarantee_pack_id, g.name, g.description FROM `guarantee_pack` g ORDER BY g.weight ASC',
    )
    if (result.length == 0) return false
    else return result
  } catch (e) {
    console.log(e)
  }
}

exports.getGaranteeValueByGuaranteeId = async (guarantee_id) => {
  try {
    if (!guarantee_id) return false
    const result = await db.query(
      'SELECT gpv.txtvalue, gpv.description, gpv.value, gpv.exemple ' +
        'FROM `guarantee_pack_value` gpv WHERE gpv.guarantee_id=? ' +
        'ORDER BY gpv.weight ASC',
      [guarantee_id],
    )
    if (result.length == 0) return false
    else return result
  } catch (e) {
    console.log(e)
  }
}

exports.getGaranteePackById = async (guarantee_pack_id) => {
  try {
    if (!guarantee_pack_id) return false
    const result = await db.query(
      'SELECT guarantee_pack_id, name as guarantee_pack_name, description as guarantee_pack_description, gp.img as guarantee_pack_img FROM guarantee_pack gp WHERE gp.guarantee_pack_id = ?',
      [guarantee_pack_id],
    )
    if (result.length == 0) return false
    else return result[0]
  } catch (e) {
    console.log(e)
  }
}

exports.getGarantiesByGuaranteePackById = async (
  guarantee_pack_id,
  search,
  maxresults,
) => {
  try {
    if (!guarantee_pack_id) return false

    if (search)
      search =
        " AND (g.name LIKE '%" +
        req.query.search +
        "%' OR ga.name LIKE '%" +
        req.query.search +
        "%') "
    else search = ''
    if (maxresults) maxresults = ' LIMIT 0,' + req.query.maxresults
    else maxresults = ''

    console.log(
      mysql.format(
        'SELECT DISTINCT g.name as guarantee_name, g.guarantee_id, ga.name as activity_name, ga.guarantee_activity_id, ga.description, \
    (SELECT gc.name FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_name, \
    (SELECT gc.description FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_desc, \
    g.guarantee_category_id, g.img, g.url, g.description, gp.name as packname, \
    gp.description as packdesc \
    FROM `guarantee` g, `guarantee_activity` ga, `guarantee_pack_value` gpv, `guarantee_pack` gp, `user` u   \
    WHERE gp.guarantee_pack_id=? \
    AND gp.guarantee_pack_id=gpv.guarantee_pack_id AND g.guarantee_id=gpv.guarantee_id \
    AND g.guarantee_activity_id=ga.guarantee_activity_id \
    AND gpv.enable=1 ' +
          search +
          'ORDER BY ga.guarantee_activity_id ASC, g.guarantee_category_id ASC, g.weight ASC, gpv.weight ASC ' +
          maxresults,
        [guarantee_pack_id],
      ),
    )

    const result = await db.query(
      'SELECT DISTINCT g.name as guarantee_name, g.guarantee_id, ga.name as activity_name, ga.guarantee_activity_id, ga.description, \
        (SELECT gc.name FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_name, \
        (SELECT gc.description FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_desc, \
        g.guarantee_category_id, g.img, g.url, g.description, gp.name as packname, \
        gp.description as packdesc \
        FROM `guarantee` g, `guarantee_activity` ga, `guarantee_pack_value` gpv, `guarantee_pack` gp, `user` u   \
        WHERE gp.guarantee_pack_id=? \
        AND gp.guarantee_pack_id=gpv.guarantee_pack_id AND g.guarantee_id=gpv.guarantee_id \
        AND g.guarantee_activity_id=ga.guarantee_activity_id \
        AND gpv.enable=1 ' +
        search +
        'ORDER BY ga.guarantee_activity_id ASC, g.guarantee_category_id ASC, g.weight ASC, gpv.weight ASC ' +
        maxresults,
      [guarantee_pack_id],
    )
    if (result.length == 0) return false
    else return result
  } catch (e) {
    console.log(e)
  }
}

exports.insertPack = async (pack) => {
  try {
    return await db.query(
      'INSERT INTO `guarantee_pack` (`name`,`description`, `weight`) ' +
        'VALUES (?, ?, ?);',
      [pack.name, pack.description, pack.weight],
    )
  } catch (e) {
    console.log(e)
  }
}

exports.findPackById = async (guarantee_pack_id) => {
  try {
    return await db.query(
      'select * from `guarantee_pack` where `guarantee_pack_id`=? ',
      guarantee_pack_id,
    )
  } catch (e) {
    console.log(e)
  }
}

exports.UpdatetPack = async (guarantee_pack_id, body) => {
  try {
    return await db.query(
      'UPDATE `guarantee_pack` SET name=? ,description=? ,weight=? WHERE guarantee_pack_id=?',
      [body.name, body.description, body.weight, guarantee_pack_id],
    )
  } catch (e) {
    console.log(e)
  }
}

exports.DeletePack = async (guarantee_pack_id) => {
  try {
    return await db.query(
      'DELETE FROM `guarantee_pack` WHERE guarantee_pack_id=?',
      guarantee_pack_id,
    )
  } catch (e) {
    console.log(e)
  }
}

exports.SaveGuarante = async (
  garantie,
  guarantee_activity_id,
  guarantee_category_id,
) => {
  try {
    return await db.query(
      'INSERT INTO `guarantee`(`name`,`guarantee_activity_id`,`guarantee_category_id`)' +
        'VALUES (?,?,?);',
      [garantie.name, guarantee_activity_id, guarantee_category_id],
    )
  } catch (e) {
    console.log(e)
  }
}

exports.FindGuaranteById = async (guarantee_id) => {
  try {
    return await db.query(
      'SELECT * FROM `guarantee` WHERE guarantee_id=?',
      guarantee_id,
    )
  } catch (e) {
    console.log(e)
  }
}

exports.findAllGuaranteeActivity = async () => {
  try {
    return await db.query('SELECT * FROM `guarantee_activity`')
  } catch (e) {
    console.log(e)
  }
}

exports.FindGuaranteeActivityById = async (guarantee_activity_id) => {
  try {
    return await db.query(
      'SELECT * FROM `guarantee_activity` WHERE guarantee_activity_id=?',
      guarantee_activity_id,
    )
  } catch (e) {
    console.log(e)
  }
}

exports.SaveGuaranteeActivity = async (guaranteeActivity) => {
  try {
    return await db.query(
      'INSERT INTO `guarantee_activity` (`name`) ' + 'VALUES (?);',
      [guaranteeActivity.name],
    )
  } catch (e) {
    console.log(e)
  }
}

exports.UpdateGuaranteeActivity = async (
  guaranteeActivitie,
  guarantee_activity_id,
) => {
  try {
    return await db.query(
      'UPDATE `guarantee_activity` SET name=?  WHERE guarantee_activity_id=?',
      [guaranteeActivitie.name, guarantee_activity_id],
    )
  } catch (e) {
    console.log(e)
  }
}

exports.DeleteGuaranteeActivity = async (guarantee_activity_id) => {
  try {
    return await db.query(
      'DELETE FROM `guarantee_activity` WHERE guarantee_activity_id=?',
      guarantee_activity_id,
    )
  } catch (e) {
    console.log(e)
  }
}

exports.FindAllGuaranteCategory = async (guarantee_activity_id) => {
  try {
    if (guarantee_activity_id) {
      return await db.query(
        'SELECT * FROM `guarantee_category` WHERE activity_id=? ',
        guarantee_activity_id,
      )
    } else {
      return await db.query('SELECT * FROM `guarantee_category`')
    }
  } catch (e) {
    console.log(e)
  }
}

exports.FindGuaranteeCategoryById = async (guarantee_category_id) => {
  try {
    return await db.query(
      'SELECT * FROM `guarantee_category` WHERE guarantee_category_id=?',
      guarantee_category_id,
    )
  } catch (e) {
    console.log(e)
  }
}

exports.SaveGuaranteeCategory = async (categorie, guarantee_activity_id) => {
  try {
    return await db.query(
      'INSERT INTO `guarantee_category`(`name`,`activity_id`)' +
        'VALUES (?,?);',
      [categorie.name, guarantee_activity_id],
    )
  } catch (e) {
    console.log(e)
  }
}

exports.UpdateGuaranteCategory = async (categorie, guarantee_category_id) => {
  try {
    return await db.query(
      'UPDATE `guarantee_category` SET name=?  WHERE guarantee_category_id=?',
      [categorie.name, guarantee_category_id],
    )
  } catch (e) {
    console.log(e)
  }
}

exports.FindGuaranteCategoryByActivityId = async (guarantee_activity_id) => {
  try {
    return await db.query(
      'SELECT * FROM `guarantee_category` WHERE activity_id=?',
      guarantee_activity_id,
    )
  } catch (e) {
    console.log(e)
  }
}

exports.UpdateGuaranteCategoryByActivityId = async (
  guarantee_activity_id,
  guarantee_category_id,
) => {
  try {
    return await db.query(
      'UPDATE `guarantee_category` SET name=?  WHERE activity_id=? AND guarantee_category_id=? ',
      [categorie.name, guarantee_activity_id, guarantee_category_id],
    )
  } catch (e) {
    console.log(e)
  }
}

exports.FindAllGaranties = async (
  guarantee_activity_id,
  guarantee_category_id,
) => {
  try {
    if (guarantee_activity_id && guarantee_category_id) {
      return await db.query(
        'SELECT * FROM `guarantee` WHERE guarantee_activity_id=? AND guarantee_category_id=?',
        [guarantee_activity_id, guarantee_category_id],
      )
    } else {
      return await db.query('SELECT * FROM `guarantee`')
    }
  } catch (e) {
    console.log(e)
  }
}

exports.SaveGuaranteeValue = async (garantieValue) => {
  try {
    return await db.query(
      'INSERT INTO `guarantee_pack_value` (`guarantee_pack_id`,`guarantee_id`,`txtvalue`,`description`,`value`,`exemple`) ' +
        'VALUES (?,?,?,?,?,?);',
      [
        garantieValue.guarantee_pack_id,
        garantieValue.guarantee_id,
        garantieValue.txtvalue,
        garantieValue.description,
        garantieValue.value,
        garantieValue.exemple,
      ],
    )
  } catch (e) {
    console.log(e)
  }
}
