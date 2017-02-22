
var request = require('request');
var fs = require('fs');
var wrtc = require('../node-webrtc');


eval(fs.readFileSync('janus.js')+'');

/* respone case data list */
var RESPONE_OK 			= 0;
/* reject  */
var RESPONE_REJECT 	= 1;
/* reject cast busy */
var RESPONE_BUSY  	= 100;
/* had in room  */
var RESPONE_HADINROOM = 101;
/* sec key match error  */
var RESPONE_DISMATCH = 102;


var sessionid = null;
var httpServer = "http://10.0.6.53:8088/janus"
var janus = null;
var broadcast = null;
var role = 1;  // 1 publisher 2 listener



function randomString(len) {
  var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var randomString = '';
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz,randomPoz+1);
  }
  return randomString;
}
function randomInt(len) {
  var charSet = '0123456789';
  var randomString = '';
  for (var i = 0; i < len; i++) {
    var randomPoz = Math.floor(Math.random() * charSet.length);
    randomString += charSet.substring(randomPoz,randomPoz+1);
  }

  return parseInt(randomString);
}

var trans_number = randomString(12);

var RTCPeerConnection     = wrtc.RTCPeerConnection;
var RTCSessionDescription = wrtc.RTCSessionDescription;
var RTCIceCandidate       = wrtc.RTCIceCandidate;
var pc = null;
var dataChannels = {};
var pendingCandidates = [];

console.log(typeof Janus.sessions)
console.log(typeof Janus)
console.log(typeof Janus.init)

// 1 attach 2 register
var testMode = 1;

Janus.init({debug: "all", callback: function() {
  // Use a button to start the demo
  var clientId = randomInt(6);
  console.log("input clientId = %d",clientId);
  // Make sure the browser supports WebRTC
  // if(!Janus.isWebrtcSupported()) {
  //   console.log("No WebRTC support... ");
  //   return;
  // }
  janus = new Janus(
  {
    server: httpServer,
    success: function() {
      Janus.log("log create session over");
      // Attach to echo test plugin
      janus.attach(
        {
        //	plugin: "janus.plugin.broadcast",
          plugin: "janus.plugin.broadcast",
          success: function(pluginHandle) {
            broadcast = pluginHandle;
            console.log("Plugin attached! (" + broadcast.getPlugin() + ", id=" + broadcast.getId() + ")");
            var upyBody = null;
            if(testMode <= 1){
              return;
            }
            if(role == 1) {
              var register = { "request": "register", "client_id": clientId };
              
              Janus.log(register);
              broadcast.send({ "message": register,success:function(suc){Janus.log(suc)},error:function(err){Janus.log(err)} });
              Janus.debug("Sending message (" + JSON.stringify(register) + ")");
            }else{										
              upyBody = {"request": "join","ptype":  "listener","client_id": clientId ,"sec_key":""};
              Janus.debug("Sending message (" + JSON.stringify(upyBody) + ")");
              broadcast.send({ "message": upyBody,success:function(suc){Janus.log(suc)},error:function(err){Janus.log(err)} });
            }
          },
          error: function(error) {
            console.error("  -- Error attaching plugin...", error);
          },
          consentDialog: function(on) {
            Janus.debug("Consent dialog should be " + (on ? "on" : "off") + " now");
          },
          mediaState: function(medium, on) {
            Janus.log("Janus " + (on ? "started" : "stopped") + " receiving our " + medium);
          },
          webrtcState: function(on) {
            Janus.log("Janus says our WebRTC PeerConnection is " + (on ? "up" : "down") + " now");
          },
          onmessage: function(msg, jsep) {
            Janus.debug(" ::: Got a message (publisher) :::");
            Janus.debug(JSON.stringify(msg));
            var event = msg["broadcast"];
            Janus.debug("Event: " + event);
            var upyBody = null;
            if(event != undefined && event != null){
              if(event == "joined"){
                if(role == 1) {
                  // var publish = { "request": "configure", "audio": true, "video": true };
                  // Janus.log(publish);
                  // broadcast.send({ "message": publish,"jsep": {"type":"offer","sdp":""},success:function(suc){Janus.log(suc)},error:function(err){Janus.log(err)} });
                  // Janus.debug("Sending message (" + JSON.stringify(register) + ")");
                  publishOwnFeed(true);
                } 
                Janus.log("successfully joined ");
              } else if(event == "registered"){
                //join 
                Janus.log("register over begin join");
                var upyBody = {"request": "join","ptype":  "publisher","client_id": clientId ,"sec_key":""};            
                Janus.log(upyBody);
                broadcast.send({ "message": upyBody,success:function(suc){Janus.log(suc)},error:function(err){Janus.log(err)} });
                Janus.debug("Sending message (" + JSON.stringify(upyBody) + ")");
              } else if(event === "destroyed") {
                //  has been destroyed
                Janus.warn("The room has been destroyed!");
							} else if(event === "attached"){
                // subscribe 
                var feedId = clientId;
                var localID = msg["client_id"];
                Janus.log("get attached cmd, feedid=%d ,localID=%s",feedId,localID);
              } else if(event === "event") {
                if(msg["leaving"] !== undefined && msg["leaving"] !== null) {
                  // One of the publishers has gone away?
                  var leaving = msg["leaving"];
                  Janus.log("Publisher left: " + leaving);
                  if(leaving == clientId){
                    broadcast.hangup();
                  }            
                } else if(msg["configure"] !== undefined && msg["configure"] !== null){
                  var configureInfo = msg["configure"];
                  Janus.log("linster start : " + configureInfo);
                  if(configureInfo === 'ok') {
                    // That's us
                    Janus.log("broacast linsten start ok");
                  }
                } else if(msg["started"] !== undefined && msg["started"] !== null){
                  var startedInfo = msg["started"];
                  Janus.log("linster start : " + startedInfo);
                  if(startedInfo === 'ok') {
                    // That's us
                    Janus.log("broacast linsten start ok");
                  }										
                } else if(msg["incall"] !== undefined && msg["incall"] !== null ) {
                  var caller_id = msg["incall"];												
                  Janus.log("Incoming call from " + msg["target_ids"] + "!");
                  //$('#peer').val(msg["client_id"]).attr('disabled');
                  //to do send publish if no publisher
                  var respone = null;
                  respone = {"request":"resp_call","incall_id":caller_id,"respone":RESPONE_REJECT,"respone_data":RESPONE_BUSY};
                  broadcast.send({ "message": respone,success:function(suc){Janus.log(suc)},error:function(err){Janus.log(err)} });
                  Janus.debug("Sending message (" + JSON.stringify(register) + ")");	
                } else if(msg["resp_called"] !== undefined && msg["resp_called"] !== null){
                  Janus.log("resp call  ");
                } else if(msg["error"] !== undefined && msg["error"] !== null) {
                    bootbox.alert(msg["error"]);
                    broadcast.hangup();
                  //janus.destroy();
                }               
              }
            }
            if(jsep !== undefined && jsep !== null) {
              Janus.debug("Handling SDP as well...");
              Janus.debug(jsep);
              if(role == 1){
                // handle jsep
                broadcast.handleRemoteJsep({jsep: jsep});
              } else if(role == 2){
                // Answer and attach
                broadcast.createAnswer(
                  {
                    jsep: jsep,
                    media: { audioSend: false, videoSend: false },	// We want recvonly audio/video
                    success: function(jsep) {
                      Janus.debug("Got SDP!");
                      Janus.debug(jsep);
                      var body = { "request": "start"};
                      broadcast.send({"message": body, "jsep": jsep});
                    },
                    error: function(error) {
                      Janus.error("WebRTC error:", error);
                      bootbox.alert("WebRTC error... " + JSON.stringify(error));
                    }
                  });
              }
            }

          },
          onlocalstream: function(stream) {
          },
          onremotestream: function(stream) {
          },
          ondataopen: function(data) {
            Janus.log("The DataChannel is available!");
          },
          ondata: function(data) {
            Janus.debug("We got data from the DataChannel! " + data);
          },
          oncleanup: function() {
            Janus.log(" ::: Got a cleanup notification :::");
          },
          ondetached: function() {
            Janus.log(" ::: Got a ondetached notification :::");
          },
          slowLink: function() {
             Janus.log(" ::: Got a slowLink notification :::");
          }
        });
    },
    error: function(error) {
      Janus.error(error);
    },
    destroyed: function() {
      window.location.reload();
    }
  });
}});

function doSetRemoteDesc(desc)
{
  pc.setRemoteDescription(
    new RTCSessionDescription(desc),
    doWaitforDataChannels,
    doHandleError
  );
}

function doSendOffer(offer)
{
  var useAudio = true;
  Janus.log("doSendOffer begin ");
 // var jsep = {"type":"offer","sdp":{'candidate': candidate.candidate, 'sdpMid': candidate.sdpMid, 'sdpMLineIndex': candidate.sdpMLineIndex}};
  var jsep = {'type': offer.type, 'sdp': offer.sdp};
  Janus.debug(jsep);
  var audioenabled = useAudio;
  var videoenabled = true;
  var publish = { "request": "configure", "audio": useAudio, "video": true  };
  broadcast.send({"message": publish, "jsep": jsep,success:function(suc){Janus.log(suc)},error:function(err){Janus.log(err)}  });
  

}
function doHandleError(error) {
    Janus.log("doHandleError begin 0");
    throw error;
}
function doSetLocalDesc(desc) {
    Janus.log("doSetLocalDesc begin 0");
    pc.setLocalDescription(
        new RTCSessionDescription(desc),
        doSendOffer.bind(undefined, desc),
        doHandleError)
}

function set_pc1_local_description(desc) {
  console.log('pc: set local description');
  console.log(desc);
  pc.setLocalDescription(
    new RTCSessionDescription(desc),
    doSendOffer.bind(undefined, desc),
    doHandleError
  );
}

function publishOwnFeed(useAudio) {
	// Publish our stream
  Janus.log("publishOwnFeed begin 00");
  pc = new RTCPeerConnection(
    {
      iceServers: [{url:'stun:stun.l.google.com:19302'}]
    },
    {
      'optional': []
    }
  );
   //pc = new RTCPeerConnection();
   Janus.log("publishOwnFeed begin 0");
  // pc.onsignalingstatechange = function(event)
  // {
  //   console.info("signaling state change: ", event.target.signalingState);
  // };
  // pc.oniceconnectionstatechange = function(event)
  // {
  //   console.info("ice connection state change: ", event.target.iceConnectionState);
  // };
  // pc.onicegatheringstatechange = function(event)
  // {
  //   console.info("ice gathering state change: ", event.target.iceGatheringState);
  // };
  pc.onicecandidate = function(candidate){
    Janus.log("onicecandidate begin ");
    if(!candidate.candidate) return;
    pc.addIceCandidate(candidate.candidate);
  };
   Janus.log("publishOwnFeed begin 1");
  var dc = pc.createDataChannel("JanusDataChannel");
     Janus.log("publishOwnFeed begin 2");
  dc.onopen = function() {
    console.log("pc1: data channel open");
    dc.onmessage = function(event) {
      var data = event.data;
      console.log("dc1: received '"+data+"'");
      console.log("dc1: sending 'pong'");
      dc.send("pong");
    }
  }
    Janus.log("publishOwnFeed begin 3");
  console.log('pc: create offer');

     Janus.log("publishOwnFeed begin 4");
  pc.createOffer(doSetLocalDesc, doHandleError);
    //pc.createOffer(set_pc1_local_description, handle_error);
     Janus.log("publishOwnFeed begin 5");

}

	// broadcast.createOffer(
	// 	{
	// 		media: { audioRecv: false, videoRecv: false, audioSend: useAudio, videoSend: true},	// Publishers are sendonly
	// 		success: function(jsep) {
	// 			Janus.debug("Got publisher SDP!");
	// 			Janus.debug(jsep);
	// 			audioenabled = useAudio;
	// 			videoenabled = true;
	// 			var publish = { "request": "configure", "audio": useAudio, "video": true  };
	// 			broadcast.send({"message": publish, "jsep": jsep,success:function(suc){Janus.log(suc)},error:function(err){Janus.log(err)}  });
	// 		},
	// 		error: function(error) {
	// 			Janus.error("WebRTC error:", error);
	// 			if (useAudio) {
	// 				 publishOwnFeed(false);
	// 			} else {
	// 				Janus.error("WebRTC error: no idea !", error);
	// 			}
	// 		}
	// 	});

// request.post(
//   httpServer,
//   { json: { "janus": "create","transaction":trans_number} },
//   function (error, response,body) {
//     if(!error && response.statusCode == 200) {
//       console.log(body)
//       if(body["janus"] == "success"){
//          sessionid = body["data"]["id"]
//          console.log(sessionid);

//       }
//     }
//   }
// )
