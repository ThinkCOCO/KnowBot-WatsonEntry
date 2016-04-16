/* © 2016 NIRAJ SWAMI */

var express 				= require('express');
var cfenv 					= require('cfenv');
var compression 		= require('compression');
var vcapServices    = require('vcap_services');
var multer 					= require('multer');
var bodyParser 			= require('body-parser');
var streamifier 		= require('streamifier');
var fs 							= require('fs');
var ajaxRequest     = require('request');

var Parse				= require('parse/node');
		Parse.initialize("mya-springboard-parse");
		Parse.serverURL = 'https://mya-springboard-parse.herokuapp.com/parse';


var cocoWatson			= require('watson-developer-cloud');

module.exports = {
	test:function(){
		console.log("In profile allow user to follow 'experts' so results come from a custom repository.... 'Bob Recommends' will pull in results.... Beeline/Enterprise can plug in their REPO and send 'follow' links to their users.");
	},
	converse: function(senderId,message,converseCallback){
		COCO_Bot_ProcessSenderMessage(senderId,message,converseCallback);
	},
	processtranscription: function(senderId, transcriptionText, converseCallback){
		COCO_Bot_ProcessTranscription(senderId, transcriptionText, converseCallback);
	}
};

var sessionHash = {};
function COCO_Bot_ProcessSenderMessage(senderId, incomingMsg, converseCallback){
	//
	var returnMessagePacket = {};
	var sendPacketAsap = true;
	/* check if session has been created */
	if (!sessionHash[senderId]){
		sessionHash[senderId] = {sender: senderId, cocoquerieshash:[], created:(new Date()).getTime()};
		returnMessagePacket.message = "Welcome to Mya Springboard! What are you preparing for?";
	}else if(incomingMsg.toLowerCase() == "restart"){
		sessionHash[senderId] = {sender: senderId, cocoquerieshash:[], created:(new Date()).getTime()};
		returnMessagePacket.message = "Let's start fresh! So, what are you preparing for?";
	}else if (!sessionHash[senderId].opptitle){
		sessionHash[senderId].opptitle = incomingMsg;
		//
		sendPacketAsap = false;
			NS_ConvertToMyaIntent(incomingMsg, true, function(success, packet){
				if (success){
					for (var i = 0;i<packet.entityArr.length;i++){
						sessionHash[senderId].cocoquerieshash.push(packet.entityArr[i]);					
					}
					/* We can figure out dynamic prompts based on entities that may be missing! :D */
					if (packet.foundCocoEntities){
					}else{
					}
					returnMessagePacket.message = _getRandomAffirmative()+"! Is this for you or for someone else?";
					converseCallback(returnMessagePacket);
				}
				else{
					console.log("sorry error!");
					returnMessagePacket.message = _getRandomAffirmative()+"! Is this for you or for someone else?";
					converseCallback(returnMessagePacket);
				}
			});
		//
	}else if (!sessionHash[senderId].audience){
		if (incomingMsg.toLowerCase() == "me" || incomingMsg.toLowerCase() == "for me"){
			sessionHash[senderId].audience = "me";
			returnMessagePacket.message = _getRandomAffirmative()+"! Share more about this opportunity. Want ideas? Type TIPS.";
		}else if( incomingMsg.toLowerCase().indexOf("someone") !== -1 || incomingMsg.toLowerCase().indexOf("else") !== -1  || incomingMsg.toLowerCase().indexOf("others") !== -1  || incomingMsg.toLowerCase().indexOf("share") !== -1){
			sessionHash[senderId].audience = "others";
			returnMessagePacket.message = _getRandomAffirmative()+"! Share more about this opportunity. Want ideas? Type TIPS.";
		}else{
			returnMessagePacket.message = "Sorry, I didn't catch that. You can say 'me' or 'others'...";
		}
	}else if(incomingMsg.toLowerCase() == "tips"){
		returnMessagePacket.message = "You can describe your needs with short phrases (e.g. 'applying for a job at IBM', 'current trends in Marketing'), or in a single long paragraph, or even paste a weblink! When ready to get kit, type DONE or RESTART.";
	}else if(incomingMsg.toLowerCase() == "done"){
		sendPacketAsap = false;
		console.log(JSON.stringify(sessionHash[senderId]));
		returnMessagePacket.cocoquerieshash = sessionHash[senderId].cocoquerieshash;
		NS_Parse_SavePacket(senderId, sessionHash[senderId], function(retValue){
			/* do a post to get the unique URL */
			ajaxRequest({
		    url: 'https://www.googleapis.com/urlshortener/v1/url?key=AIzaSyB5HtXjwlfwEOHuy8HI9-ig-Mn8mDRZYL8',
		    method: 'POST',
		    json: {
		      longUrl: "https://mya-springboard.mybluemix.net/kit?id="+retValue
		    }
		  }, function(gError, gResponse, gBody) {
				returnMessagePacket.message = "Excellent. Here's your personalized springboard kit for '"+sessionHash[senderId].opptitle+"': "+gResponse.body.id+"\n\n Type RESTART to create a new one.";
				converseCallback(returnMessagePacket);
		  });
		});
	}else{
		if (incomingMsg.length < 5){
			/* ignore */
			returnMessagePacket.message = "Please try a longer phrase (at least 5 characters!). You can also type HELP, DONE or RESTART."
		}else{
			sendPacketAsap = false;
			NS_ConvertToMyaIntent(incomingMsg, false, function(success, packet){
				console.log(packet);
				console.log("......");	
				if (success){
					for (var i = 0;i<packet.entityArr.length;i++){
						sessionHash[senderId].cocoquerieshash.push(packet.entityArr[i]);					
					}
					/* We can figure out dynamic prompts based on entities that may be missing! :D */
					if (packet.foundCocoEntities){
					}else{
					}
					returnMessagePacket.message = ""+_getRandomAffirmative()+". Anything else? (or type DONE, RESTART)";
					converseCallback(returnMessagePacket);
				}
				else{
					console.log("sorry error!");
					returnMessagePacket.message = ""+_getRandomAffirmative()+". Anything else? (or type DONE or RESTART)";
					converseCallback(returnMessagePacket);
				}
			});

		}
	}
	//
	if (sendPacketAsap){
		converseCallback(returnMessagePacket);
	}
}

function COCO_Bot_ProcessTranscription(senderId, incomingMsg, converseCallback){
	//
	var returnMessagePacket = {};
	sessionHash[senderId] = {sender: senderId, cocoquerieshash:[], created:(new Date()).getTime(), audience:"me", opptitle:"[Call-in] "+incomingMsg.substr(0,Math.min(20,incomingMsg.length))+"..."};
	/* check if session has been created */
	NS_ConvertToMyaIntent(incomingMsg, false, function(success, packet){
		console.log(packet);
		console.log("......");	
		if (success){
			for (var i = 0;i<packet.entityArr.length;i++){
				sessionHash[senderId].cocoquerieshash.push(packet.entityArr[i]);					
			}
			/* We can figure out dynamic prompts based on entities that may be missing! :D */
			if (packet.foundCocoEntities){
			}else{
			}
			/* we now save and send response */
			NS_Parse_SavePacket(senderId, sessionHash[senderId], function(retValue){
				/* do a post to get the unique URL */
				ajaxRequest({
			    url: 'https://www.googleapis.com/urlshortener/v1/url?key=AIzaSyB5HtXjwlfwEOHuy8HI9-ig-Mn8mDRZYL8',
			    method: 'POST',
			    json: {
			      longUrl: "https://mya-springboard.mybluemix.net/kit?id="+retValue
			    }
			  }, function(gError, gResponse, gBody) {
					returnMessagePacket.message = "Good news! Here's your personalized springboard kit for '"+sessionHash[senderId].opptitle+"': "+gResponse.body.id;
					converseCallback(returnMessagePacket);
			  });
			});
		}
		else{
			console.log("sorry error!");
			returnMessagePacket.message = "Not enough audio from your to transcribe...";
			converseCallback(returnMessagePacket);
		}
	});
	//
	
}

function NS_ConvertToMyaIntent(message, doNLP, CALLBACK_success_packet){
	/*potentially use natural language processing to refine keywords!!!! */
	var retPacket = {
		foundCocoEntities: true,
		entityArr: []
	};
	//
	var alchemy_language = cocoWatson.alchemy_language({
  	api_key: '5da1b4aac977ddade8f1d98b5ca01a9f3dd1411a'
	});
  
  var params = {
	  extract:"keyword,entity,concept",
	  linkedData: false
	};
	if (message.indexOf("http") === 0 && message.indexOf(" ") === -1 && message.indexOf("://") !== 1){
		params.url = message;
	}else{
		params.text = message;
	}

	if (doNLP){
		NS_FetchNLPCocoIntent(message, function(nlpSuccess, nlpTopClass){
			retPacket.cocointent = nlpTopClass;
			/* now let's do the alchemy pitch */
			//
			alchemy_language.combined(params, function (err, response) {
				if (err)
			    CALLBACK_success_packet(false, err);
			  else{
			  	//
			  	if (response.entities){
			  		if (response.entities.length > 0){
			  			for (var i = 0;i<response.entities.length;i++){
			  				retPacket.entityArr.push({type:response.entities[i].type, text:response.entities[i].text, cocointent:retPacket.cocointent});
			  			}
			  		}else{
			  			retPacket.foundCocoEntities = false;
			  		}
			  	}else{
			  		retPacket.foundCocoEntities = false;
			  	}
			  	//
			  	if (!retPacket.foundCocoEntities){
			  		for (var i = 0;i<response.keywords.length;i++){
				  		if (response.keywords[i].relevance >= 0.81)
				  			retPacket.entityArr.push({type:"AlchemyKeyword", text:response.keywords[i].text, cocointent:retPacket.cocointent});
				  	}
				  	for (var i = 0;i<response.concepts.length;i++){
				  		if (response.concepts[i].relevance >= 0.81)
				  			retPacket.entityArr.push({type:"AlchemyConcept", text:response.concepts[i].text, cocointent:retPacket.cocointent});
				  	}
			  	}
			  	//
			  	CALLBACK_success_packet(true, retPacket);
			  }
			});
		});
	}else{
		/* let's do the alchemy pitch */
		alchemy_language.combined(params, function (err, response) {
			if (err)
		    CALLBACK_success_packet(false, err);
		  else{
		  	//
		  	if (response.entities){
		  		if (response.entities.length > 0){
		  			for (var i = 0;i<response.entities.length;i++){
		  				retPacket.entityArr.push({type:response.entities[i].type, text:response.entities[i].text, cocointent:retPacket.cocointent});
		  			}
		  		}else{
		  			retPacket.foundCocoEntities = false;
		  		}
		  	}else{
		  		retPacket.foundCocoEntities = false;
		  	}
		  	//
		  	if (!retPacket.foundCocoEntities){
		  		for (var i = 0;i<response.keywords.length;i++){
			  		if (response.keywords[i].relevance >= 0.81)
			  			retPacket.entityArr.push({type:"AlchemyKeyword", text:response.keywords[i].text, cocointent:retPacket.cocointent});
			  	}
			  	for (var i = 0;i<response.concepts.length;i++){
			  		if (response.concepts[i].relevance >= 0.81)
			  			retPacket.entityArr.push({type:"AlchemyConcept", text:response.concepts[i].text, cocointent:retPacket.cocointent});
			  	}
		  	}
		  	//
		  	CALLBACK_success_packet(true, retPacket);
		  }
		});
	}
	

}

function NS_FetchNLPCocoIntent(message, CALLBACK_success_classname){
	var natural_language_proc = cocoWatson.natural_language_classifier({
	  url: 'https://gateway.watsonplatform.net/natural-language-classifier/api',
	  username: 'a48a4218-f203-4377-ba86-897149d53b1f',
	  password: '7KmwBPcYyLh8',
	  version: 'v1'
	});
	//
	natural_language_proc.classify({
		  text: message,
		  classifier_id: '56e10ax32-nlc-90' },
		  function(err, MYA_NLC_PACKET) {
		    if (err)
		    	CALLBACK_success_classname(false, "");
		    else{
		    	CALLBACK_success_classname(true,MYA_NLC_PACKET.top_class);
		    }
		});
}

function NS_Parse_SavePacket(senderId, packet, callback){
	var SpringboardSet = Parse.Object.extend("SpringboardSet");
	//
	var springkitObj = new SpringboardSet();
	springkitObj.save({ownerMapId:senderId, cocoPacket:packet}).then(function(object) {
		console.log(new Date(springkitObj.get("updatedAt")).getTime());
	  callback(springkitObj.id);
	});
}

function _getRandomAffirmative(){
	var affirmatives_arr = ["Noted","Got it","Ok, got it", "Perfect"];
	return affirmatives_arr[Math.floor(Math.random()*affirmatives_arr.length)];
}


