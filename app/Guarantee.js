
module.exports = {
    'compile_categories_by_activity_id' : function (guarantee_activity_id, rows) {
        console.log("--> lala compile_categories_by_activity_id: "+guarantee_activity_id);
        //mlog(rows);
        var resar = [];
        var category_id = null;
        var nb_push = 0;
        for(var k in rows){
            if (guarantee_activity_id == rows[k].guarantee_activity_id) {
                //mlog("Compare categorie:"+category_id+"//"+rows[k].guarantee_category_id);
                if (category_id != rows[k].guarantee_category_id)
                    console.log("New garanty categorie ("+(++nb_push)+"): "+rows[k].guarantee_category_name);
                    category_id = rows[k].guarantee_category_id;
                    console.log("-> IN compile_guaranties_by_category_id: "+category_id);
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
    },
    'orderGarantiesByActivities' : async function (rows) {
        var activities = [];
        var pack=[];
        var guarantee_activity_id = null;
        for(var k in rows){
            if (guarantee_activity_id != rows[k].guarantee_activity_id) {
                guarantee_activity_id = rows[k].guarantee_activity_id;

                var categories = [];
                var category_id = null;
                for(var l in rows){
                    if (guarantee_activity_id == rows[l].guarantee_activity_id && category_id != rows[l].guarantee_category_id ) {
                        category_id = rows[l].guarantee_category_id;

                        var guaranties = [];
                        for(var m in rows){
                            if (guarantee_activity_id == rows[m].guarantee_activity_id && category_id == rows[m].guarantee_category_id) {
                                guaranties.push({
                                    "guarantee_name": rows[m].guarantee_name,
                                    "guarantee_id": rows[m].guarantee_id,
                                    "guarantee_img": rows[m].img,
                                    "guarantee_urlsearch": rows[m].img,
                                    "guarantee_desc": rows[m].description,
                                });
                            }
                        }
                        categories.push({
                            "guarantee_category_name": rows[l].guarantee_category_name,
                            "guarantee_category_id": rows[l].guarantee_category_id,
                            "guarantee_category_desc": rows[l].guarantee_category_desc,
                            "guaranties": guaranties, 
                        });
                    }
                }
                activities.push({
                    "activity_name": rows[k].activity_name,
                    "activity_id": rows[k].guarantee_activity_id,
                    "activity_desc": rows[k].guarantee_activity_description,
                    "categories" : categories,
                });
            }
        }
        return (activities);
    },
    'test' : function () {
        console.log("Test !!");
    }
};

/*

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
*/