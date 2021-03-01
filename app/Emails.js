var dustfs = require('dustfs'); // Moteur de templates
const nodemailer = require('nodemailer');
dustfs.dirs(__dirname + '/content/emails'); // Read templates from this directory

// =======================
// EMAIL CONF =========
// =======================
let smtpConfig = {
	host: 'mail.gandi.net',
	//port: 587,
	port: 465,
	secure: true, // upgrade later with STARTTLS
	auth: {
		user: 'smtp@green-sante.fr',
		pass: 'gf8jdmMerap**fsdAMNF'
	},
	tls: {
		// do not fail on invalid certs
		rejectUnauthorized: false
	}
};

var transporter = nodemailer.createTransport(smtpConfig);
// verify connection configuration
transporter.verify(function(error, success) {
	if (error) {
		console.log(error);
		//send_error_email("ERROR Connection impossible sur le serveur SMTP\n"+error);
	} else {
		console.log('Server SMTP is ready to take our emails');
	}
});

module.exports = {
	send_error_email: function(data) {
		send_template_email('email_error.dust', {
			email: 'raphael@green-sante.fr',
			subject: '[Green Santé] Error serveur Nodejs à traiter',
			data: data
		});
	},
	send_template_email: function(template, values) {
		console.log('SENDEMAIL==> Template: ' + template + ' - Email: ' + values.email);
		dustfs.render(template, values, function(err, out, email) {
			if (err) {
				console.log('Error DUSTFS Render: ' + err);
				send_error_email('Error DUSTFS Render\n' + err);
			} else {
				console.log(values);
				var mailOptions = {
					from: values.from || 'app@green-sante.fr',
					to: values.email || 'noreply@green-sante.fr',
					//bcc: 'contact@green-sante.fr,'+values.email_notifications,
					bcc: values.email_notifications,
					subject: values.subject,
					html: out,
					attachments: [
						{
							filename: 'email.png',
							path: __dirname + '/content/emails/images/email.png',
							cid: 'email' //same cid value as in the html img src
						},
						{
							filename: 'facebook.png',
							path: __dirname + '/content/emails/images/facebook.png',
							cid: 'facebook' //same cid value as in the html img src
						},
						{
							filename: 'twitter.png',
							path: __dirname + '/content/emails/images/twitter.png',
							cid: 'twitter' //same cid value as in the html img src
						},
						{
							filename: 'Green_Sante_logo_mail.png',
							path: __dirname + '/content/emails/images/Green_Sante_logo_mail.png',
							cid: 'greensante' //same cid value as in the html img src
						}
					]
				};

				transporter.sendMail(mailOptions, function(error, info) {
					if (error) {
						console.log('Error sending emails:' + error);
						//send_error_email("Error sending emails\n"+error);
					} else {
						console.log('Email sent: ' + info.response);
					}
				});
			}
		});
	}
};
