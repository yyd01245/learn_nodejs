/*
 The MIT License (MIT)

 Copyright (c) 2016 Meetecho

 Permission is hereby granted, free of charge, to any person obtaining
 a copy of this software and associated documentation files (the "Software"),
 to deal in the Software without restriction, including without limitation
 the rights to use, copy, modify, merge, publish, distribute, sublicense,
 and/or sell copies of the Software, and to permit persons to whom the
 Software is furnished to do so, subject to the following conditions:

 The above copyright notice and this permission notice shall be included
 in all copies or substantial portions of the Software.

 THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS
 OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL
 THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR
 OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
 ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
 OTHER DEALINGS IN THE SOFTWARE.
 */
var cli_request = require('request');
var att_request = require('request');
var fs = require('fs');
var $ = null;

// Private method to create random identifiers (e.g., transaction)
function randomString(len) {
    var charSet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    var randomString = '';
    for (var i = 0; i < len; i++) {
        var randomPoz = Math.floor(Math.random() * charSet.length);
        randomString += charSet.substring(randomPoz,randomPoz+1);
    }
    return randomString;
}

// Initialization
function Init(options) {
    options = options || {};
    options.callback = (typeof options.callback == "function") ? options.callback : null;
    if(typeof options.callback == "function") {
        // Already initialized
        options.callback();
    }

};

function  noop () {

};
var that = null;
var servers = null, serversIndex = 0;
var janus_Callbacks = null;
var lostMaxNumber = 2000000;

function Janus(gatewayCallbacks) {

    //console.log("Library initialized: " + this.initDone);
    gatewayCallbacks = gatewayCallbacks || {};
    gatewayCallbacks.success = (typeof gatewayCallbacks.success == "function") ? gatewayCallbacks.success : noop;
    gatewayCallbacks.error = (typeof gatewayCallbacks.error == "function") ? gatewayCallbacks.error : noop;
    gatewayCallbacks.destroyed = (typeof gatewayCallbacks.destroyed == "function") ? gatewayCallbacks.destroyed : noop;
    if(gatewayCallbacks.server === null || gatewayCallbacks.server === undefined) {
        gatewayCallbacks.error("Invalid gateway url");
        return {};
    }
    this.websockets = false;

    janus_Callbacks = gatewayCallbacks;
    this.server = gatewayCallbacks.server;
    // if($.isArray(server)) {
    // 	Janus.log("Multiple servers provided (" + server.length + "), will use the first that works");
    // 	server = null;
    // 	servers = gatewayCallbacks.server;
    // 	Janus.debug(servers);
    // } else {
    if(this.server.indexOf("ws") === 0) {
        this.websockets = true;
        Janus.log("Using WebSockets to contact Janus: " + this.server);
    } else {
        this.websockets = false;
        Janus.log("Using REST API to contact Janus: " + this.server);
    }

    // Optional max events
    this.maxev = null;
    if(gatewayCallbacks.max_poll_events !== undefined && gatewayCallbacks.max_poll_events !== null)
        this.maxev = gatewayCallbacks.max_poll_events;
    if(this.maxev < 1)
        this.maxev = 1;
    // Token to use (only if the token based authentication mechanism is enabled)
    this.token = null;
    if(gatewayCallbacks.token !== undefined && gatewayCallbacks.token !== null)
        this.token = gatewayCallbacks.token;
    // API secret to use (only if the shared API secret is enabled)
    this.apisecret = null;
    if(gatewayCallbacks.apisecret !== undefined && gatewayCallbacks.apisecret !== null)
        this.apisecret = gatewayCallbacks.apisecret;
    // Whether we should destroy this session when onbeforeunload is called
    this.destroyOnUnload = true;
    if(gatewayCallbacks.destroyOnUnload !== undefined && gatewayCallbacks.destroyOnUnload !== null)
        this.destroyOnUnload = (gatewayCallbacks.destroyOnUnload === true);

    this.connected = false;
    this.sessionId = null;
    //this.pluginHandles = {};
     this.pluginHandles[123123] = ["213","123213"];
     Janus.log(typeof this.pluginHandles);
    this.retries = 0;
    this.transactions = {};

    this.createSession(gatewayCallbacks);

};

Janus.sessions = {};

Janus.noop = function() {};

Janus.prototype.pluginHandles = {};

Janus.prototype.connected = false;
Janus.prototype.sessionId = null;

//Janus.prototype.that = this;
Janus.prototype.retries = 0;
Janus.prototype.transactions = {};
Janus.prototype.maxev = null;

// Token to use (only if the token based authentication mechanism is enabled)
Janus.prototype.token = null;
Janus.prototype.apisecret = null;
Janus.prototype.destroyOnUnload = true;
Janus.prototype.server = '';
Janus.prototype.websockets = false;
Janus.prototype.handleId = 0;

Janus.prototype.setPluginHandles = function (handledid,pluginhandle) {
    this.pluginHandles[handledid] = pluginhandle;
}


// Private method to send a message
Janus.prototype.sendMessage = function (handleId, callbacks) {
    Janus.log("send message begin :",handleId);
    callbacks = callbacks || {};
    Janus.log(typeof callbacks.success);
    Janus.log(typeof callbacks.error);
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : noop;
    if(!this.connected) {
        Janus.warn("Is the gateway down? (connected=false)");
        callbacks.error("Is the gateway down? (connected=false)");
        return;
    }
    Janus.log("send message begin 0");
    var message = callbacks.message;
    var jsep = callbacks.jsep;
    var transaction = randomString(12);
    var request = { "uprtc": "message", "body": message, "transaction": transaction };
    if(this.token !== null && this.token !== undefined)
        request["token"] = token;
    if(this.apisecret !== null && this.apisecret !== undefined)
        request["apisecret"] = this.apisecret;
    if(jsep !== null && jsep !== undefined)
        request.jsep = jsep;
    Janus.debug("Sending message to plugin (handle=" + handleId + "):");
    Janus.debug(request);

    cli_request({
        url:this.server+"/" + this.sessionId+"/" + this.handleId,
        method:"POST",
        json:request
        // json:true,
        // headers:{"contentType": "application/json"},
        // body:JSON.stringify(request),
    },function (err, res, body) {
        console.log(body);
        typeof that.server;
        if(err == null){
            (function(json,janus_obj) {
                Janus.debug("Message send!");
                Janus.debug(json);
                if(json["uprtc"] === "success") {
                    // We got a success, must have been a synchronous transaction
                    var plugindata = json["plugindata"];
                    if(plugindata === undefined || plugindata === null) {
                        Janus.warn("Request succeeded, but missing plugindata...");
                        callbacks.success();
                        return;
                    }
                    Janus.log("Synchronous transaction successful (" + plugindata["plugin"] + ")");
                    var data = plugindata["data"];
                    Janus.debug(data);
                    callbacks.success(data);
                    return;
                } else if(json["uprtc"] !== "ack") {
                    // Not a success and not an ack, must be an error
                    if(json["error"] !== undefined && json["error"] !== null) {
                        Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
                        callbacks.error(json["error"].code + " " + json["error"].reason);
                    } else {
                        Janus.error("Unknown error");	// FIXME
                        callbacks.error("Unknown error");
                    }
                    return;
                }
                // If we got here, the plugin decided to handle the request asynchronously
                Janus.log("success begin not ack");
                callbacks.success("ack");
            })(body,that);
        }else {
            (function( textStatus, errorThrown) {
                Janus.error(textStatus + ": sendMessage " + errorThrown);	// FIXME
                callbacks.error(textStatus + ": sendMessage " + errorThrown);
            })(err.code,err.errno);
        }
    });

}


// method to send a trickle candidate
Janus.prototype.sendTrickleCandidate = function (handleId, candidate) {
    if(!this.connected) {
        Janus.warn("Is the gateway down? (connected=false)");
        return;
    }
    var request = { "uprtc": "trickle", "candidate": candidate, "transaction": randomString(12) };
    if(this.token !== null && this.token !== undefined)
        request["token"] = token;
    if(this.apisecret !== null && this.apisecret !== undefined)
        request["apisecret"] = this.apisecret;
    Janus.vdebug("Sending trickle candidate (handle=" + handleId + "):");
    Janus.vdebug(request);
    if(this.websockets) {
        request["session_id"] = this.sessionId;
        request["handle_id"] = this.handleId;
        //ws.send(JSON.stringify(request));
        return;
    }

    cli_request({
        url:this.server+"/" + this.sessionId+"/" + this.handleId,
        method:"POST",
        json:request
        // json:true,
        // headers:{"contentType": "application/json"},
        // body:JSON.stringify(request),
    },function (err, res, body) {
        console.log(body);
        typeof that.server;
        if(err == null){
            (function(json,janus_obj) {
                Janus.debug("Message send!");
                Janus.vdebug("Candidate sent!");
                Janus.vdebug(json);
                if(json["uprtc"] !== "ack") {
                    Janus.error("Ooops: sendTrickleCandidate " + json["error"].code + " " + json["error"].reason);	// FIXME
                    return;
                }
                // If we got here, the plugin decided to handle the request asynchronously
                Janus.log("success begin not ack");
                //Janus.log(suc)；
            })(body,that);
        }else {
            (function( textStatus, errorThrown) {
                Janus.error(textStatus + ": sendTrickleCandidate " + errorThrown);	// FIXME
            })(err.code,err.errno);
        }
    });

};


  Janus.prototype.createSession = function (callbacks) {
    var transaction = randomString(12);
    var request = { "uprtc": "create", "transaction": transaction };
    if(this.token !== null && this.token !== undefined)
        request["token"] = this.token;
    if(this.apisecret !== null && this.apisecret !== undefined)
        request["apisecret"] = this.apisecret;
    var server = this.server;
    if(server === null ) {
        // We still need to find a working server from the list we were given
        server = servers[serversIndex];
        if(server.indexOf("ws") === 0) {
            this.websockets = true;
            Janus.log("Server #" + (serversIndex+1) + ": trying WebSockets to contact Janus (" + server + ")");
        } else {
            this.websockets = false;
            Janus.log("Server #" + (serversIndex+1) + ": trying REST API to contact Janus (" + server + ")");
        }
    }
    console.log(request);
    that = this;
    cli_request({
        url:server,
        method:"POST",
        json:request
        // json:true,
        // headers:{"contentType": "application/json"},
        // body:JSON.stringify(request),
    },function (err, res, body) {
        console.log(body);
        typeof that.server;
        if(err == null){
            (function(json,janus_obj) {
                Janus.debug(json);
                if(json["uprtc"] !== "success") {
                    Janus.error("Ooops: createsession" + json["error"].code + " " + json["error"].reason);	// FIXME
                    callbacks.error(json["error"].reason);
                    return;
                }
                janus_obj.connected = true;
                janus_obj.sessionId = json.data["id"];
                Janus.log("Created session: " + janus_obj.sessionId);
                Janus.sessions[janus_obj.sessionId] = janus_obj;
                var sss = janus_obj.server;
                janus_obj.eventHandler();
                callbacks.success();
            })(body,that);
        }else {
            (function( textStatus, errorThrown) {
                Janus.error(textStatus + ": " + errorThrown);	// FIXME
                if(Array.isArray(servers)) {
                    serversIndex++;
                    if(serversIndex == servers.length) {
                        // We tried all the servers the user gave us and they all failed
                        callbacks.error("createsession Error connecting to any of the provided Janus servers: Is the gateway down?");
                        return;
                    }
                    // Let's try the next server
                    server = null;
                    setTimeout(function() { this.createSession(callbacks); }, 200);
                    return;
                }
                if(errorThrown === "")
                    callbacks.error(textStatus + ": createsession error Is the gateway down?");
                else
                    callbacks.error(textStatus + ": createsession error " + errorThrown);
            })(err.code,err.errno);
        }
    });

};

Janus.prototype.createHandle = function (callbacks) {
    Janus.log(typeof this.pluginHandles);
    Janus.log("create handle begin ");
    Janus.log(typeof callbacks);
    callbacks = callbacks || {};

    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : noop;
    callbacks.consentDialog = (typeof callbacks.consentDialog == "function") ? callbacks.consentDialog : noop;

    callbacks.mediaState = (typeof callbacks.mediaState == "function") ? callbacks.mediaState : noop;

    callbacks.webrtcState = (typeof callbacks.webrtcState == "function") ? callbacks.webrtcState : noop;

    callbacks.slowLink = (typeof callbacks.slowLink == "function") ? callbacks.slowLink : noop;

    callbacks.onmessage = (typeof callbacks.onmessage == "function") ? callbacks.onmessage : noop;
    // Janus.log("create handle begin 07");
    callbacks.onlocalstream = (typeof callbacks.onlocalstream == "function") ? callbacks.onlocalstream : noop;
    //  Janus.log("create handle begin 08");
    callbacks.onremotestream = (typeof callbacks.onremotestream == "function") ? callbacks.onremotestream : noop;
    //Janus.log("create handle begin 09");
    callbacks.ondata = (typeof callbacks.ondata == "function") ? callbacks.ondata : noop;
    //Janus.log("create handle begin 10");
    callbacks.ondataopen = (typeof callbacks.ondataopen == "function") ? callbacks.ondataopen : noop;
    //Janus.log("create handle begin 11");
    callbacks.oncleanup = (typeof callbacks.oncleanup == "function") ? callbacks.oncleanup : noop;
    //Janus.log(typeof callbacks.ondetached);
    callbacks.ondetached = (typeof callbacks.ondetached == "function") ? callbacks.ondetached : noop;
    //Janus.log("create handle begin connect = ",connected);
    if(!this.connected) {
        Janus.warn("Is the gateway down? (connected=false)");
        Janus.log("Is the gateway down? (connected=false)");
        callbacks.error("Is the gateway down? (connected=false)");

        return;
    }
    Janus.log("create handle begin 2");
    var plugin = callbacks.plugin;
    if(plugin === undefined || plugin === null) {
        Janus.error("Invalid plugin");
        callbacks.error("Invalid plugin");
        return;
    }
    Janus.log("create handle begin 3");
    var transaction = randomString(12);
    var request = { "uprtc": "attach", "plugin": plugin, "transaction": transaction };
    Janus.log("create handle 1 ",request);
    if(this.token !== null && this.token !== undefined)
        request["token"] = this.token;
    if(this.apisecret !== null && this.apisecret !== undefined)
        request["apisecret"] = this.apisecret;

    Janus.log(typeof this.pluginHandles);
    console.log(request);
    cli_request({
        url:this.server + "/" + this.sessionId,
        method:"POST",
        json:request
        // json:true,
        // headers:{"contentType": "application/json"},
        // body:JSON.stringify(request),
    },function (err, res, body) {
        console.log(body);
        typeof that.server;
        if(err == null){
            (function(json,janus_obj) {
                Janus.debug(json);
                if(json["uprtc"] !== "success") {
                    Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
                    callbacks.error(json["error"].reason);
                    return;
                }
                var handleId = json.data["id"];
                Janus.log("Created handle: " + handleId);
                var pluginHandle =
                    {
                        session : janus_obj,
                        plugin : plugin,
                        id : handleId,

                        consentDialog : callbacks.consentDialog,
                        mediaState : callbacks.mediaState,
                        webrtcState : callbacks.webrtcState,
                        slowLink : callbacks.slowLink,
                        onmessage : callbacks.onmessage,
                        // createOffer : function(callbacks) {  },
                        // createAnswer : function(callbacks) {  },
                        // sendTrickle : function(callbacks) { sendTrickleCandidate(handleId,callbacks);},
                        // handleRemoteJsep : function(callbacks) { },
                        onlocalstream : callbacks.onlocalstream,
                        onremotestream : callbacks.onremotestream,
                        ondata : callbacks.ondata,
                        ondataopen : callbacks.ondataopen,
                        oncleanup : callbacks.oncleanup,
                        ondetached : callbacks.ondetached,
                        // hangup : function(sendRequest) { cleanupWebrtc(handleId, sendRequest === true); },
                        // detach : function(callbacks) { destroyHandle(handleId, callbacks); }
                        getId : function() { return handleId; },
                        getPlugin : function() {
                            return plugin; },
                        //getVolume : function() { return getVolume(handleId); },
                       // isAudioMuted : function() { return isMuted(handleId, false); },
                       // muteAudio : function() { return mute(handleId, false, true); },
                       // unmuteAudio : function() { return mute(handleId, false, false); },
                        //isVideoMuted : function() { return isMuted(handleId, true); },
                        //muteVideo : function() { return mute(handleId, true, true); },
                        //unmuteVideo : function() { return mute(handleId, true, false); },
                        //getBitrate : function() { return getBitrate(handleId); },
                        send : function(callbacks) { janus_obj.sendMessage(handleId, callbacks); },
                        data : function(callbacks) { janus_obj.sendData(handleId, callbacks); },
                        dtmf : function(callbacks) { janus_obj.sendDtmf(handleId, callbacks); },

                        sendTrickle : function(callbacks) { janus_obj.sendTrickleCandidate(handleId,callbacks);},
                        hangup : function(sendRequest) { janus_obj.cleanupWebrtc(handleId, sendRequest === true); },
                        detach : function(callbacks) { janus_obj.destroyHandle(handleId, callbacks); }
                    };
                janus_obj.handleId = handleId;
                Janus.log(typeof janus_obj.pluginHandles);
                //setPluginHandles(handleId,pluginHandle);
                janus_obj.pluginHandles[handleId] = pluginHandle;
                callbacks.success(pluginHandle);
            })(body,that);
        }else {
            (function( textStatus, errorThrown) {
                Janus.error(textStatus + ": createhandle " + errorThrown);	// FIXME
                callbacks.error(textStatus + ": createhandle error " + errorThrown);
            })(err.code,err.errno);
        }
    });

};

Janus.prototype.attach = function (callbacks) {
    Janus.log(typeof this.pluginHandles);
    this.createHandle(callbacks);
};
Janus.prototype.getServer = function () {
    return this.server; };
Janus.prototype.isConnected = function () { return this.connected; };
Janus.prototype.getSessionId = function () { return this.sessionId; };
Janus.prototype.destroy =function (callbacks) { this.destroySession(callbacks); };



Janus.prototype.eventHandler = function () {
    if(this.sessionId == null)
        return;
    //Janus.debug('Long poll...');
    if(!this.connected) {
        Janus.warn("Is the gateway down? (connected=false)");
        return;
    }
    var server = this.server;
    var longpoll = server + "/" + this.sessionId + "?rid=" + new Date().getTime();
    if(this.maxev !== undefined && this.maxev !== null)
        longpoll = longpoll + "&maxev=" + this.maxev;
    if(this.token !== null && this.token !== undefined)
        longpoll = longpoll + "&token=" + token;
    if(this.apisecret !== null && this.apisecret !== undefined)
        longpoll = longpoll + "&apisecret=" + this.apisecret;

    // todo long poll
    //  request( )
    cli_request({
        url:longpoll,
        method:"GET",
        cache: false,
       timeout:60000,
       // json:longpoll
        json:true,
        // headers:{"contentType": "application/json"},
        // body:JSON.stringify(request),
    },function (err, res, body) {
        //console.log(body);
        if(err == null ){
            if(res.statusCode == 200){
                that.handleEvent(body);
            }else {
                (function( textStatus, errorThrown,janus_obj) {
                   // Janus.error(textStatus + ": eventhandle error res not null" + errorThrown +" sessionid:handleid "+that.sessionId+" : "+that.handleId);
                    //Janus.error(res);
                    //~ clearTimeout(timeoutTimer);
                    janus_obj.retries++;
                    if(janus_obj.retries > lostMaxNumber) {
                        // Did we just lose the gateway? :-(
                        janus_obj.connected = false;
                        janus_Callbacks.error("eventhandle Lost connection to the gateway (is it down?)");
                        return;
                    }
                    janus_obj.eventHandler();

                })(res.statusCode,res.statusMessage,that);
            }

        }else {
            (function( textStatus, errorThrown,janus_obj) {
               // Janus.error(textStatus + ": eventhandle error " + errorThrown+" sessionid:handleid "+that.sessionId+" : "+that.handleId);
                janus_obj.retries++;
                if(janus_obj.retries > lostMaxNumber) {
                    // Did we just lose the gateway? :-(
                    janus_obj.connected = false;
                    janus_Callbacks.error("eventhandle Lost connection to the gateway (is it down?)");
                    return;
                }
              //  Janus.error("restart eventhandle");
                janus_obj.eventHandler();

            })(err.code,err.errno,that);
        }
    });
};

// Private event handler: this will trigger plugin callbacks, if set
Janus.prototype.handleEvent = function  (json) {
    this.retries = 0;
    Janus.log("handle :",json);
    //Janus.log(Array.isArray(json));
    if(!this.websockets && this.sessionId !== undefined && this.sessionId !== null)
        setTimeout(function(){
            that.eventHandler();}, 200
        );
    if(!this.websockets && Array.isArray(json)) {
        // We got an array: it means we passed a maxev > 1, iterate on all objects
        for(var i=0; i<json.length; i++) {
            this.handleEvent(json[i]);
        }
        return;
    }
    if(json === null || json === undefined){
        Janus.error("handleEvent get url status error no body");
        return;
    }
    //Janus.log("begin parse event:" + json);
    if(json["uprtc"] == "keepalive") {
        // Nothing happened
        Janus.vdebug("Got a keepalive on session " + this.sessionId);
        return;
    } else if(json["uprtc"] == "ack") {
        // Just an ack, we can probably ignore
        Janus.debug("Got an ack on session " + this.sessionId);
        Janus.debug(json);
        var transaction = json["transaction"];
        if(transaction !== null && transaction !== undefined) {
            var reportSuccess = this.transactions[transaction];
            if(reportSuccess !== null && reportSuccess !== undefined) {
                reportSuccess(json);
            }
            delete this.transactions[transaction];
        }
        return;
    } else if(json["uprtc"] == "success") {
        // Success!
        Janus.debug("Got a success on session " + this.sessionId);
        Janus.debug(json);
        var transaction = json["transaction"];
        if(transaction !== null && transaction !== undefined) {
            var reportSuccess = this.transactions[transaction];
            if(reportSuccess !== null && reportSuccess !== undefined) {
                reportSuccess(json);
            }
            delete this.transactions[transaction];
        }
        return;
    } else if(json["uprtc"] == "webrtcup") {
        // The PeerConnection with the gateway is up! Notify this
        Janus.debug("Got a webrtcup event on session " + this.sessionId);
        Janus.debug(json);
        var sender = json["sender"];
        if(sender === undefined || sender === null) {
            Janus.warn("Missing sender...");
            return;
        }
        var pluginHandle = this.pluginHandles[sender];
        if(pluginHandle === undefined || pluginHandle === null) {
            Janus.warn("This handle is not attached to this session");
            return;
        }
        pluginHandle.webrtcState(true);
        return;
    } else if(json["uprtc"] == "hangup") {
        // A plugin asked the core to hangup a PeerConnection on one of our handles
        Janus.debug("Got a hangup event on session " + this.sessionId);
        Janus.debug(json);
        var sender = json["sender"];
        if(sender === undefined || sender === null) {
            Janus.warn("Missing sender...");
            return;
        }
        var pluginHandle = this.pluginHandles[sender];
        if(pluginHandle === undefined || pluginHandle === null) {
            Janus.warn("This handle is not attached to this session");
            return;
        }
        pluginHandle.webrtcState(false);
        pluginHandle.hangup();
    } else if(json["uprtc"] == "detached") {
        // A plugin asked the core to detach one of our handles
        Janus.debug("Got a detached event on session " + this.sessionId);
        Janus.debug(json);
        var sender = json["sender"];
        if(sender === undefined || sender === null) {
            Janus.warn("Missing sender...");
            return;
        }
        var pluginHandle = this.pluginHandles[sender];
        if(pluginHandle === undefined || pluginHandle === null) {
            // Don't warn here because destroyHandle causes this situation.
            return;
        }
        pluginHandle.ondetached();
        pluginHandle.detach();
    } else if(json["uprtc"] == "media") {
        // Media started/stopped flowing
        Janus.debug("Got a media event on session " + this.sessionId);
        Janus.debug(json);
        var sender = json["sender"];
        if(sender === undefined || sender === null) {
            Janus.warn("Missing sender...");
            return;
        }
        var pluginHandle = this.pluginHandles[sender];
        if(pluginHandle === undefined || pluginHandle === null) {
            Janus.warn("This handle is not attached to this session");
            return;
        }
        pluginHandle.mediaState(json["type"], json["receiving"]);
    } else if(json["uprtc"] == "slowlink") {
        Janus.debug("Got a slowlink event on session " + this.sessionId);
        Janus.debug(json);
        // Trouble uplink or downlink
        var sender = json["sender"];
        if(sender === undefined || sender === null) {
            Janus.warn("Missing sender...");
            return;
        }
        var pluginHandle = this.pluginHandles[sender];
        if(pluginHandle === undefined || pluginHandle === null) {
            Janus.warn("This handle is not attached to this session");
            return;
        }
        pluginHandle.slowLink(json["uplink"], json["nacks"]);
    } else if(json["uprtc"] == "error") {
        // Oops, something wrong happened
        Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
        Janus.debug(json);
        var transaction = json["transaction"];
        if(transaction !== null && transaction !== undefined) {
            var reportSuccess = this.transactions[transaction];
            if(reportSuccess !== null && reportSuccess !== undefined) {
                reportSuccess(json);
            }
            delete this.transactions[transaction];
        }
        return;
    } else if(json["uprtc"] == "event") {
        Janus.debug("Got a plugin event on session " + this.sessionId);
        Janus.debug(json);
        var sender = json["sender"];
        if(sender === undefined || sender === null) {
            Janus.warn("Missing sender...");
            return;
        }
        var plugindata = json["plugindata"];
        if(plugindata === undefined || plugindata === null) {
            Janus.warn("Missing plugindata...");
            return;
        }
        Janus.debug("  -- Event is coming from " + sender + " (" + plugindata["plugin"] + ")");
        var data = plugindata["data"];
        Janus.debug(data);
        var pluginHandle = this.pluginHandles[sender];
        if(pluginHandle === undefined || pluginHandle === null) {
            Janus.warn("This handle is not attached to this session");
            return;
        }
        var jsep = json["jsep"];
        if(jsep !== undefined && jsep !== null) {
            Janus.debug("Handling SDP as well...");
            Janus.debug(jsep);
        }
        var callback = pluginHandle.onmessage;
        if(callback !== null && callback !== undefined) {
            Janus.debug("Notifying application...");
            // Send to callback specified when attaching plugin handle
            callback(data, jsep);
        } else {
            // Send to generic callback (?)
            Janus.debug("No provided notification callback");
        }
    } else {
        Janus.warn("Unkown message/event  '" + json["uprtc"] + "' on session " + this.sessionId);
        Janus.debug(json);
    }
   // this.eventHandler();
};


// method to destroy a session
Janus.prototype.destroySession = function (callbacks) {
    callbacks = callbacks || {};
    // FIXME This method triggers a success even when we fail
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : noop;
    var asyncRequest = true;
    if(callbacks.asyncRequest !== undefined && callbacks.asyncRequest !== null)
        asyncRequest = (callbacks.asyncRequest === true);
    Janus.log("Destroying session " + this.sessionId + " (async=" + asyncRequest + ")");
    if(!this.connected) {
        Janus.warn("Is the gateway down? (connected=false)");
        callbacks.success();
        return;
    }
    if(this.sessionId === undefined || this.sessionId === null) {
        Janus.warn("No session to destroy");
        callbacks.success();
        janus_Callbacks.destroyed();
        return;
    }
    delete Janus.sessions[this.sessionId];
    // Destroy all handles first
    for(var ph in this.pluginHandles) {
        var phv = this.pluginHandles[ph];
        Janus.log("Destroying handle " + phv.id + " (" + phv.plugin + ")");
        this.destroyHandle(phv.id, {asyncRequest: asyncRequest});
    }
    // Ok, go on
    var request = { "uprtc": "destroy", "transaction": randomString(12) };
    if(this.token !== null && this.token !== undefined)
        request["token"] = this.token;
    if(this.apisecret !== null && this.apisecret !== undefined)
        request["apisecret"] = this.apisecret;
    console.log(request);
    cli_request({
        url:this.server + "/" + this.sessionId,
        method:"POST",
        json:request
        // json:true,
        // headers:{"contentType": "application/json"},
        // body:JSON.stringify(request),
    },function (err, res, body) {
        console.log(body);
        if(err == null){
            (function(json) {
                Janus.debug(json);
                if(json["uprtc"] !== "success") {
                    Janus.error("Ooops: destroySession " + json["error"].code + " " + json["error"].reason);	// FIXME
                    // callbacks.error(json["error"].reason);
                    // return;
                }
                callbacks.success();
                janus_Callbacks.destroyed();
            })(body);
        }else {
            (function( textStatus, errorThrown) {
                Janus.error(textStatus + ": destroySession error " + errorThrown);	// FIXME
                this.sessionId = null;
                this.connected = false;
                callbacks.success();
                janus_Callbacks.destroyed();
            })(err.code,err.errno);
        }
    });
};

// Private method to destroy a plugin handle
Janus.prototype.destroyHandle = function (handleId, callbacks) {
    callbacks = callbacks || {};
    callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : noop;
    callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : noop;
    Janus.warn(callbacks);
    var asyncRequest = true;
    if(callbacks.asyncRequest !== undefined && callbacks.asyncRequest !== null)
        asyncRequest = (callbacks.asyncRequest === true);
    Janus.log("Destroying handle " + handleId + " (async=" + asyncRequest + ")");
    //cleanupWebrtc(handleId);
    if(!this.connected) {
        Janus.warn("Is the gateway down? (connected=false)");
        callbacks.error("Is the gateway down? (connected=false)");
        return;
    }
    var request = { "uprtc": "detach", "transaction": randomString(12) };
    if(this.token !== null && this.token !== undefined)
        request["token"] = this.token;
    if(this.apisecret !== null && this.apisecret !== undefined)
        request["apisecret"] = this.apisecret;

    cli_request({
        url:this.server + "/" + this.sessionId + "/" + this.handleId,
        method:"POST",
        json:request
        // json:true,
        // headers:{"contentType": "application/json"},
        // body:JSON.stringify(request),
    },function (err, res, body) {
        console.log(body);
        if(err == null){
            (function(json,janus_obj) {
                Janus.log("Destroyed handle:");
                Janus.debug(json);
                if(json["uprtc"] !== "success") {
                    Janus.error("Ooops: destroyHandle " + json["error"].code + " " + json["error"].reason);	// FIXME
                }
                delete janus_obj.pluginHandles[handleId];
                callbacks.success();
            })(body,that);
        }else {
            (function( textStatus, errorThrown,janus_obj) {
                Janus.error(textStatus + ": destroyHandle " + errorThrown);	// FIXME
                // We cleanup anyway
                delete janus_obj.pluginHandles[handleId];
                callbacks.success();
            })(err.code,err.errno,that);
        }
    });

};


Janus.trace = function (data) {
    console.log(data);
};
Janus.debug = function (data) {
    console.log(data);
};
Janus.vdebug = function (data) {
    console.log(data);
};
Janus.log = function (data) {
    console.log(data);
};
Janus.warn = function (data){
    console.log(data);
};
Janus.error = function(data) {
    console.error(data);
};

module.exports.Janus = Janus;
exports.Init = Init;



