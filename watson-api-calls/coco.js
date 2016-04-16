/* © 2016 NIRAJ SWAMI */

var md5 = require('md5');

var cocoAjaxRequest 	= require('request');
var cocoWatson				= require('watson-developer-cloud');

var NodeCache 				= require( "node-cache" );
	var cocoAppCache 		= new NodeCache({ stdTTL: 60*60*24*3, checkperiod: 60*60*24 } );//3d expire

var firebaseio			= require('firebase'); 
	var firebase_authtoken 	= "OlcaOxY6NoXAJ8x67XwiJPdbDZEhCssYbrYeddiE";
	var firebase_baseurl 		= "https://mya-springboard.firebaseio.com/";

var Parse				= require('parse/node');
		Parse.initialize("mya-springboard-parse");
		Parse.serverURL = 'https://mya-springboard-parse.herokuapp.com/parse';



var COCO_TOTAL_RESULTS = 4;
var COCO_CACHELIFE_NUMDAYS = 5;
var gcloud_API_key = 'AIzaSyB5HtXjwlfwEOHuy8HI9-ig-Mn8mDRZYL8';

var gcse_CX_general 			= "013649766911551213733:w7aprgsexag";
var gcse_CX_digitalmags 	= "013649766911551213733:wzmmv1afzcw";
var gcse_CX_businessreads = "013649766911551213733:2rlll4pluie";
var gcse_CX_blogs					= "013649766911551213733:qrovpik0gcm";

var gcse_CX_learningsites = "013649766911551213733:xb5wiugfmi0"; // youtube + khan
var gcse_CX_microlearning = "013649766911551213733:ldxxxdiksaa"; // vine and gifs
var gcse_CX_moocs 				= "013649766911551213733:j8y4_x7igmu"; 

/* Built on Webby and Common Sense 
			TIMELINE [last 8 weeks ?/?]

			Digital Mags = use CSE - 		cx = 013649766911551213733:wzmmv1afzcw
			Business Reads = use CSE - 	cx = 013649766911551213733:2rlll4pluie
			Blogs = use Medium.com & LinkedIn.com/Pulse
			Q&A = use Quora.com
			News and Artles = use AlchemyData (last 2 weeks)
			Company Info = use clearbit => pull social and other details accordingly
				Fetch Social "chatter" = use Tweets
				Fetch Company details based on 1-result Glassdoor

			 = 8 GoogleCSE queries per item

*/

//

var COCOON = {};
var _recursiveRequestArr = [];
var myFirebaseRef = new Firebase(firebase_baseurl);

module.exports = {
	COCO_CACHELIFE_NUMDAYS:COCO_CACHELIFE_NUMDAYS,
	cocoinit_cocoon:function(cocoon, callback){
		COCOON = cocoon;
		COCOON.getChannelsForEntity = function(entity){
			return COCOON.channelmap_byentity[entity]?COCOON.channelmap_byentity[entity]:COCOON.channelmap_byentity["COCOGeneric"];
		}
		callback(COCOON);
	},
	/* 
		@entitydemandarr
			An array of entitytypes and queries packaged rightfully!... we push them to the appropriate ajax request and publish the results to firebase
				[{entity:"",cocoqueries:["topic 1", "topic 2"]}] 

		@callback:
			function to just acknowledge the movement with the ajaxCallStack array reported back

	*/
	cocofetchfromfirebase_forhashkey:function(hashkey, callback_hasData_dataPacket){
		if (!myFirebaseRef.getAuth()){
			console.log("authenticating firebase...");
			myFirebaseRef.authWithCustomToken(firebase_authtoken, function(){
				console.log("authenticated... so now trying cocofetchfromfirebase_forhashkey fetching :)");
				_coco_fetchfromfirebase_forhashkey(hashkey, callback_hasData_dataPacket);			
			});	
		}else{
			_coco_fetchfromfirebase_forhashkey(hashkey, callback_hasData_dataPacket);
		}
	},
	cocofetchintofirebase_forentitydemand:function(entitydemandarr, hashkey, callback){
		//
		if (!myFirebaseRef.getAuth()){
			console.log("authenticating firebase...");
			myFirebaseRef.authWithCustomToken(firebase_authtoken, function(){
				console.log("authenticated... so now trying entitydemand fetching :)");
				_coco_fetchintofirebase_forentitydemand(entitydemandarr, hashkey, callback)				
			});	
		}else{
			_coco_fetchintofirebase_forentitydemand(entitydemandarr, hashkey, callback);
		}
		
	},
	cocofetch_springboardset: function(springboardId, callback_success_sprset){
		var SpringboardSet = Parse.Object.extend("SpringboardSet");
		var query = new Parse.Query(SpringboardSet);
		query.get(springboardId, {
		  success: function(springboardSet) {
		  	callback_success_sprset(true, springboardSet)
		  },
		  error: function(object, error) {
		    // The object was not retrieved successfully.
		    // error is a Parse.Error with an error code and message.
		    callback_success_sprset(false, error);
		  }
		});

	},
	cocofetch_urlonly:function(cococategory, cocoquery, callback){
		var smart_cocoquery = "";
		//
		var cocochannel = _getQuickSiteFromCategory(cococategory);
		smart_cocoquery = cocoquery + " site:"+cocochannel;
		//
		cocoAjaxRequest(_getGoogleAPIQuery_URL_Only(gcse_CX_general, smart_cocoquery), callback);
	},

	cocofetch_watsonables_byentity: function(entitytype, cocoquery, callback){
		// let's see if we have a node-cache entity;
		var cocoCacheHash = md5(entitytype.toLowerCase() + "|" + cocoquery.toLowerCase());
		//
		var savedDataJSON = cocoAppCache.get(cocoCacheHash);
		if (savedDataJSON){
			callback(null, null, JSON.stringify(savedDataJSON));
			return;
		}

		var alchemy_data_news = cocoWatson.alchemy_data_news({
		  api_key: '5da1b4aac977ddade8f1d98b5ca01a9f3dd1411a'
		});

		var params = {
		  start: 'now-3d',
		  end: 'now',
		  count: COCO_TOTAL_RESULTS,
		  "return":"enriched.url.title,enriched.url.url,enriched.url.publicationDate"
		};
		//
		/* 
			City
			Company
			Continent
			Country
			Degree
			Facility
			FieldTerminology
			JobTitle
			Organization
			Person
			Product
			ProfessionalDegree
			Region
			StateOrCounty
			Technology
			EmailAddress
			TwitterHandle
			Hashtag
		*/

		switch (entitytype){
			case "City":
			case "Company":
			case "Continent":
			case "Country":
			case "Degree":
			case "Facility":
			case "FieldTerminology":
			case "JobTitle":
			case "Organization":
			case "Person":
			case "Product":
			case "ProfessionalDegree":
			case "Region":
			case "StateOrCounty":
			case "Technology":
			case "EmailAddress":
			case "TwitterHandle":
			case "Hashtag":
				params["q.enriched.url.enrichedTitle.entities.entity"] = "|text="+escape(cocoquery)+",type="+entitytype.toLowerCase()+"|";
				break;
			default:
				/* default is concept */
				params["q.enriched.url.concepts.concept.text"] = "["+escape(cocoquery)+"]";
				break;
		}

		//
		alchemy_data_news.getNews(params, function (err, news) {
			if (err)
		  	callback(err, null, null);
		  else{
		  	var gFormattedResults = _getFormattedResults_fromAlchemyNews(news);
		  	//
		  	console.log("get fresh news");
		  	//
		  	cocoAppCache.set(cocoCacheHash, gFormattedResults, function( err2, success ){
		  		console.log(err2);
				  if( !err2 && success ){
				    console.log( success );
				    // true 
    		  	callback(null, news, JSON.stringify(gFormattedResults, null, 2));
				  }
				});
		  }
		});
	},
  cocofetch_readables_bycategory: function(cococategory, cocoquery, callback){
  	/* all readable content */
  	if (cococategory == "digital-magazines"){
  		cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_digitalmags,cocoquery), callback);
  		return;
  	}
  	if (cococategory == "business-reads"){
  		cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_businessreads,cocoquery), callback);
  		return;
  	}
  	if (cococategory == "blogs"){
  		cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_blogs,cocoquery), callback);
  		return;
  	}
  	if (cococategory == "people"){
  		cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_general,cocoquery + " site:linkedin.com/in"), callback);
  		return;
  	}
  	if (cococategory == "pulse"){
  		cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_general,cocoquery + " site:linkedin.com/pulse"), callback);
  		return;
  	}
  	if (cococategory == "q&a"){
  		cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_general,cocoquery + " site:quora.com"), callback);
  		return;
  	}
  	callback("no-call");
  },
  cocofetch_watchables_bycategory: function(cococategory, cocoquery, callback){
  	/* all watchable content */
  	if (cococategory == "micro-learning"){
  		cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_microlearning,cocoquery), callback);
  		return;
  	}
  	if (cococategory == "learning-sites"){
  		cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_learningsites,cocoquery), callback);
  		return;
  	}
  	if (cococategory == "moocs"){
  		cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_moocs,cocoquery), callback);
  		return;
  	}
  	callback("no-call");
  },
  cocofetch_miniconsumables_bycategory: function(cococategory, cocoquery, callback){
  	/* all miniconsumables -- headlines and twitter search statuses content */
  	//if (cococategory == "social-statuses"){
  		//cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_microlearning,cocoquery), callback);
  		//return;
  	//}
  	if (cococategory == "headlines"){
  		cocoAjaxRequest(_getGoogleAPIQuery(gcse_CX_general,cocoquery), callback);
  		return;
  	}
  	callback("no-call");
  },
  bar: function () {
    // whatever
    return 7*getRandom();
  }
};


function _coco_fetchfromfirebase_forhashkey(fb_hashkey, callback_hasData_dataPacket){
	myFirebaseRef = new Firebase(firebase_baseurl+"cache/"+fb_hashkey);
	myFirebaseRef.once('value', function(dataSnapshot) {
	  // handle read data.
	  callback_hasData_dataPacket(true, dataSnapshot);
	});
}


function _coco_fetchintofirebase_forentitydemand(entitydemandarr, hashkey, callback){
	var ajaxCallStack = [];
	for (var i = 0;i<entitydemandarr.length;i++){
		var entitypacket = entitydemandarr[i];
		var channelmap = COCOON.getChannelsForEntity(entitypacket.entity);
		//
		var publicChannelsInMap = [];
		for (var j = 0;j<channelmap.length;j++){
			if (channelmap[j].indexOf(".") !== -1){
				publicChannelsInMap.push(channelmap[j]);
			}else if(channelmap[j] === "coco-webhoseio-blogs"){
				console.log(">>>>> search |_getWebHoseIOBlogs_MultipleCocoQuery| " + entitypacket.cocoqueries);
				_recursiveRequestArr.push({entity_class:entitypacket.entity, cocoqueries:entitypacket.cocoqueries, url:_getWebHoseIOBlogs_MultipleCocoQuery(30,entitypacket.cocoqueries), cachehash_firebase: hashkey});
			}else if(channelmap[j] === "coco-socialsearcher"){
				/* social searcher */
				for (var c=0;c<entitypacket.cocoqueries.length;c++){
					_recursiveRequestArr.push({entity_class:entitypacket.entity, cocoqueries:[entitypacket.cocoqueries[c]], url:_getSocialSearcher_Query(entitypacket.cocoqueries[c]), cachehash_firebase: hashkey});
				}
			}else if(channelmap[j] === "coco-alchemydata"){
				//IGNORE FOR NOW//_fetchBulkAlchemyRequest(entitypacket.entity, entitypacket.cocoqueries, hashkey);
				console.log("IGNORE >>>>> alchemy |coco-alchemydata| " + entitypacket.cocoqueries);
			}else{
				console.log("coco call (ignored for now) " + entitypacket.entity + ".. "+ channelmap[j]);
			}
		}
		// public channels
		if (publicChannelsInMap.length !== 0){
			console.log(">>>>> search "+ publicChannelsInMap + " |_getWebHoseIOWebsites_MultipleCocoQuery| " + entitypacket.cocoqueries);
			_recursiveRequestArr.push({entity_class:entitypacket.entity, cocoqueries:entitypacket.cocoqueries, url:_getWebHoseIOWebsites_MultipleCocoQuery(21,entitypacket.cocoqueries,publicChannelsInMap), cachehash_firebase: hashkey});
		}

	}
	//
	_recursiveAjaxRequest(function(){
		console.log("all recursives done");
	})
	//
	callback(ajaxCallStack);
}

var alchemy_data_news = cocoWatson.alchemy_data_news({
  api_key: '5da1b4aac977ddade8f1d98b5ca01a9f3dd1411a'
});
function _fetchBulkAlchemyRequest(entitytype, cocoqueries, hashkey){
	//
	var params = {
	  start: 'now-3d',
	  end: 'now',
	  count: Math.min(COCO_TOTAL_RESULTS*cocoqueries.length,8),
	  dedup: 1,
	  rank:"high^medium",
	  "return":"enriched.url.title,enriched.url.url,enriched.url.publicationDate"
	};

	//
	/* 
		City
		Company
		Continent
		Country
		Degree
		Facility
		FieldTerminology
		JobTitle
		Organization
		Person
		Product
		ProfessionalDegree
		Region
		StateOrCounty
		Technology
		EmailAddress
		TwitterHandle
		Hashtag
	*/
	for (var i = 0;i<cocoqueries.length;i++){
		cocoqueries[i] = cocoqueries[i].split("|").join("");
		cocoqueries[i] = cocoqueries[i].split("^").join(" ");
		cocoqueries[i] = cocoqueries[i].split("~").join("");
	}
	//
	var cocoQueryString = cocoqueries[0];
	if (cocoqueries.length > 1){
		cocoQueryString = "O[" + cocoqueries.join("^") + "]";
	}

	switch (entitytype){
		case "City":
		case "Company":
		case "Continent":
		case "Country":
		case "Degree":
		case "Facility":
		case "FieldTerminology":
		case "JobTitle":
		case "Organization":
		case "Person":
		case "Product":
		case "ProfessionalDegree":
		case "Region":
		case "StateOrCounty":
		case "Technology":
		case "EmailAddress":
		case "TwitterHandle":
		case "Hashtag":
			if (cocoqueries.length === 1){
				/* use single hit Entity logic here */
				params["q.enriched.url.enrichedTitle.entities.entity"] = "|text="+(cocoQueryString)+",type="+entitytype.toLowerCase()+"|";
			}else{
				params["q.enriched.url.concepts.concept.text"] = cocoQueryString;
			}
			break;
		default:
			/* default is concept */
			//cocoQueryString = "[" + escape(cocoqueries[0]) + "]";
			//if (cocoqueries.length > 1){
				//cocoQueryString = "O[" + cocoqueries.join("^") + "]";
			//}
			params["q.enriched.url.concepts.concept.text"] = cocoQueryString;
			break;
	}

	//
	alchemy_data_news.getNews(params, function (err, news) {
		if (err){
			console.log(params);
	  	console.log(err);
	  }else{
	  	var gFormattedResults = _getFormattedResults_fromAlchemyNews(news);
	  	//
	  	console.log("got fresh news for ... " + cocoQueryString);
	  	console.log(gFormattedResults);
	  	//
	  	if (gFormattedResults.length > 0){
		  	myFirebaseRef = new Firebase(firebase_baseurl+"cache/"+hashkey);
				myFirebaseRef.push({
					entity_class:entitytype,
					cocoqueries:cocoqueries,
					epochexpiration:Math.floor((new Date()).getTime()/1000)+COCO_CACHELIFE_NUMDAYS*24*60*60,
					results:gFormattedResults
				});
	  	}
	  }
	});
}

function _getFormattedResults_fromAlchemyNews(news){
	console.log("Total Transactions .... " + news.totalTransactions);
	//
	var gFormattedResults = [];
	//
	if (news.result === undefined){
		return gFormattedResults;
	}
	if (news.result.docs === undefined){
		return gFormattedResults;
	}
	//
	var parsedResults = news.result.docs;
	for (var p = 0; p<parsedResults.length; p++){
		gFormattedResults.push({title:parsedResults[p].source.enriched.url.title, url:parsedResults[p].source.enriched.url.url, isalchemy:true})
	}
	//
	return gFormattedResults;
}

function _getQuickSiteFromCategory(category){
	switch(category){
		case "job-title":
			return "careers.org";
			break;
		case "skills":
			return "khanacademy.com";
			break;
		case "people":
			return "linkedin.com/in";
			break;
		case "company":
			return "linkedin.com/company";
			break;
		case "interview-prep":
			return "glassdoor.com/interviews";
			break;
		case "shopping":
			return "amazon.com";
			break;
		case "trends":
			return "www.bloomberg.com/news/";
			break;
		case "travel":
			return "tripadvisor.com";
			break;
		case "blogs":
			return "medium.com";
			break;
		default:
			return "";
			break;
	}
}


var reqObj;
function _recursiveAjaxRequest(finalCallback){
	reqObj = _recursiveRequestArr.shift();
	if (!reqObj){
		return finalCallback();
	}
	cocoAjaxRequest(reqObj.url, function(error, response, body){
		if (!error){
			var resultSet;
			if (reqObj.url.indexOf("api.social-searcher.com") !== -1){
				/* we have social-searcher api results */
				resultSet = JSON.parse(body);
				console.log("found "+reqObj.url+" ... " + resultSet.posts.length);
				var xformPosts = [];
				for (var i = 0;i<resultSet.posts.length;i++){
					var post = resultSet.posts[i];
					post.title = post.title?post.title:post.text;
					xformPosts.push(post);
				}
				if (xformPosts.length > 0){
					myFirebaseRef = new Firebase(firebase_baseurl+"cache/"+reqObj.cachehash_firebase);
					myFirebaseRef.push({
						entity_class:reqObj.entity_class,
						coconsumable: "mini-readable",
						cocoqueries:reqObj.cocoqueries,
						epochexpiration:Math.floor((new Date()).getTime()/1000)+COCO_CACHELIFE_NUMDAYS*24*60*60,
						results:xformPosts
					});
				}
			}else if(reqObj.url.indexOf("webhose.io/search?token=") !== -1){
				resultSet = JSON.parse(body);
				console.log("found "+reqObj.url+" ... " + resultSet.totalResults);
				if (resultSet.totalResults > 0){
					myFirebaseRef = new Firebase(firebase_baseurl+"cache/"+reqObj.cachehash_firebase);
					myFirebaseRef.push({
						entity_class:reqObj.entity_class,
						coconsumable: "long-readable",
						cocoqueries:reqObj.cocoqueries,
						epochexpiration:Math.floor((new Date()).getTime()/1000)+COCO_CACHELIFE_NUMDAYS*24*60*60,
						results:resultSet.posts
					});
				}
			}else{
				console.log("Unmapped LINE-502 source JSK")
			}
		}
		/* */
		if (_recursiveRequestArr.length === 0){
			return finalCallback();
		}else{
			return _recursiveAjaxRequest(finalCallback);
		}
	})
}

/*
	callback is 
	function (error, response, body) {
	  
	}
 */

function _getSocialSearcher_Query(cocoQuery){
	return 'https://api.social-searcher.com/v2/search?key=ea14068c7225be98a4fe3b9eba7f7d12&q='+escape(cocoQuery)+'&network=twitter&lang=en';
}

function _getWebHoseIOBlogs_MultipleCocoQuery(numdays, cocoQueryArr){
	var qVal = '';
	for (var i = 0;i<cocoQueryArr.length;i++){
		qVal += '"'+cocoQueryArr[i]+'"';
		if (i !== cocoQueryArr.length-1){
			qVal += ' OR ';
		}
	}
	return 'https://webhose.io/search?token=bb6f378a-e97e-4326-bcb1-7f666c90e00d&format=json&highlight=true&size=24&q=('+escape(qVal)+')' + escape(' performance_score:>7 ') +'('+escape('site_type:blogs')+')%20(language:english)&ts='+((new Date()).getTime()-1000*60*60*24*numdays);
}

function _getWebHoseIOWebsites_MultipleCocoQuery(numdays, cocoQueryArr, siteArray){
	var qVal = '';
	for (var i = 0;i<cocoQueryArr.length;i++){
		qVal += '"'+cocoQueryArr[i]+'"';
		if (i !== cocoQueryArr.length-1){
			qVal += ' OR ';
		}
	}
	//
	var sitesVal = '';
	for (var i = 0;i<siteArray.length;i++){
		sitesVal += 'site:'+siteArray[i];
		if (i !== siteArray.length-1){
			sitesVal += ' OR ';
		}
	}
	var retVal = 'https://webhose.io/search?token=bb6f378a-e97e-4326-bcb1-7f666c90e00d&format=json&highlight=true&size=24&q=('+escape(qVal)+')' + escape(' performance_score:>7 ')+'('+escape(sitesVal)+')%20(language:english)&ts='+((new Date()).getTime()-1000*60*60*24*numdays);
	console.log("_getWebHoseIOWebsites_MultipleCocoQuery ... " + retVal);
	return retVal;
}

function _getGoogleAPIQuery(cx, querySmart){
	return "https://www.googleapis.com/customsearch/v1?key="+gcloud_API_key+"&cx="+cx+"&q="+escape(querySmart)+"&num="+COCO_TOTAL_RESULTS+"&safe=high&fields=items(htmlSnippet,htmlTitle,link,image)";
}
function _getGoogleAPIQuery_URL_Only(cx, querySmart){
	return "https://www.googleapis.com/customsearch/v1?key="+gcloud_API_key+"&cx="+cx+"&q="+escape(querySmart)+"&num="+COCO_TOTAL_RESULTS+"&safe=high&fields=items(link)";
}

function getRandom(){
	return Math.random();
}