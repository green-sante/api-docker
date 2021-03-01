const nodemailer = require('nodemailer');
const config = require('../config.js');
const _ = require('lodash');
const { saveEmail, fetchEmails, updateStatus, findEmailById } = require('../queries/email.queries');

//functions

exports.send = async (email) => {
	console.log(config.nodemailer.host);
	try {
		let transporter = nodemailer.createTransport({
			host: config.nodemailer.host,
			port: config.nodemailer.port,
			secure: config.nodemailer.secure, // true for 465, false for other ports
			auth: {
				user: config.nodemailer.auth.user,
				pass: config.nodemailer.auth.pass
			}
		});
		let info = await transporter.sendMail({
			from: email.from, // sender address
			to: email.Destinataire, // list of receivers
			subject: email.subject, // Subject line
			text: email.message, // plain text body
			html: `<h3><pre>${email.message}</pre></h3>` // html body
		});

		return info;
	} catch (error) {
		console.log(error);
	}
};

exports.structurEmails = async (emails) => {
	const resultat = emails.map((item) => {
		let acc = {};

		const HEADER = _.find(item.parts, { which: 'HEADER' });
		const TEXT = _.find(item.parts, { which: 'TEXT' });
		const subject = HEADER.body.subject[0];
		const from = HEADER.body.from[0];
		const to = HEADER.body.to[0];
		const date = HEADER.body.date[0];
		const message = TEXT.body;
		const status = item.attributes.flags[0];
		const id = item.attributes.uid;
		const references = HEADER.body.references;
		const message_id = HEADER.body['message-id'][0];

		const start = message.indexOf('quoted-printable');
		const end = message.lastIndexOf('\nContent-Type:');
		const res1 = message.substring(start + 16, end);
		const res = res1.substring(0, res1.lastIndexOf('\n'));

		acc['id'] = id;
		acc['message-id'] = message_id;
		acc['subject'] = subject;
		acc['message'] = res;
		acc['from'] = from;
		acc['to'] = to;
		acc['date'] = date;
		acc['references'] = references ? references : '';
		acc['status'] = status;
		// === '\\Seen' ? 'vu' : 'non vu'

		return acc;
	});

	return resultat;
};

exports.insertEmailsBD = async (emails) => {
	try {
		emails.forEach((email) => {
			saveEmail(email);
		});
	} catch (error) {
		console.log(error);
	}
};

exports.fetchEmailsBD = async (status) => {
	try {
		const emails = await fetchEmails(status);
		return emails;
	} catch (error) {
		console.log(error);
	}
};

exports.filitreKeyEmails = async (emails) => {
	const resultat = emails.map((email) => {
		let acc = {};
		acc['id'] = email.email_id;
		acc['email_message_id'] = email.email_message_id;
		acc['from'] = email.from;
		acc['to'] = email.to;
		acc['date'] = email.date;
		acc['subject'] = email.subject;
		acc['message'] = email.message;
		acc['status'] = email.name;

		return acc;
	});

	return resultat;
};
/**
 * recupere l'id d'email que on doit repondre de body
 * trouver l'email dans le base de donneé
 * changer le status
 * envoyer la novelle email au front
 */
exports.updateEmailStatus = async (id) => {
	try {
		await updateStatus(id);
		const email = await findEmailById(id);
		return email;
	} catch (error) {
		console.log(error);
	}
};

// const Emailsresponses = emails.map((email) => {
//   if (email.references[0] != undefined) {
//     emails.map((e) => {
//       if (email.references[0].slice(0, 68) === e['message-id']) {
//         email['reponses'] = [e]
//       }
//     })
//   }
//   return email
// })

// objects

exports.configImap = {
	imap: {
		user: config.user,
		password: config.password,
		host: config.host,
		port: config.port,
		tls: config.tls,
		authTimeout: config.authTimeout
	}
};

exports.searchCriteria = [ 'ALL' ];

exports.fetchOptions = {
	bodies: [ 'HEADER', 'TEXT' ],
	markSeen: false
};
