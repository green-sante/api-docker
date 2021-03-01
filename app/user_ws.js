////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/DASHBOARD ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/dashboard')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = 'SELECT c.name, c.barometeresvalue, c.totalpaid, c.totalspend '+
			'FROM `company` c, `user` u, `useraccess` ua , `accesstype` a '+
			'WHERE c.company_id=ua.company_id AND ua.user_id=u.user_id '+
			'AND u.user_id='+req.decoded.user_id+' AND a.name="main" '+
			'AND ua.accesstype_id=a.accesstype_id';
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user dashboard: ');
		} else {
			if (rows[0]) {
				var company = rows[0];
				var q = 'SELECT t.topquestion_id, t.subject, t.response '+
						'FROM `topquestion` t '+
						'WHERE '+
						'DATE(NOW()) <= CASE WHEN @t.dateend IS NULL THEN DATE(NOW()) ELSE @t.dateend END AND '+
						'DATE(NOW()) >= CASE WHEN @t.datestart IS NULL THEN DATE(NOW()) ELSE @t.datestart END AND '+
						't.enable='+config.topquestion_user_enable+' '+
						'ORDER BY RAND() '+
						'LIMIT 0,1';
				//mlog(q);
				connection.query(
					q, function(err, rows){
					if(err){
						merror(res, req, err, 'error get_topquestion: ');
					} else {
						var topquestion = rows;
						var q = 'SELECT n.news_id, n.description FROM `news` n WHERE n.news_id NOT IN (SELECT nr.news_id FROM `newsreaded` nr WHERE nr.user_id='+user_id+')  AND n.enable='+config.news_user_enable+' ORDER BY RAND() LIMIT 0,3';
						//mlog(q);
						connection.query(
							q, function(err, rows){
							if(err){
								merror(res, req, err, 'error get news: ');
							} else {
								res.status(200).json({
									action : req.url,
									method : req.method,
									data : {
										companyname : company.name,
										barometeresvalue : company.barometeresvalue,
										totalspend : company.totalspend,
										totalpaid : company.totalpaid,
										chart : [],
										topquestion : (topquestion?topquestion.subject:""),
										topresponse : (topquestion?topquestion.response:""),
										newsinfo : (rows[0]?rows:[])
									}
								});
							}
						});
					}
				});
			}
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = "INSERT INTO `newsreaded` (`user_id`, `news_id`, `date`) VALUES ('"+user_id+"', '"+req.body.newsid+"', NOW()) ON DUPLICATE KEY UPDATE `date`=NOW();";
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error post news readed: ');
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/INFO ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/info')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = 'SELECT  us.userstatus_id as userstatus_id, us.name as userstatus_message, e.date_creation as userstatus_date_start, u.firstname, '+
			'u.lastname, u.user_id, u.ownersecunumber, u.teletransmissionnumber, u.teletransmissionstateid, u.amccode '+
			'FROM `user` u, `userstatus` us , `event` e, `eventtype` et '+
			'WHERE u.user_id='+req.decoded.user_id+' AND u.userstatus_id=us.userstatus_id AND e.user_id=u.user_id '+
			'AND et.eventtype_id=e.eventtype_id AND e.eventtype_id='+config.event_subscription_id+' '+
			'ORDER BY e.date_creation DESC LIMIT 1';
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user info: ');
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				data: {
					userstatus : (rows[0]?rows[0].userstatus_id:""),
					userstatus_message : (rows[0]?rows[0].userstatus_message:""),
					userstatus_date_start : (rows[0]?rows[0].userstatus_date_start:""),
					userstatus_date_end : null, // TODO
					ownerfirstname : (rows[0]?rows[0].firstname:""),
					ownerlastname : (rows[0]?rows[0].lastname:""),
					ownerid : (rows[0]?rows[0].user_id:""),
					ownersecunumber : (rows[0]?rows[0].ownersecunumber:""),
					ownervalidationurl : null, // TODO
					concentrator : null, // TODO
					teletransmissionnumber : (rows[0]?rows[0].teletransmissionnumber:""),
					teletransmissionstateid : (rows[0]?rows[0].teletransmissionstateid:""),
					amccode : (rows[0]?rows[0].amccode:""),
					cardurl : null, // TODO
				}
			});
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var options = "";

	if (req.body.ownerfirstname) 
		options += (options!=""?", ":"")+"`firstname` = '"+req.body.ownerfirstname+"' ";
	if (req.body.ownerlastname) 
		options += (options!=""?", ":"")+"`lastname` = '"+req.body.ownerlastname+"' ";
	if (req.body.ownersecnumber) 
		options += (options!=""?", ":"")+"`ownersecnumber` = '"+req.body.ownersecnumber+"' ";
	
	var q = "UPDATE `user` SET "+ options +" WHERE `user`.`user_id` = "+user_id;
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error update user info: ');
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/ACCESS ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/access')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = 'SELECT c.company_id, c.name, a.name as type, a.description '+
			'FROM `company` c, `useraccess` ua , `accesstype` a '+
			'WHERE c.company_id=ua.company_id '+
			'AND ua.user_id='+req.decoded.user_id+' '+
			'AND ua.accesstype_id=a.accesstype_id '+
			'ORDER BY ua.accesstype_id ASC';
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user access: ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"companyid" : rows[k].id, 
					"name" : rows[k].name, 
					"type" : rows[k].type, 
					"description" : rows[k].description, 
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				data : {
					useraccess : resarray,
				}
			});
		}
	});
})
.post(function(req,res){ 
	/*
	mlog(user_id+': '+req.method+' '+req.url);
	var q = "INSERT INTO `newsreaded` (`user_id`, `news_id`, `date`) VALUES ('"+user_id+"', '"+req.query.newsid+"', NOW()) ON DUPLICATE KEY UPDATE `date`=NOW();";
	connection.query(
		q, function(err, rows){
		if(err){
			console.log('error post news readed: ', err.sqlMessage);
			console.log(err.sql);
			res.status(400).json({
				action : req.url,
				method : req.method,
				message : "SQL Error"
			});
			send_error_email("error post news readed \n"+err.sqlMessage+"\n"+err.sql);
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
			});
		}
	});*/
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/CARDDATA ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/carddata')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	var q = 'SELECT c.carddata_id, c.name, c.value, c.calc FROM `carddata` c '+
			'WHERE c.user_id='+req.decoded.user_id+' '+
			'ORDER BY c.weight ASC';
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get carddata: ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"id" : rows[k].id, 
					"name" : rows[k].name, 
					"value" : rows[k].value, 
					"calc" : rows[k].calc, 
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				data : {
					carddata : resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/LIVE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/live')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var idstart = 0;
	var nbresults = config.nb_results_by_page;
	if (req.query.idstart)
		idstart = req.query.idstart;
	if (req.query.nbresults)
		nbresults = req.query.nbresults;
	
	var q = 'SELECT  e.event_id, e.eventtype_id, et.name as typename, et.description as typedesc, e.message, '+
			'e.date_creation, e.date_updated, e.params, es.eventstatus_id, es.name as eventname, es.description as eventdesc, us.userstatus_id, '+
			'us.name as userstatus_name, us.description as userstatus_desc '+
			'FROM `event` e, `eventstatus` es, `eventtype` et,`userstatus` us '+
			'WHERE e.user_id='+req.decoded.user_id+' '+
			'AND e.eventstatus_id=es.eventstatus_id AND e.eventtype_id=et.eventtype_id '+
			'AND e.userstatus_id=us.userstatus_id '+
			'ORDER BY e.date_creation DESC LIMIT '+idstart+','+nbresults;
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user live: ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				params = [];
				if (rows[k].params)
					params = JSON.parse(rows[k].params);
				resarray.push({
					"id" : rows[k].event_id, 
					"type_id" : rows[k].eventtype_id, 
					"type_name" : rows[k].typename, 
					"type_desc" : rows[k].typedesc, 
					"name" : rows[k].message, 
					"desc" : null, 
					"date_creation" : rows[k].date_creation, 
					"date_updated" : rows[k].date_updated || null, 
					"date_done" : params.datedone || null, 
					"status_id" : rows[k].eventstatus_id, 
					"status_name" : rows[k].eventname, 
					"status_desc" : rows[k].eventdesc, 
					"paidbyowner" : params.paidbyawner || null, 
					"totalpaid" : params.totalpaid || null, 
					"refund" : params.refund || null, 
					"refunddesc" : params.refunddesc || null, 
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				data: {
					logs : resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// 
////////////////////////////////////////////////////////////////////////////////////////////////// 
////////////////////////////////////////////////////////////////////////////////////////////////// 

function compile_guaranties_by_category_id(category_id, rows) {
	mlog("-> compile_guaranties_by_category_id: "+category_id);
	var resarray = [];
	for(var k in rows){
		if (category_id == rows[k].guarantee_category_id) {
			resarray.push({
				"guarantee_name": rows[k].guarantee_name,
				"guarantee_id": rows[k].guarantee_id,
				"guarantee_img": rows[k].img,
				"guarantee_urlsearch": rows[k].img,
				"guarantee_desc": rows[k].description,
			});
		}
	}
	return (resarray);
}

function compile_categories_by_activity_id_old(guarantee_activity_id, rows) {
	mlog("--> compile_categories_by_activity_id: "+guarantee_activity_id);
	//mlog(rows);
	var resar = [];
	var category_id = null;
	var nb_push = 0;
	for(var k in rows){
		if (guarantee_activity_id == rows[k].guarantee_activity_id) {
			//mlog("Compare categorie:"+category_id+"//"+rows[k].guarantee_category_id);
			if (category_id != rows[k].guarantee_category_id)
				mlog("New garanty categorie ("+(++nb_push)+"): "+rows[k].guarantee_category_name);
				category_id = rows[k].guarantee_category_id;
				var guaranties = compile_guaranties_by_category_id(rows[k].guarantee_category_id, rows);
				resar.push({
						"guarantee_category_name": rows[k].guarantee_category_name,
						"guarantee_category_id": rows[k].guarantee_category_id,
						"guarantee_category_desc": rows[k].guarantee_category_desc,
						"guaranties": guaranties, 
				});
		}
	}
	return (resar);
}


function compile_categories_by_activity_id(guarantee_activity_id, rows) {
	mlog("--> compile_categories_by_activity_id: "+guarantee_activity_id);
	//mlog(rows);
	var resar = [];
	var category_id = null;
	var nb_push = 0;
	for(var k in rows){
		if (guarantee_activity_id == rows[k].guarantee_activity_id) {
			//mlog("Compare categorie:"+category_id+"//"+rows[k].guarantee_category_id);
			if (category_id != rows[k].guarantee_category_id)
				mlog("New garanty categorie ("+(++nb_push)+"): "+rows[k].guarantee_category_name);
				category_id = rows[k].guarantee_category_id;
				mlog("-> IN compile_guaranties_by_category_id: "+category_id);
				var resar2 = [];
				for(var l in rows){
					if (category_id == rows[l].guarantee_category_id) {
						resar2.push({
							"guarantee_name": rows[l].guarantee_name,
							"guarantee_id": rows[l].guarantee_id,
							"guarantee_img": rows[l].img,
							"guarantee_urlsearch": rows[l].img,
							"guarantee_desc": rows[l].description,
						});
					}
				}
				resar.push({
						"guarantee_category_name": rows[k].guarantee_category_name,
						"guarantee_category_id": rows[k].guarantee_category_id,
						"guarantee_category_desc": rows[k].guarantee_category_desc,
						"guaranties": resar2, 
				});
		}
	}
	return (resar);
}



////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/GUARANTEES/ACTIVITIES ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/guarantees/activities')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var maxresults = "";
	var search = "";
	if (req.query.search)
		search = " AND (g.name LIKE '%"+req.query.search+"%' OR ga.name LIKE '%"+req.query.search+"%') ";
	if (req.query.maxresults)
		maxresults = " LIMIT 0,"+req.query.maxresults;
	
	var q = 'SELECT DISTINCT g.name as guarantee_name, g.guarantee_id, ga.name as activity_name, ga.guarantee_activity_id, ga.description, '+
			'(SELECT gc.name FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_name, '+
			'(SELECT gc.description FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_desc, '+
			'g.guarantee_category_id, g.img, g.url, g.description, gp.name as packname, '+
			'gp.description as packdesc '+
			'FROM `guarantee` g, `guarantee_activity` ga, `guarantee_pack_value` gpv, `guarantee_pack` gp, `user` u   '+
			'WHERE u.user_id='+req.decoded.user_id+' AND gp.guarantee_pack_id=u.guarantee_pack_id '+
			'AND gp.guarantee_pack_id=gpv.guarantee_pack_id AND g.guarantee_id=gpv.guarantee_id '+
			'AND g.guarantee_activity_id=ga.guarantee_activity_id '+
			'AND gpv.enable=1 '+ search +
			'ORDER BY g.weight ASC, gpv.weight ASC '+ maxresults;
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user guarantees: ')
		} else {
			var resarray = [];
			var pack=[];
			var guarantee_activity_id = null;
			for(var k in rows){
				//mlog(rows);
				if (guarantee_activity_id != rows[k].guarantee_activity_id) {
					guarantee_activity_id = rows[k].guarantee_activity_id;
					mlog("==> "+rows[k].activity_name);
					resarray.push({
						"activity_name": rows[k].activity_name,
						"activity_id": rows[k].guarantee_activity_id,
						"activity_desc": rows[k].guarantee_activity_description,
						"categories": compile_categories_by_activity_id(rows[k].guarantee_activity_id, rows),
					});
				}
				pack.name=rows[k].packname,
				pack.desc=rows[k].packdesc
			};
			res.status(200).json({
				action : req.url,
				method : req.method,
				data: {
					packname : pack.name,
					packdesc : pack.desc,
					activities : resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/GUARANTEES ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/guarantees')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var activity_id = null;
	var search = null;
	var idstart = req.query.idstart || 0;
	if (req.query.activity_id)
		activity_id = req.query.activity_id;
	if (req.query.search)
		search = req.query.search;
	
	var q = 'SELECT DISTINCT g.name as guarantee_name, g.guarantee_id, ga.name as activity_name, ga.guarantee_activity_id, '+
			'(SELECT gc.name FROM guarantee_category gc WHERE gc.guarantee_category_id=g.guarantee_category_id) as guarantee_category_name, '+
			'g.guarantee_category_id, g.img, g.url, g.description, gp.name as packname, '+
			'gp.description as packdesc '+
			'FROM `guarantee` g, `guarantee_activity` ga, `guarantee_pack_value` gpv, `guarantee_pack` gp, `user` u   '+
			'WHERE u.user_id='+req.decoded.user_id+' AND gp.guarantee_pack_id=u.guarantee_pack_id '+
			'AND gp.guarantee_pack_id=gpv.guarantee_pack_id AND g.guarantee_id=gpv.guarantee_id '+
			'AND g.guarantee_activity_id=ga.guarantee_activity_id '+
			'AND gpv.enable=1 '
			'ORDER BY g.weight ASC, gpv.weight ASC LIMIT '+idstart+','+ config.nb_guarantee_by_page;
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user guarantees: ')
		} else {
			var resarray = [];
			var pack=[];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"guarantee_name": rows[k].guarantee_name,
					"guarantee_id": rows[k].guarantee_id,
					"activity_name": rows[k].activity_name,
					"activity_id": rows[k].guarantee_activity_id,
					"guarantee_category_name": rows[k].guarantee_category_name,
					"guarantee_category_id": rows[k].guarantee_category_id,
					"img": rows[k].img,
					"urlsearch": rows[k].img,
					"desc": rows[k].description,
				});
				pack.name=rows[k].packname,
				pack.desc=rows[k].packdesc
			};
			res.status(200).json({
				action : req.url,
				method : req.method,
				data : {
					packname : pack.name,
					packdesc : pack.desc,
					guarantees : resarray,
				}
			});
		}
	});
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/GUARANTEE/{guarantee_id} ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/guarantee/:guarantee_id')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var guarantee_id = req.params.guarantee_id || null;
	
	if (guarantee_id) {
		var q = 'SELECT gpv.txtvalue, gpv.description, gpv.value, gpv.exemple '+
				'FROM `guarantee_pack_value` gpv '+
				'WHERE gpv.guarantee_id='+guarantee_id+' '+
				'ORDER BY gpv.weight ASC';
		mlog(q);
		connection.query(
			q, function(err, rows){
			if(err){
				merror(res, req, err, 'error get user guarantee (guarantee_id): ')
			} else {
				var resarray = [];
				for(var k in rows){
					//mlog(rows);
					resarray.push({
						"sector": rows[k].txtvalue,
						"desc": rows[k].description,
						"value": rows[k].value,
						"exemple": rows[k].exemple
					});
				}
				res.status(200).json({
					action : req.url,
					method : req.method,
					data: {
						values : resarray,
					}
				});
			}
		});
	}
});


////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/FILE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/file')
///////////////// POST //
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	let filedir = dateFormat(new Date(), "yyyy-mm")+"/"; // REPERTOIRE DU MOIS
	let filelocation = config.www_filedirectory+filedir; // DIR EXACT OU STOCKER LES ENVOIS
	
	// CREATION DU REPERTOIRE DU MOIS SI IL N EXISTE PAS
	if (!fs.existsSync(filelocation)) {
		fs.mkdir(filelocation, (err) => { 
			if (err) { 
				return console.error(err); 
			} 
			console.log('Directory '+filelocation+' created successfully!');
		});
	}
	
	if (!req.files || Object.keys(req.files).length === 0) {
		return res.status(400).send('No files were uploaded.');
	}
	
	for (let i=0; i < 50; i++) {
		let sampleFile = req.files.file;
		var filename = req.decoded.user_id+"_"+i+"_"+req.files.file.name;
		//mlog(filename);
		filename = encrypt(filename);
		if (!fs.existsSync(filelocation+filename)) {
			//file not exists
			sampleFile.mv(filelocation+filename, function(err) {
				if (err)
					return merror(res, req, err, 'error post user file (mv): ');
				var q = 'INSERT INTO `file` (`company_id`, `user_id`, `name`,`realname`, `comment`, `type`, `path`, `mimetype`, `date`) '+
						"VALUES (NULL, "+req.decoded.user_id+", '"+sqlescstr(req.files.file.name)+"', '"+filename+"', '"+sqlescstr(req.body.comment)+"', '"+sqlescstr(req.body.type)+"','"+filedir+"','"+sqlescstr(req.files.file.mimetype)+"', NOW())";
				//mlog(q);
				connection.query(
					q, function(err, rows){
					if(err){
						return merror(res, req, err, 'error post user file (insert bdd): ')
					} else {
						res.status(200).json({
							action : req.url,
							method : req.method,
							result : 'File uploaded succesfully!',
						});
					}
				});
			});
			return;
		}
	}
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/RECIPIENT ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/recipients')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id + ': '+ req.method+' '+req.url);
	
		
	var q = 'SELECT r.recipient_user_id, u.email, u.firstname, u.lastname, r.datestart, r.enable '+
			'FROM `user` u, `recipient` r  '+
			'WHERE r.user_id='+req.decoded.user_id+' AND u.user_id=r.recipient_user_id '+
			'ORDER BY r.datestart ASC';
	//mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user guarantee (guarantee_id): ')
		} else {
			var resarray = [];
			for(var k in rows){
				//mlog(rows);
				resarray.push({
					"id": rows[k].recipient_user_id,
					"email": rows[k].email,
					"firstname": rows[k].firstname,
					"lastname": rows[k].lastname,
					"start": rows[k].datestart,
					"enable": rows[k].enable
				});
			}
			res.status(200).json({
				action : req.url,
				method : req.method,
				data : {
					recipient : resarray,
				}
			});
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var q = "INSERT INTO `user` (`email`, `userstatus_id`, `guarantee_pack_id`, `firstname`, `lastname`, `dateregister`, `ownersecunumber`) "+
			"VALUES ( '"+sqlescstr(req.body.email)+"', "+config.userstatus_recipient_id+", "+
			'(SELECT u2.guarantee_pack_id FROM `user` u2 WHERE u2.user_id='+req.decoded.user_id+') '+
			",'"+sqlescstr(req.body.firstname)+"', '"+sqlescstr(req.body.lastname)+"', NOW(), '"+sqlescstr(req.body.secunumber)+"')";
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			return merror(res, req, err, 'error post user recipient P1 (insert bdd): ')
		} else {
			mlog(rows);
			var q = 'INSERT INTO `recipient` (`user_id`, `recipient_user_id`, `recipienttype_id`, `datestart`, `enable`) '+
			"VALUES ("+req.decoded.user_id+", "+rows.insertId+", "+sqlescstr(req.body.recipienttype)+", NOW(), 1 )";
			mlog(q);
			connection.query(
				q, function(err, rows){
				if(err){
					return merror(res, req, err, 'error post user recipient P2 (insert bdd): ')
				} else {
					res.status(200).json({
						action : req.url,
						method : req.method,
						result : 'User recipient well added',
					});
				}
			});
		}
	});	
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/ASKHOSPITAL ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/askhospital')
///////////////// GET //
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var q = "INSERT INTO `event` ( `company_id`, `user_id`, `eventtype_id`, `userstatus_id`, `eventstatus_id`, `message`, `params`, `date_creation`) "+
			"VALUES ( NULL, "+req.decoded.user_id+", "+config.event_askhospital_id+", "+
			"(SELECT u2.userstatus_id FROM `user` u2 WHERE u2.user_id="+req.decoded.user_id+") "+
			", "+config.eventstatus_processed_id+", '"+sqlescstr(req.body.comment)+"', "+
			" '"+JSON.stringify({finesscode: sqlescstr(req.body.finesscode), contactinfo: sqlescstr(req.body.contactinfo), dmtcode: sqlescstr(req.body.dmtcode), date_operation: sqlescstr(req.body.date_operation), date_exit: sqlescstr(req.body.date_exit)})+"' "+
			", NOW()) ";
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			return merror(res, req, err, 'error post user askhospital (insert bdd): ')
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				result : 'User askhospital well added',
			});
		}
	});	
});

////////////////////////////////////////////////////////////////////////////////////////////////// OK
// /USER/MESSAGE ///////////////////////////////////////////////////////////////////////////////////////
//////////////////////////////////////////////////////////////////////////////////////////////////
myRouter.route('/user/message')
///////////////// GET //
.get(function(req,res){ 
	mlog(user_id + ': '+ req.method+' '+req.url);
	
	var start = 0;
	var nbresults = config.nb_results_by_page;
	if (req.body.start)
		start = req.body.start;
	if (req.body.nbresults)
		nbresults = req.body.nbresults;
		
	var q = 'SELECT m.message_id, m.sender, m.text, m.datecreate, m.response_message_id FROM `message` m '+
			'WHERE m.user_id='+req.decoded.user_id+' AND m.company_id IS null '+
			'ORDER BY m.datecreate DESC LIMIT '+start+','+nbresults;;
	mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			merror(res, req, err, 'error get user messages: ')
		} else {
			var resarray = [];
			var responses = [];
			var prev_message_id = 0;
			for(var k in rows){
				//mlog(rows);
				if (rows[k].response_message_id != null) {
					if(!Array.isArray(responses[rows[k].response_message_id]))
						responses[rows[k].response_message_id] = [];
					responses[rows[k].response_message_id].push({
						"message_id": rows[k].message,
						"sender": rows[k].sender,
						"text": rows[k].text,
						"datecreate": rows[k].datecreate,
					});
				} else {
					resarray.push({
						"message_id": rows[k].message_id,
						"sender": rows[k].sender,
						"text": rows[k].text,
						"datecreate": rows[k].datecreate,
						"responses": responses,
					});
				}
			}
			for(var k in resarray){
				if (resarray[k].message_id && Array.isArray(responses[resarray[k].message_id]))
					resarray[k].responses = responses[resarray[k].message_id];
			}
			mlog(resarray);
			res.status(200).json({
				action : req.url,
				method : req.method,
				data : {
					messages : resarray,
				}
			});
		}
	});
})
.post(function(req,res){ 
	mlog(user_id+': '+req.method+' '+req.url);
	
	var response_message_id = parseInt(req.body.response_message_id) || null;
	
	var q = "INSERT INTO `message` (`user_id`, `company_id`, `response_message_id`, `sender`, `text`, `datecreate`, `dateclose`) "+
			"VALUES ("+req.decoded.user_id+", NULL, "+response_message_id+", 'user', '"+sqlescstr(req.body.message)+"', NOW(), NULL);";
	//mlog(q);
	connection.query(
		q, function(err, rows){
		if(err){
			return merror(res, req, err, 'error post user messages: ')
		} else {
			res.status(200).json({
				action : req.url,
				method : req.method,
				message : 'Messages well added',
			});
		}
	});	
});