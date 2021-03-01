const { mysql, db } = require('../Mysql')
var config = require('../config')
const { query } = require('express')

//functions
const verificationEmailExist = async (email) => {
  try {
    let result
    const emails = await db.query('select * from email')
    const email_message_ids = emails.map((item) => item.email_message_id)

    result = email_message_ids.includes(email.id)
    return result
  } catch (error) {
    console.log(error)
  }
}

// quiers
exports.saveEmail = async (email) => {
  const emailIncludeBD = await verificationEmailExist(email)
  try {
    if (!emailIncludeBD) {
      await db.query(
        'INSERT INTO `email` (`email_message_id`,`from`,`to`, `emailstatus_id`,date,subject,message) ' +
          'VALUES (?,?, ?, ?,?,?,?);',
        [
          email.id,
          email.from,
          email.to,
          1,
          new Date(email.date),
          email.subject,
          email.message,
        ],
      )
    }
  } catch (e) {
    console.log(e.message)
  }
}

exports.fetchEmails = async (status) => {
  let emails
  try {
    if (status) {
      return (emails = await db.query(
        'SELECT * FROM email INNER JOIN emailstatus on email.emailstatus_id = emailstatus.emailstatus_id where name=? ',
        status,
      ))
    } else {
      return (emails = await db.query(
        'SELECT * FROM email INNER JOIN emailstatus on email.emailstatus_id = emailstatus.emailstatus_id ',
      ))
    }
  } catch (error) {
    console.log(error)
  }
}

exports.updateStatus = async (id) => {
  let emaile
  try {
    if (id) {
      emaile = await db.query(
        'UPDATE `email` SET `emailstatus_id` =?  WHERE`email_id`=?',
        [2, id],
      )
    }
    return emaile
  } catch (error) {
    console.log(error)
  }
}

exports.findEmailById = async (id) => {
  try {
    return await db.query(
      'SELECT * FROM `email` INNER JOIN emailstatus on email.emailstatus_id = emailstatus.emailstatus_id where email_id=?',
      id,
    )
  } catch (error) {
    console.log(error)
  }
}
