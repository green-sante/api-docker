module.exports = {
	//////////////////// MODE /////////////////////
	automatic_registration_back_access: false, //
	//////////////// SERVER CONF /////////////////
	hostname: '0.0.0.0',
	port_http: '3000', // 0 if you want turn off http
	port_https: '0', // 0 if you want turn off https
	dbmysql: {
		//////////////// DATABASE MYSQL //////////////
		host: 'bdd.green-sante.com',
		user: 'app2-green',
		password: 'Z4BrjnbzY9n7M33O',
		database: 'app2-green'
	},
	//////////////// OVH TELECOM SMS ////////////////
	ovhtelecom_login: 'greensante',
	ovhtelecom_password: 'kjdj42d6',
	ovhtelecom: {
		ScriptName: 'greensanteSMS',
		ApplicationKey: '3QpEzG3681OCwyLH',
		ApplicationSecret: 'kT8bX18g79mM45XZMGZaCPQjDla35l8u',
		//"ConsumerKey": "wXzXNC2WqgF6zTiprI082sEEtFavX5IP",
		ConsumerKey: 'vQziGET0pPVOdBgEM8FduDXUPE9ktDuV'
	},
	//////////////// IGA CONNECTION /////////////////
	IGAapi: 'http://sigmav2-recettefeatures.iga-tunisie.com:3333',
	//'IGAapi': 'https://sigmav2-recettefeatures.iga-tunisie.com',
	//////////////// TOKEN AUTHENTICATION ///////////
	secret: 'pnKdFdMfbs87ndPmfrfgnujJJdabghpnKdFdMSEBASbvgh',
	token_days_validity: '100', // nombre de jours pendant lequel le token reste valide
	//////////////// VARIABLE //////////////
	//'year_old_major': 18,
	mail_to_send_over50: 'raphael@green-sante.fr',
	mail_to_send_notifications: 'raphael@green-sante.fr',
	mail_to_send_gestionnaire: 'gestionnaire@green-sante.com',
	nb_results_by_page: 10,
	nb_guarantee_by_page: 10,
	crypto_algorithm: 'aes-256-ctr',
	crypto_ENCRYPTION_KEY: Buffer.from('FoCKMdLulvuB4y3EZlKate8XGottHski1LmyqJHvUhs=', 'base64'),
	crypto_IV_LENGTH: 16,
	url_api_SIREN: 'https://api.insee.fr/entreprises/sirene/V3/siren/',
	url_api_SIRET: 'https://api.insee.fr/entreprises/sirene/V3/siret/',
	token_api_SIREN: 'Bearer ec4cd64e-24e9-39da-9901-bd126a466818', //'Bearer fd633d76-3763-36d7-ad77-083880033c71',
	url_api_CCN: 'https://siret2idcc.fabrique.social.gouv.fr/api/v2/',
	//'pdf_carteTP_model': "GREENSANTE_test1.pdf",
	pdf_carteTP_model: 'test22.pdf',
	//////////////// PATH / URL //////////////
	basedir: '/var/opt/apiback.green-sante.fr',
	www_root: 'https://www.green-sante.com/',
	www_rootback: 'https://back.green-sante.com/',
	www_rootwebapp: 'https://webapp.green-sante.com/',
	www_rootentreprise: 'https://entreprise.green-sante.fr/',
	www_filedirectory: '/var/www/files.green-sante.com/',
	www_filepath: 'https://files.green-sante.com/',
	entreprise_upload_dir: '/var/www/entreprise.green-sante.fr/uploads',
	www_webapp: 'https://webapp.green-sante.fr/',
	pdf_path: 'content/pdf',
	//////////////// BDD EVENTYPE //////////
	event_subscription_id: 2,
	event_medicalact_id: 3,
	event_askhospital_id: 4,
	event_addrecipient_id: 5, // Ajout d'un nouveau bénéficiaire
	event_newrecipient_id: 16, // Création d'un compte pour un beneficiaire
	eventstatus_processed_id: 1, // en cours de traitement
	userstatus_recipient_id: 9,
	userstatus_registration: 12, // user status when registration
	userstatus_validated: 5, // utilisateur validé
	topquestion_user_enable: 1,
	topquestion_company_enable: 2,
	news_user_enable: 1,
	news_company_enable: 2,
	useraccess_main: 1, // accès mutuelle de l'utilisateur
	useraccess_company: 3, // accès adminsitration mutuelle entreprise pour cet utilisateur
	messagestatus_id_unreaded: 1, // Statut de message non lue
	guarantee_pack_id_default: 5,
	company_status_id_pending: 1, // statut pending par defaut
	filetype_id_KBIS: 6,
	filetype_id_Carte_Vitale: 7,
	filetype_id_CNI_recto: 8,
	filetype_id_CNI_verso: 9,
	filetype_id_RIB: 10,
	filetype_id_AttestationDroit: 11,
	//////////////// IGA VARS ///////////////
	IGA_idCourtier: 2105,
	IGA_typeSaisie: 'Collective',
	IGA_DefaultCountry: 1, // FRANCE
	IGA_defaultDevise: 1, // €uro
	IGA_defaultZone: 1, //(valeur par défaut pour la zone France)
	IGA_default_language: 'fr',
	IGA_company_create_default_garantie_added: [ 1149, 1150 ],
	IGA_company_create_default_IdRegime: '200', // (valeur par défaut pour les régimes domestiques)
	IGA_company_create_default_IdTypeRegime: 3, // (valeur par défaut régime non unique puisque le type de marché est domestique)
	IGA_company_create_default_IdUser: 380, // valeur par défaut pour identifier les souscriptions souscrites à partir de green santé (elle peut être modifiée lors de mise en place en prod)
	IGA_post_GetFraisMedicauxBySearchCriteria_listeDecomptes: 1,
	IGA_post_GetFraisMedicauxBySearchCriteria_Take: 1000,
	//////////////// IMAP-CONFIG //////////
	user: 'IGA-RETOUR@green-sante.com',
	password: 'IGA-RETOUR42',
	host: 'mail.gandi.net',
	port: 993,
	tls: true,
	authTimeout: 3000,
	//////////////// NODEMAILER_SENDEMAIL //////////
	nodemailer: {
		host: 'mail.gandi.net',
		port: 465,
		secure: true, // true for 465, false for other ports
		auth: {
			user: 'smtp@green-sante.fr',
			pass: 'hd764fdsH$fqfsd('
		}
	}
};
