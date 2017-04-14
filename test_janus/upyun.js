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
var fs = require('fs');
var $ = null;

var jsdom = require("jsdom");
//eval(fs.readFileSync('adapter.js')+'');

// require("jsdom").env("", function(err, window) {
//     if (err) {
//         console.error(err);
//         return;
//     }

//     $ = require("jquery")(window);
// });
// List of sessions



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

function Janus(gatewayCallbacks) {
    // if(this.initDone === undefined) {
    //     gatewayCallbacks.error("Library not initialized");
    //     return {};
    // }

    //console.log("Library initialized: " + this.initDone);
    gatewayCallbacks = gatewayCallbacks || {};
    gatewayCallbacks.success = (typeof gatewayCallbacks.success == "function") ? gatewayCallbacks.success : noop;
    gatewayCallbacks.error = (typeof gatewayCallbacks.error == "function") ? gatewayCallbacks.error : noop;
    gatewayCallbacks.destroyed = (typeof gatewayCallbacks.destroyed == "function") ? gatewayCallbacks.destroyed : noop;
    if(gatewayCallbacks.server === null || gatewayCallbacks.server === undefined) {
        gatewayCallbacks.error("Invalid gateway url");
        return {};
    }
    var websockets = false;

    var servers = null, serversIndex = 0;
    var server = gatewayCallbacks.server;
    // if($.isArray(server)) {
    // 	Janus.log("Multiple servers provided (" + server.length + "), will use the first that works");
    // 	server = null;
    // 	servers = gatewayCallbacks.server;
    // 	Janus.debug(servers);
    // } else {
    if(server.indexOf("ws") === 0) {
        websockets = true;
        Janus.log("Using WebSockets to contact Janus: " + server);
    } else {
        websockets = false;
        Janus.log("Using REST API to contact Janus: " + server);
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
    this.pluginHandles = {};
    this.that = this;
    this.retries = 0;
    this.transactions = {};

    // Private method to destroy a session
    function destroySession(callbacks) {
        callbacks = callbacks || {};
        // FIXME This method triggers a success even when we fail
        callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
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
            gatewayCallbacks.destroyed();
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
        var request = { "janus": "destroy", "transaction": randomString(12) };
        if(this.token !== null && this.token !== undefined)
            request["token"] = this.token;
        if(this.apisecret !== null && this.apisecret !== undefined)
            request["apisecret"] = this.apisecret;

        jsdom.env("",["http://code.jquery.com/jquery.min.js"], function(err, window) {
            if (err) {
                console.error(err);
                return;
            }
            var $ = window.$;
            $.support.cors = true;
            $.ajax({
                type: 'POST',
                url: server + "/" + this.sessionId,
                async: asyncRequest,	// Sometimes we need false here, or destroying in onbeforeunload won't work
                cache: false,
                contentType: "application/json",
                data: JSON.stringify(request),
                success: function(json) {
                    Janus.log("Destroyed session:");
                    Janus.debug(json);
                    this.sessionId = null;
                    this.connected = false;
                    if(json["janus"] !== "success") {
                        Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
                    }
                    callbacks.success();
                    gatewayCallbacks.destroyed();
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    Janus.error(textStatus + ": " + errorThrown);	// FIXME
                    // Reset everything anyway
                    this.sessionId = null;
                    this.connected = false;
                    callbacks.success();
                    gatewayCallbacks.destroyed();
                },
                dataType: "json"
            });
        });
        // $.ajax({
        // 	type: 'POST',
        // 	url: server + "/" + sessionId,
        // 	async: asyncRequest,	// Sometimes we need false here, or destroying in onbeforeunload won't work
        // 	cache: false,
        // 	contentType: "application/json",
        // 	data: JSON.stringify(request),
        // 	success: function(json) {
        // 		Janus.log("Destroyed session:");
        // 		Janus.debug(json);
        // 		sessionId = null;
        // 		connected = false;
        // 		if(json["janus"] !== "success") {
        // 			Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
        // 		}
        // 		callbacks.success();
        // 		gatewayCallbacks.destroyed();
        // 	},
        // 	error: function(XMLHttpRequest, textStatus, errorThrown) {
        // 		Janus.error(textStatus + ": " + errorThrown);	// FIXME
        // 		// Reset everything anyway
        // 		sessionId = null;
        // 		connected = false;
        // 		callbacks.success();
        // 		gatewayCallbacks.destroyed();
        // 	},
        // 	dataType: "json"
        // });
    };
    // Private method to create a plugin handle
    function createHandle(callbacks) {
        Janus.log("create handle begin ");
        Janus.log(typeof callbacks);
        callbacks = callbacks || {};
        Janus.log("create handle begin 0");
        callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
        Janus.log("create handle begin 01");
        callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
        Janus.log("create handle begin 02");
        callbacks.consentDialog = (typeof callbacks.consentDialog == "function") ? callbacks.consentDialog : jQuery.noop;
        Janus.log("create handle begin 03");
        callbacks.mediaState = (typeof callbacks.mediaState == "function") ? callbacks.mediaState : jQuery.noop;
        Janus.log("create handle begin 04");
        callbacks.webrtcState = (typeof callbacks.webrtcState == "function") ? callbacks.webrtcState : jQuery.noop;
        Janus.log("create handle begin 05");
        callbacks.slowLink = (typeof callbacks.slowLink == "function") ? callbacks.slowLink : jQuery.noop;
        Janus.log("create handle begin 06");
        callbacks.onmessage = (typeof callbacks.onmessage == "function") ? callbacks.onmessage : jQuery.noop;
        Janus.log("create handle begin 07");
        callbacks.onlocalstream = (typeof callbacks.onlocalstream == "function") ? callbacks.onlocalstream : jQuery.noop;
        Janus.log("create handle begin 08");
        callbacks.onremotestream = (typeof callbacks.onremotestream == "function") ? callbacks.onremotestream : jQuery.noop;
        Janus.log("create handle begin 09");
        callbacks.ondata = (typeof callbacks.ondata == "function") ? callbacks.ondata : jQuery.noop;
        Janus.log("create handle begin 10");
        callbacks.ondataopen = (typeof callbacks.ondataopen == "function") ? callbacks.ondataopen : jQuery.noop;
        Janus.log("create handle begin 11");
        callbacks.oncleanup = (typeof callbacks.oncleanup == "function") ? callbacks.oncleanup : jQuery.noop;
        Janus.log(typeof callbacks.ondetached);
        callbacks.ondetached = (typeof callbacks.ondetached == "function") ? callbacks.ondetached : jQuery.noop;
        Janus.log("create handle begin connect = ",this.connected);
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
        var request = { "janus": "attach", "plugin": plugin, "transaction": transaction };
        Janus.log("create handle 1 ",request);
        if(this.token !== null && this.token !== undefined)
            request["token"] = this.token;
        if(this.apisecret !== null && this.apisecret !== undefined)
            request["apisecret"] = this.apisecret;

        Janus.log("jsdom ajax post ",request);
        jsdom.env("",["http://code.jquery.com/jquery.min.js"], function(err, window) {
            if (err) {
                console.error(err);
                return;
            }
            var $ = window.$;
            $.support.cors = true;
            $.ajax({
                type: 'POST',
                url: server + "/" + this.sessionId,
                cache: false,
                contentType: "application/json",
                data: JSON.stringify(request),
                success: function(json) {
                    Janus.debug(json);
                    if(json["janus"] !== "success") {
                        Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
                        callbacks.error("Ooops: " + json["error"].code + " " + json["error"].reason);
                        return;
                    }
                    var handleId = json.data["id"];
                    Janus.log("Created handle: " + handleId);
                    var pluginHandle =
                        {
                            session : that,
                            plugin : plugin,
                            id : handleId,
                            webrtcStuff : {
                                started : false,
                                myStream : null,
                                streamExternal : false,
                                remoteStream : null,
                                mySdp : null,
                                pc : null,
                                dataChannel : null,
                                dtmfSender : null,
                                trickle : true,
                                iceDone : false,
                                sdpSent : false,
                                volume : {
                                    value : null,
                                    timer : null
                                },
                                bitrate : {
                                    value : null,
                                    bsnow : null,
                                    bsbefore : null,
                                    tsnow : null,
                                    tsbefore : null,
                                    timer : null
                                }
                            },
                            getId : function() { return handleId; },
                            getPlugin : function() { return plugin; },
                            getVolume : function() { return getVolume(handleId); },
                            isAudioMuted : function() { return isMuted(handleId, false); },
                            muteAudio : function() { return mute(handleId, false, true); },
                            unmuteAudio : function() { return mute(handleId, false, false); },
                            isVideoMuted : function() { return isMuted(handleId, true); },
                            muteVideo : function() { return mute(handleId, true, true); },
                            unmuteVideo : function() { return mute(handleId, true, false); },
                            getBitrate : function() { return getBitrate(handleId); },
                            send : function(callbacks) { sendMessage(handleId, callbacks); },
                            data : function(callbacks) { sendData(handleId, callbacks); },
                            dtmf : function(callbacks) { sendDtmf(handleId, callbacks); },
                            consentDialog : callbacks.consentDialog,
                            mediaState : callbacks.mediaState,
                            webrtcState : callbacks.webrtcState,
                            slowLink : callbacks.slowLink,
                            onmessage : callbacks.onmessage,
                            createOffer : function(callbacks) { prepareWebrtc(handleId, callbacks); },
                            createAnswer : function(callbacks) { prepareWebrtc(handleId, callbacks); },
                            sendTrickle : function(callbacks) { sendTrickleCandidate(handleId,callbacks);},
                            handleRemoteJsep : function(callbacks) { prepareWebrtcPeer(handleId, callbacks); },
                            onlocalstream : callbacks.onlocalstream,
                            onremotestream : callbacks.onremotestream,
                            ondata : callbacks.ondata,
                            ondataopen : callbacks.ondataopen,
                            oncleanup : callbacks.oncleanup,
                            ondetached : callbacks.ondetached,
                            hangup : function(sendRequest) { cleanupWebrtc(handleId, sendRequest === true); },
                            detach : function(callbacks) { destroyHandle(handleId, callbacks); }
                        };
                    this.pluginHandles[handleId] = pluginHandle;
                    callbacks.success(pluginHandle);
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    Janus.error(textStatus + ": " + errorThrown);	// FIXME
                },
                dataType: "json"
            });
        });
        // $.ajax({
        // 	type: 'POST',
        // 	url: server + "/" + sessionId,
        // 	cache: false,
        // 	contentType: "application/json",
        // 	data: JSON.stringify(request),
        // 	success: function(json) {
        // 		Janus.debug(json);
        // 		if(json["janus"] !== "success") {
        // 			Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
        // 			callbacks.error("Ooops: " + json["error"].code + " " + json["error"].reason);
        // 			return;
        // 		}
        // 		var handleId = json.data["id"];
        // 		Janus.log("Created handle: " + handleId);
        // 		var pluginHandle =
        // 			{
        // 				session : that,
        // 				plugin : plugin,
        // 				id : handleId,
        // 				webrtcStuff : {
        // 					started : false,
        // 					myStream : null,
        // 					streamExternal : false,
        // 					remoteStream : null,
        // 					mySdp : null,
        // 					pc : null,
        // 					dataChannel : null,
        // 					dtmfSender : null,
        // 					trickle : true,
        // 					iceDone : false,
        // 					sdpSent : false,
        // 					volume : {
        // 						value : null,
        // 						timer : null
        // 					},
        // 					bitrate : {
        // 						value : null,
        // 						bsnow : null,
        // 						bsbefore : null,
        // 						tsnow : null,
        // 						tsbefore : null,
        // 						timer : null
        // 					}
        // 				},
        // 				getId : function() { return handleId; },
        // 				getPlugin : function() { return plugin; },
        // 				getVolume : function() { return getVolume(handleId); },
        // 				isAudioMuted : function() { return isMuted(handleId, false); },
        // 				muteAudio : function() { return mute(handleId, false, true); },
        // 				unmuteAudio : function() { return mute(handleId, false, false); },
        // 				isVideoMuted : function() { return isMuted(handleId, true); },
        // 				muteVideo : function() { return mute(handleId, true, true); },
        // 				unmuteVideo : function() { return mute(handleId, true, false); },
        // 				getBitrate : function() { return getBitrate(handleId); },
        // 				send : function(callbacks) { sendMessage(handleId, callbacks); },
        // 				data : function(callbacks) { sendData(handleId, callbacks); },
        // 				dtmf : function(callbacks) { sendDtmf(handleId, callbacks); },
        // 				consentDialog : callbacks.consentDialog,
        // 				mediaState : callbacks.mediaState,
        // 				webrtcState : callbacks.webrtcState,
        // 				slowLink : callbacks.slowLink,
        // 				onmessage : callbacks.onmessage,
        // 				createOffer : function(callbacks) { prepareWebrtc(handleId, callbacks); },
        // 				createAnswer : function(callbacks) { prepareWebrtc(handleId, callbacks); },
        // 				handleRemoteJsep : function(callbacks) { prepareWebrtcPeer(handleId, callbacks); },
        // 				onlocalstream : callbacks.onlocalstream,
        // 				onremotestream : callbacks.onremotestream,
        // 				ondata : callbacks.ondata,
        // 				ondataopen : callbacks.ondataopen,
        // 				oncleanup : callbacks.oncleanup,
        // 				ondetached : callbacks.ondetached,
        // 				hangup : function(sendRequest) { cleanupWebrtc(handleId, sendRequest === true); },
        // 				detach : function(callbacks) { destroyHandle(handleId, callbacks); }
        // 			}
        // 		pluginHandles[handleId] = pluginHandle;
        // 		callbacks.success(pluginHandle);
        // 	},
        // 	error: function(XMLHttpRequest, textStatus, errorThrown) {
        // 		Janus.error(textStatus + ": " + errorThrown);	// FIXME
        // 	},
        // 	dataType: "json"
        // });
    }


    // Public methods
    function getServer() { return server; };
    function isConnected() { return this.connected; };
    function getSessionId() { return this.sessionId; };
    function destroy(callbacks) { destroySession(callbacks); };
    function attach(callbacks) { createHandle(callbacks); };

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

    function eventHandler() {
        if(this.sessionId == null)
            return;
        Janus.debug('Long poll...');
        if(!this.connected) {
            Janus.warn("Is the gateway down? (connected=false)");
            return;
        }
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
            url:server,
            method:"POST",
            json:request
            // json:true,
            // headers:{"contentType": "application/json"},
            // body:JSON.stringify(request),
            },function (err, res, body) {
                console.log(body);
                if(err == null){
                    handleEvent(body);

                }else {
                    (function( textStatus, errorThrown) {
                        Janus.error(textStatus + ": " + errorThrown);
                        //~ clearTimeout(timeoutTimer);
                        this.retries++;
                        if(this.retries > 3) {
                            // Did we just lose the gateway? :-(
                            this.connected = false;
                            gatewayCallbacks.error("Lost connection to the gateway (is it down?)");
                            return;
                        }
                        eventHandler();
                    })(err.code,err.errno);
                }
            });
        cli_request.settimeout(6000,function () {
            eventHandler();
        });


        // jsdom.env("",["http://code.jquery.com/jquery.min.js"], function(err, window) {
        //     if (err) {
        //         console.error(err);
        //         return;
        //     }
        //     var $ = window.$;
        //     $.support.cors = true;
        //     $.ajax({
        //         type: 'GET',
        //         url: longpoll,
        //         cache: false,
        //         timeout: 60000,	// FIXME
        //         success: handleEvent,
        //         error: function(XMLHttpRequest, textStatus, errorThrown) {
        //             Janus.error(textStatus + ": " + errorThrown);
        //             //~ clearTimeout(timeoutTimer);
        //             this.retries++;
        //             if(retries > 3) {
        //                 // Did we just lose the gateway? :-(
        //                 this.connected = false;
        //                 gatewayCallbacks.error("Lost connection to the gateway (is it down?)");
        //                 return;
        //             }
        //             eventHandler();
        //         },
        //         dataType: "json"
        //     });
        // });

    };

    // Private event handler: this will trigger plugin callbacks, if set
    function handleEvent (json) {
        this.retries = 0;
        Janus.log("handle :",json);
        Janus.log(Array.isArray(json));
        if(!websockets && this.sessionId !== undefined && this.sessionId !== null)
            setTimeout(eventHandler, 200);
        if(!websockets && Array.isArray(json)) {
            // We got an array: it means we passed a maxev > 1, iterate on all objects
            for(var i=0; i<json.length; i++) {
                handleEvent(json[i]);
            }
            return;
        }
        Janus.log("begin parse event");
        if(json["janus"] === "keepalive") {
            // Nothing happened
            Janus.vdebug("Got a keepalive on session " + this.sessionId);
            return;
        } else if(json["janus"] === "ack") {
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
        } else if(json["janus"] === "success") {
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
        } else if(json["janus"] === "webrtcup") {
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
        } else if(json["janus"] === "hangup") {
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
        } else if(json["janus"] === "detached") {
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
        } else if(json["janus"] === "media") {
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
        } else if(json["janus"] === "slowlink") {
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
        } else if(json["janus"] === "error") {
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
        } else if(json["janus"] === "event") {
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
            Janus.warn("Unkown message/event  '" + json["janus"] + "' on session " + sessionId);
            Janus.debug(json);
        }
    };

    function createSession(callbacks) {
        var transaction = randomString(12);
        var request = { "janus": "create", "transaction": transaction };
        if(this.token !== null && this.token !== undefined)
            request["token"] = this.token;
        if(this.apisecret !== null && this.apisecret !== undefined)
            request["apisecret"] = this.apisecret;
        if(server === null ) {
            // We still need to find a working server from the list we were given
            server = servers[serversIndex];
            if(server.indexOf("ws") === 0) {
                websockets = true;
                Janus.log("Server #" + (serversIndex+1) + ": trying WebSockets to contact Janus (" + server + ")");
            } else {
                websockets = false;
                Janus.log("Server #" + (serversIndex+1) + ": trying REST API to contact Janus (" + server + ")");
            }
        }
        console.log(request);
        cli_request({
                url:server,
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
                            if(json["janus"] !== "success") {
                                Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
                                callbacks.error(json["error"].reason);
                                return;
                            }
                            this.connected = true;
                            this.sessionId = json.data["id"];
                            Janus.log("Created session: " + this.sessionId);
                            Janus.sessions[this.sessionId] = this.that;
                            var sss = getServer();
                            eventHandler();
                            callbacks.success();
                        })(body);
                    }else {
                        (function( textStatus, errorThrown) {
                            Janus.error(textStatus + ": " + errorThrown);	// FIXME
                            if(Array.isArray(servers)) {
                                serversIndex++;
                                if(serversIndex == servers.length) {
                                    // We tried all the servers the user gave us and they all failed
                                    callbacks.error("Error connecting to any of the provided Janus servers: Is the gateway down?");
                                    return;
                                }
                                // Let's try the next server
                                server = null;
                                setTimeout(function() { this.createSession(callbacks); }, 200);
                                return;
                            }
                            if(errorThrown === "")
                                callbacks.error(textStatus + ": Is the gateway down?");
                            else
                                callbacks.error(textStatus + ": " + errorThrown);
                        })(err.code,err.errno);
                    }
            });

        // jsdom.env("",["http://code.jquery.com/jquery.min.js"], function(err, window) {
        //     if (err) {
        //         console.error(err);
        //         return;
        //     }
        //     var $ = window.$;
        //     $.support.cors = true;
        //     $.ajax({
        //         type: 'POST',
        //         url: server,
        //         cache: false,
        //         contentType: "application/json",
        //         data: JSON.stringify(request),
        //         success: function(json) {
        //             Janus.debug(json);
        //             if(json["janus"] !== "success") {
        //                 Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
        //                 callbacks.error(json["error"].reason);
        //                 return;
        //             }
        //             this.connected = true;
        //             this.sessionId = json.data["id"];
        //             Janus.log("Created session: " + this.sessionId);
        //             Janus.sessions[this.sessionId] = this.that;
        //             var sss = getServer();
        //             eventHandler();
        //             callbacks.success();
        //         },
        //         error: function(XMLHttpRequest, textStatus, errorThrown) {
        //             Janus.error(textStatus + ": " + errorThrown);	// FIXME
        //             if(Array.isArray(servers)) {
        //                 serversIndex++;
        //                 if(serversIndex == servers.length) {
        //                     // We tried all the servers the user gave us and they all failed
        //                     callbacks.error("Error connecting to any of the provided Janus servers: Is the gateway down?");
        //                     return;
        //                 }
        //                 // Let's try the next server
        //                 server = null;
        //                 setTimeout(function() { this.createSession(callbacks); }, 200);
        //                 return;
        //             }
        //             if(errorThrown === "")
        //                 callbacks.error(textStatus + ": Is the gateway down?");
        //             else
        //                 callbacks.error(textStatus + ": " + errorThrown);
        //         },
        //         dataType: "json"
        //     });
        // });

    }

    createSession(gatewayCallbacks);

};

Janus.sessions = {};

Janus.noop = function() {};


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

exports.Janus = Janus;
exports.Init = Init;



