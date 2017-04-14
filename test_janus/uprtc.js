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
var request = require('http');
var fs = require('fs');
var $ = null;

var jsdom = require("jsdom");
eval(fs.readFileSync('adapter.js')+'');
// require("jsdom").env("", function(err, window) {
//     if (err) {
//         console.error(err);
//         return;
//     }

//     $ = require("jquery")(window);
// });
// List of sessions
Janus.sessions = {};

// Screensharing Chrome Extension ID
Janus.extensionId = "hapfgfdkleiggjjpfpenajgdnfckjpaj";
Janus.isExtensionEnabled = function() {
    return true;
};

Janus.noop = function() {};

// Initialization
Janus.init = function(options) {
    options = options || {};
    options.callback = (typeof options.callback == "function") ? options.callback : Janus.noop;
    if(Janus.initDone === true) {
        // Already initialized
        options.callback();
    } else {
        if(typeof console == "undefined" || typeof console.log == "undefined")
            console = { log: function() {} };
        // Console logging (all debugging disabled by default)
        Janus.trace = Janus.noop;
        Janus.debug = Janus.noop;
        Janus.vdebug = Janus.noop;
        Janus.log = Janus.noop;
        Janus.warn = Janus.noop;
        Janus.error = Janus.noop;
        if(options.debug === true || options.debug === "all") {
            // Enable all debugging levels
            Janus.trace = console.trace.bind(console);
            Janus.debug = console.log.bind(console);
            Janus.vdebug = console.log.bind(console);
            Janus.log = console.log.bind(console);
            Janus.warn = console.warn.bind(console);
            Janus.error = console.error.bind(console);
        } else if(Array.isArray(options.debug)) {
            for(var i in options.debug) {
                var d = options.debug[i];
                switch(d) {
                    case "trace":
                        Janus.trace = console.trace.bind(console);
                        break;
                    case "debug":
                        Janus.debug = console.debug.bind(console);
                        break;
                    case "vdebug":
                        Janus.vdebug = console.debug.bind(console);
                        break;
                    case "log":
                        Janus.log = console.log.bind(console);
                        break;
                    case "warn":
                        Janus.warn = console.warn.bind(console);
                        break;
                    case "error":
                        Janus.error = console.error.bind(console);
                        break;
                    default:
                        console.error("Unknown debugging option '" + d + "' (supported: 'trace', 'debug', 'vdebug', 'log', warn', 'error')");
                        break;
                }
            }
        }
        Janus.log("Initializing library");
        // Helper method to enumerate devices
        Janus.listDevices = function(callback) {

        }
        // Helper methods to attach/reattach a stream to a video element (previously part of adapter.js)
        Janus.attachMediaStream = function(element, stream) {
        };
        Janus.reattachMediaStream = function(to, from) {
        };
        // Detect tab close: make sure we don't loose existing onbeforeunload handlers
        // var oldOBF = window.onbeforeunload;
        // window.onbeforeunload = function() {
        // 	Janus.log("Closing window");
        // 	for(var s in Janus.sessions) {
        // 		if(Janus.sessions[s] !== null && Janus.sessions[s] !== undefined &&
        // 				Janus.sessions[s].destroyOnUnload) {
        // 			Janus.log("Destroying session " + s);
        // 			Janus.sessions[s].destroy({asyncRequest: false});
        // 		}
        // 	}
        // 	if(oldOBF && typeof oldOBF == "function")
        // 		oldOBF();
        // }
        function addJsList(srcArray) {
            Janus.log("aad js list: addJsList 1");
            if (!srcArray || !Array.isArray(srcArray) || srcArray.length == 0) {
                Janus.log("aad js list: addJsList 11");
                options.callback();
            }
            var count = 0;
            options.callback();
            //addJs(srcArray[count],next);
            Janus.log("aad js list: addJsList 2");
            function next() {
                count++;
                if (count<srcArray.length) {
                    addJs(srcArray[count],next);
                }
                else {
                    Janus.log("aad js list: addJsList 22");
                    options.callback();
                }
            }
        }
        function addJs(src,done) {
            options.callback();
            if(src === 'jquery.min.js') {
                if(window.jQuery) {
                    // Already loaded
                    Janus.debug(src + " already loaded, skipping");
                    done();
                    return;
                }
            }
            if(src === 'adapter.js') {
                try {
                    if(adapter) {
                        // Already loaded
                        Janus.debug(src + " already loaded, skipping");
                        done();
                        return;
                    }
                } catch(e) {};
            }
            // var oHead = document.getElementsByTagName('head').item(0);
            // var oScript = document.createElement("script");
            // oScript.type = "text/javascript";
            // oScript.src = src;
            // oScript.onload = function() {
            // 	Janus.log("Library " + src + " loaded");
            // 	done();
            // }
            // oHead.appendChild(oScript);
        }
        Janus.initDone = true;
        addJsList(["adapter.js", "jquery.min.js"]);
    }
};

// Helper method to check whether WebRTC is supported by this browser
Janus.isWebrtcSupported = function() {
    return window.RTCPeerConnection !== undefined && window.RTCPeerConnection !== null &&
        navigator.getUserMedia !== undefined && navigator.getUserMedia !== null;
};

function Janus(gatewayCallbacks) {
    if(Janus.initDone === undefined) {
        gatewayCallbacks.error("Library not initialized");
        return {};
    }
    // if(!Janus.isWebrtcSupported()) {
    // 	gatewayCallbacks.error("WebRTC not supported by this browser");
    // 	return {};
    // }
    Janus.log("Library initialized: " + Janus.initDone);
    gatewayCallbacks = gatewayCallbacks || {};
    gatewayCallbacks.success = (typeof gatewayCallbacks.success == "function") ? gatewayCallbacks.success : jQuery.noop;
    gatewayCallbacks.error = (typeof gatewayCallbacks.error == "function") ? gatewayCallbacks.error : jQuery.noop;
    gatewayCallbacks.destroyed = (typeof gatewayCallbacks.destroyed == "function") ? gatewayCallbacks.destroyed : jQuery.noop;
    if(gatewayCallbacks.server === null || gatewayCallbacks.server === undefined) {
        gatewayCallbacks.error("Invalid gateway url");
        return {};
    }
    var websockets = false;
    var ws = null;
    var wsHandlers = {};
    var wsKeepaliveTimeoutId = null;

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
    //}
    // var iceServers = gatewayCallbacks.iceServers;
    // if(iceServers === undefined || iceServers === null)
    //     iceServers = [{urls: "stun:stun.l.google.com:19302"}];
    // var iceTransportPolicy = gatewayCallbacks.iceTransportPolicy;
    // // Whether IPv6 candidates should be gathered
    // var ipv6Support = gatewayCallbacks.ipv6;
    // if(ipv6Support === undefined || ipv6Support === null)
    //     ipv6Support = false;
    // Optional max events
    var maxev = null;
    if(gatewayCallbacks.max_poll_events !== undefined && gatewayCallbacks.max_poll_events !== null)
        maxev = gatewayCallbacks.max_poll_events;
    if(maxev < 1)
        maxev = 1;
    // Token to use (only if the token based authentication mechanism is enabled)
    var token = null;
    if(gatewayCallbacks.token !== undefined && gatewayCallbacks.token !== null)
        token = gatewayCallbacks.token;
    // API secret to use (only if the shared API secret is enabled)
    var apisecret = null;
    if(gatewayCallbacks.apisecret !== undefined && gatewayCallbacks.apisecret !== null)
        apisecret = gatewayCallbacks.apisecret;
    // Whether we should destroy this session when onbeforeunload is called
    this.destroyOnUnload = true;
    if(gatewayCallbacks.destroyOnUnload !== undefined && gatewayCallbacks.destroyOnUnload !== null)
        this.destroyOnUnload = (gatewayCallbacks.destroyOnUnload === true);

    var connected = false;
    var sessionId = null;
    var pluginHandles = {};
    var that = this;
    var retries = 0;
    var transactions = {};
    createSession(gatewayCallbacks);

    // Public methods
    this.getServer = function() { return server; };
    this.isConnected = function() { return connected; };
    this.getSessionId = function() { return sessionId; };
    this.destroy = function(callbacks) { destroySession(callbacks); };
    this.attach = function(callbacks) { createHandle(callbacks); };

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
        if(sessionId == null)
            return;
        Janus.debug('Long poll...');
        if(!connected) {
            Janus.warn("Is the gateway down? (connected=false)");
            return;
        }
        var longpoll = server + "/" + sessionId + "?rid=" + new Date().getTime();
        if(maxev !== undefined && maxev !== null)
            longpoll = longpoll + "&maxev=" + maxev;
        if(token !== null && token !== undefined)
            longpoll = longpoll + "&token=" + token;
        if(apisecret !== null && apisecret !== undefined)
            longpoll = longpoll + "&apisecret=" + apisecret;

        jsdom.env("",["http://code.jquery.com/jquery.min.js"], function(err, window) {
            if (err) {
                console.error(err);
                return;
            }
            var $ = window.$;
            $.support.cors = true;
            $.ajax({
                type: 'GET',
                url: longpoll,
                cache: false,
                timeout: 60000,	// FIXME
                success: handleEvent,
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    Janus.error(textStatus + ": " + errorThrown);
                    //~ clearTimeout(timeoutTimer);
                    retries++;
                    if(retries > 3) {
                        // Did we just lose the gateway? :-(
                        connected = false;
                        gatewayCallbacks.error("Lost connection to the gateway (is it down?)");
                        return;
                    }
                    eventHandler();
                },
                dataType: "json"
            });
        });

        // $.ajax({
        // 	type: 'GET',
        // 	url: longpoll,
        // 	cache: false,
        // 	timeout: 60000,	// FIXME
        // 	success: handleEvent,
        // 	error: function(XMLHttpRequest, textStatus, errorThrown) {
        // 		Janus.error(textStatus + ": " + errorThrown);
        // 		//~ clearTimeout(timeoutTimer);
        // 		retries++;
        // 		if(retries > 3) {
        // 			// Did we just lose the gateway? :-(
        // 			connected = false;
        // 			gatewayCallbacks.error("Lost connection to the gateway (is it down?)");
        // 			return;
        // 		}
        // 		eventHandler();
        // 	},
        // 	dataType: "json"
        // });
    }

    // Private event handler: this will trigger plugin callbacks, if set
    function handleEvent(json) {
        retries = 0;
        Janus.log("handle :",json);
        Janus.log(Array.isArray(json));
        if(!websockets && sessionId !== undefined && sessionId !== null)
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
            Janus.vdebug("Got a keepalive on session " + sessionId);
            return;
        } else if(json["janus"] === "ack") {
            // Just an ack, we can probably ignore
            Janus.debug("Got an ack on session " + sessionId);
            Janus.debug(json);
            var transaction = json["transaction"];
            if(transaction !== null && transaction !== undefined) {
                var reportSuccess = transactions[transaction];
                if(reportSuccess !== null && reportSuccess !== undefined) {
                    reportSuccess(json);
                }
                delete transactions[transaction];
            }
            return;
        } else if(json["janus"] === "success") {
            // Success!
            Janus.debug("Got a success on session " + sessionId);
            Janus.debug(json);
            var transaction = json["transaction"];
            if(transaction !== null && transaction !== undefined) {
                var reportSuccess = transactions[transaction];
                if(reportSuccess !== null && reportSuccess !== undefined) {
                    reportSuccess(json);
                }
                delete transactions[transaction];
            }
            return;
        } else if(json["janus"] === "webrtcup") {
            // The PeerConnection with the gateway is up! Notify this
            Janus.debug("Got a webrtcup event on session " + sessionId);
            Janus.debug(json);
            var sender = json["sender"];
            if(sender === undefined || sender === null) {
                Janus.warn("Missing sender...");
                return;
            }
            var pluginHandle = pluginHandles[sender];
            if(pluginHandle === undefined || pluginHandle === null) {
                Janus.warn("This handle is not attached to this session");
                return;
            }
            pluginHandle.webrtcState(true);
            return;
        } else if(json["janus"] === "hangup") {
            // A plugin asked the core to hangup a PeerConnection on one of our handles
            Janus.debug("Got a hangup event on session " + sessionId);
            Janus.debug(json);
            var sender = json["sender"];
            if(sender === undefined || sender === null) {
                Janus.warn("Missing sender...");
                return;
            }
            var pluginHandle = pluginHandles[sender];
            if(pluginHandle === undefined || pluginHandle === null) {
                Janus.warn("This handle is not attached to this session");
                return;
            }
            pluginHandle.webrtcState(false);
            pluginHandle.hangup();
        } else if(json["janus"] === "detached") {
            // A plugin asked the core to detach one of our handles
            Janus.debug("Got a detached event on session " + sessionId);
            Janus.debug(json);
            var sender = json["sender"];
            if(sender === undefined || sender === null) {
                Janus.warn("Missing sender...");
                return;
            }
            var pluginHandle = pluginHandles[sender];
            if(pluginHandle === undefined || pluginHandle === null) {
                // Don't warn here because destroyHandle causes this situation.
                return;
            }
            pluginHandle.ondetached();
            pluginHandle.detach();
        } else if(json["janus"] === "media") {
            // Media started/stopped flowing
            Janus.debug("Got a media event on session " + sessionId);
            Janus.debug(json);
            var sender = json["sender"];
            if(sender === undefined || sender === null) {
                Janus.warn("Missing sender...");
                return;
            }
            var pluginHandle = pluginHandles[sender];
            if(pluginHandle === undefined || pluginHandle === null) {
                Janus.warn("This handle is not attached to this session");
                return;
            }
            pluginHandle.mediaState(json["type"], json["receiving"]);
        } else if(json["janus"] === "slowlink") {
            Janus.debug("Got a slowlink event on session " + sessionId);
            Janus.debug(json);
            // Trouble uplink or downlink
            var sender = json["sender"];
            if(sender === undefined || sender === null) {
                Janus.warn("Missing sender...");
                return;
            }
            var pluginHandle = pluginHandles[sender];
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
                var reportSuccess = transactions[transaction];
                if(reportSuccess !== null && reportSuccess !== undefined) {
                    reportSuccess(json);
                }
                delete transactions[transaction];
            }
            return;
        } else if(json["janus"] === "event") {
            Janus.debug("Got a plugin event on session " + sessionId);
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
            var pluginHandle = pluginHandles[sender];
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
    }

    // Private helper to send keep-alive messages on WebSockets
    function keepAlive() {
        if(server === null || !websockets || !connected)
            return;
        wsKeepaliveTimeoutId = setTimeout(keepAlive, 30000);
        var request = { "janus": "keepalive", "session_id": sessionId, "transaction": randomString(12) };
        if(token !== null && token !== undefined)
            request["token"] = token;
        if(apisecret !== null && apisecret !== undefined)
            request["apisecret"] = apisecret;
        ws.send(JSON.stringify(request));
    }

    // Private method to create a session
    function createSession(callbacks) {
        var transaction = randomString(12);
        var request = { "janus": "create", "transaction": transaction };
        if(token !== null && token !== undefined)
            request["token"] = token;
        if(apisecret !== null && apisecret !== undefined)
            request["apisecret"] = apisecret;
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
        if(websockets) {
            ws = new WebSocket(server, 'janus-protocol');
            wsHandlers = {
                'error': function() {
                    Janus.error("Error connecting to the Janus WebSockets server... " + server);
                    if (Array.isArray(servers)) {
                        serversIndex++;
                        if (serversIndex == servers.length) {
                            // We tried all the servers the user gave us and they all failed
                            callbacks.error("Error connecting to any of the provided Janus servers: Is the gateway down?");
                            return;
                        }
                        // Let's try the next server
                        server = null;
                        setTimeout(function() {
                            createSession(callbacks);
                        }, 200);
                        return;
                    }
                    callbacks.error("Error connecting to the Janus WebSockets server: Is the gateway down?");
                },

                'open': function() {
                    // We need to be notified about the success
                    transactions[transaction] = function(json) {
                        Janus.debug(json);
                        if (json["janus"] !== "success") {
                            Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
                            callbacks.error(json["error"].reason);
                            return;
                        }
                        wsKeepaliveTimeoutId = setTimeout(keepAlive, 30000);
                        connected = true;
                        sessionId = json.data["id"];
                        Janus.log("Created session: " + sessionId);
                        Janus.sessions[sessionId] = that;
                        callbacks.success();
                    };
                    ws.send(JSON.stringify(request));
                },

                'message': function(event) {
                    handleEvent(JSON.parse(event.data));
                },

                'close': function() {
                    if (server === null || !connected) {
                        return;
                    }
                    connected = false;
                    // FIXME What if this is called when the page is closed?
                    gatewayCallbacks.error("Lost connection to the gateway (is it down?)");
                }
            };

            for(var eventName in wsHandlers) {
                ws.addEventListener(eventName, wsHandlers[eventName]);
            }

            return;
        }
        jsdom.env("",["http://code.jquery.com/jquery.min.js"], function(err, window) {
            if (err) {
                console.error(err);
                return;
            }
            var $ = window.$;
            $.support.cors = true;
            $.ajax({
                type: 'POST',
                url: server,
                cache: false,
                contentType: "application/json",
                data: JSON.stringify(request),
                success: function(json) {
                    Janus.debug(json);
                    if(json["janus"] !== "success") {
                        Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
                        callbacks.error(json["error"].reason);
                        return;
                    }
                    connected = true;
                    sessionId = json.data["id"];
                    Janus.log("Created session: " + sessionId);
                    Janus.sessions[sessionId] = that;
                    eventHandler();
                    callbacks.success();
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
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
                        setTimeout(function() { createSession(callbacks); }, 200);
                        return;
                    }
                    if(errorThrown === "")
                        callbacks.error(textStatus + ": Is the gateway down?");
                    else
                        callbacks.error(textStatus + ": " + errorThrown);
                },
                dataType: "json"
            });
        });
        // $.ajax({
        // 	type: 'POST',
        // 	url: server,
        // 	cache: false,
        // 	contentType: "application/json",
        // 	data: JSON.stringify(request),
        // 	success: function(json) {
        // 		Janus.debug(json);
        // 		if(json["janus"] !== "success") {
        // 			Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
        // 			callbacks.error(json["error"].reason);
        // 			return;
        // 		}
        // 		connected = true;
        // 		sessionId = json.data["id"];
        // 		Janus.log("Created session: " + sessionId);
        // 		Janus.sessions[sessionId] = that;
        // 		eventHandler();
        // 		callbacks.success();
        // 	},
        // 	error: function(XMLHttpRequest, textStatus, errorThrown) {
        // 		Janus.error(textStatus + ": " + errorThrown);	// FIXME
        // 		if($.isArray(servers)) {
        // 			serversIndex++;
        // 			if(serversIndex == servers.length) {
        // 				// We tried all the servers the user gave us and they all failed
        // 				callbacks.error("Error connecting to any of the provided Janus servers: Is the gateway down?");
        // 				return;
        // 			}
        // 			// Let's try the next server
        // 			server = null;
        // 			setTimeout(function() { createSession(callbacks); }, 200);
        // 			return;
        // 		}
        // 		if(errorThrown === "")
        // 			callbacks.error(textStatus + ": Is the gateway down?");
        // 		else
        // 			callbacks.error(textStatus + ": " + errorThrown);
        // 	},
        // 	dataType: "json"
        // });
    }

    // Private method to destroy a session
    function destroySession(callbacks) {
        callbacks = callbacks || {};
        // FIXME This method triggers a success even when we fail
        callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
        var asyncRequest = true;
        if(callbacks.asyncRequest !== undefined && callbacks.asyncRequest !== null)
            asyncRequest = (callbacks.asyncRequest === true);
        Janus.log("Destroying session " + sessionId + " (async=" + asyncRequest + ")");
        if(!connected) {
            Janus.warn("Is the gateway down? (connected=false)");
            callbacks.success();
            return;
        }
        if(sessionId === undefined || sessionId === null) {
            Janus.warn("No session to destroy");
            callbacks.success();
            gatewayCallbacks.destroyed();
            return;
        }
        delete Janus.sessions[sessionId];
        // Destroy all handles first
        for(var ph in pluginHandles) {
            var phv = pluginHandles[ph];
            Janus.log("Destroying handle " + phv.id + " (" + phv.plugin + ")");
            destroyHandle(phv.id, {asyncRequest: asyncRequest});
        }
        // Ok, go on
        var request = { "janus": "destroy", "transaction": randomString(12) };
        if(token !== null && token !== undefined)
            request["token"] = token;
        if(apisecret !== null && apisecret !== undefined)
            request["apisecret"] = apisecret;
        if(websockets) {
            request["session_id"] = sessionId;

            var unbindWebSocket = function() {
                for(var eventName in wsHandlers) {
                    ws.removeEventListener(eventName, wsHandlers[eventName]);
                }
                ws.removeEventListener('message', onUnbindMessage);
                ws.removeEventListener('error', onUnbindError);
                if(wsKeepaliveTimeoutId) {
                    clearTimeout(wsKeepaliveTimeoutId);
                }
            };

            var onUnbindMessage = function(event){
                var data = JSON.parse(event.data);
                if(data.session_id == request.session_id && data.transaction == request.transaction) {
                    unbindWebSocket();
                    callbacks.success();
                    gatewayCallbacks.destroyed();
                }
            };
            var onUnbindError = function(event) {
                unbindWebSocket();
                callbacks.error("Failed to destroy the gateway: Is the gateway down?");
                gatewayCallbacks.destroyed();
            };

            ws.addEventListener('message', onUnbindMessage);
            ws.addEventListener('error', onUnbindError);

            ws.send(JSON.stringify(request));
            return;
        }
        jsdom.env("",["http://code.jquery.com/jquery.min.js"], function(err, window) {
            if (err) {
                console.error(err);
                return;
            }
            var $ = window.$;
            $.support.cors = true;
            $.ajax({
                type: 'POST',
                url: server + "/" + sessionId,
                async: asyncRequest,	// Sometimes we need false here, or destroying in onbeforeunload won't work
                cache: false,
                contentType: "application/json",
                data: JSON.stringify(request),
                success: function(json) {
                    Janus.log("Destroyed session:");
                    Janus.debug(json);
                    sessionId = null;
                    connected = false;
                    if(json["janus"] !== "success") {
                        Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
                    }
                    callbacks.success();
                    gatewayCallbacks.destroyed();
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    Janus.error(textStatus + ": " + errorThrown);	// FIXME
                    // Reset everything anyway
                    sessionId = null;
                    connected = false;
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
    }

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
        Janus.log("create handle begin connect = ",connected);
        if(!connected) {
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
        if(token !== null && token !== undefined)
            request["token"] = token;
        if(apisecret !== null && apisecret !== undefined)
            request["apisecret"] = apisecret;
        if(websockets) {
            transactions[transaction] = function(json) {
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
                    }
                pluginHandles[handleId] = pluginHandle;
                Janus.log("beging websocket success ")
                callbacks.success(pluginHandle);
            };
            request["session_id"] = sessionId;
            ws.send(JSON.stringify(request));
            return;
        }
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
                url: server + "/" + sessionId,
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
                        }
                    pluginHandles[handleId] = pluginHandle;
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

    // Private method to send a message
    function sendMessage(handleId, callbacks) {
        Janus.log("send message begin :",handleId);
        callbacks = callbacks || {};
        Janus.log(typeof callbacks.success);
        Janus.log(typeof callbacks.error);
        callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
        callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
        if(!connected) {
            Janus.warn("Is the gateway down? (connected=false)");
            callbacks.error("Is the gateway down? (connected=false)");
            return;
        }
        Janus.log("send message begin 0");
        var message = callbacks.message;
        var jsep = callbacks.jsep;
        var transaction = randomString(12);
        var request = { "janus": "message", "body": message, "transaction": transaction };
        if(token !== null && token !== undefined)
            request["token"] = token;
        if(apisecret !== null && apisecret !== undefined)
            request["apisecret"] = apisecret;
        if(jsep !== null && jsep !== undefined)
            request.jsep = jsep;
        Janus.debug("Sending message to plugin (handle=" + handleId + "):");
        Janus.debug(request);
        if(websockets) {
            request["session_id"] = sessionId;
            request["handle_id"] = handleId;
            transactions[transaction] = function(json) {
                Janus.debug("Message sent!");
                Janus.debug(json);
                if(json["janus"] === "success") {
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
                } else if(json["janus"] !== "ack") {
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
                callbacks.success();
            };
            ws.send(JSON.stringify(request));
            return;
        }
        jsdom.env("",["http://code.jquery.com/jquery.min.js"], function(err, window) {
            if (err) {
                console.error(err);
                return;
            }
            var $ = window.$;
            $.support.cors = true;
            $.ajax({
                type: 'POST',
                url: server + "/" + sessionId + "/" + handleId,
                cache: false,
                contentType: "application/json",
                data: JSON.stringify(request),
                success: function(json) {
                    Janus.debug("Message send!");
                    Janus.debug(json);
                    if(json["janus"] === "success") {
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
                    } else if(json["janus"] !== "ack") {
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
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    Janus.error(textStatus + ": " + errorThrown);	// FIXME
                    callbacks.error(textStatus + ": " + errorThrown);
                },
                dataType: "json"
            });
        });
        // $.ajax({
        // 	type: 'POST',
        // 	url: server + "/" + sessionId + "/" + handleId,
        // 	cache: false,
        // 	contentType: "application/json",
        // 	data: JSON.stringify(request),
        // 	success: function(json) {
        // 		Janus.debug("Message sent!");
        // 		Janus.debug(json);
        // 		if(json["janus"] === "success") {
        // 			// We got a success, must have been a synchronous transaction
        // 			var plugindata = json["plugindata"];
        // 			if(plugindata === undefined || plugindata === null) {
        // 				Janus.warn("Request succeeded, but missing plugindata...");
        // 				callbacks.success();
        // 				return;
        // 			}
        // 			Janus.log("Synchronous transaction successful (" + plugindata["plugin"] + ")");
        // 			var data = plugindata["data"];
        // 			Janus.debug(data);
        // 			callbacks.success(data);
        // 			return;
        // 		} else if(json["janus"] !== "ack") {
        // 			// Not a success and not an ack, must be an error
        // 			if(json["error"] !== undefined && json["error"] !== null) {
        // 				Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
        // 				callbacks.error(json["error"].code + " " + json["error"].reason);
        // 			} else {
        // 				Janus.error("Unknown error");	// FIXME
        // 				callbacks.error("Unknown error");
        // 			}
        // 			return;
        // 		}
        // 		// If we got here, the plugin decided to handle the request asynchronously
        // 		callbacks.success();
        // 	},
        // 	error: function(XMLHttpRequest, textStatus, errorThrown) {
        // 		Janus.error(textStatus + ": " + errorThrown);	// FIXME
        // 		callbacks.error(textStatus + ": " + errorThrown);
        // 	},
        // 	dataType: "json"
        // });
    }

    // Private method to send a trickle candidate
    function sendTrickleCandidate(handleId, candidate) {
        if(!connected) {
            Janus.warn("Is the gateway down? (connected=false)");
            return;
        }
        var request = { "janus": "trickle", "candidate": candidate, "transaction": randomString(12) };
        if(token !== null && token !== undefined)
            request["token"] = token;
        if(apisecret !== null && apisecret !== undefined)
            request["apisecret"] = apisecret;
        Janus.vdebug("Sending trickle candidate (handle=" + handleId + "):");
        Janus.vdebug(request);
        jsdom.env("",["http://code.jquery.com/jquery.min.js"], function(err, window) {
            if (err) {
                console.error(err);
                return;
            }
            var $ = window.$;
            $.support.cors = true;
            $.ajax({
                type: 'POST',
                url: server + "/" + sessionId + "/" + handleId,
                cache: false,
                contentType: "application/json",
                data: JSON.stringify(request),
                success: function(json) {
                    Janus.vdebug("Candidate sent!");
                    Janus.vdebug(json);
                    if(json["janus"] !== "ack") {
                        Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
                        return;
                    }
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    Janus.error(textStatus + ": " + errorThrown);	// FIXME
                },
                dataType: "json"
            });
        });
        // $.ajax({
        // 	type: 'POST',
        // 	url: server + "/" + sessionId + "/" + handleId,
        // 	cache: false,
        // 	contentType: "application/json",
        // 	data: JSON.stringify(request),
        // 	success: function(json) {
        // 		Janus.vdebug("Candidate sent!");
        // 		Janus.vdebug(json);
        // 		if(json["janus"] !== "ack") {
        // 			Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
        // 			return;
        // 		}
        // 	},
        // 	error: function(XMLHttpRequest, textStatus, errorThrown) {
        // 		Janus.error(textStatus + ": " + errorThrown);	// FIXME
        // 	},
        // 	dataType: "json"
        // });
    }

    // Private method to send a data channel message
    function sendData(handleId, callbacks) {

    }

    // Private method to send a DTMF tone
    function sendDtmf(handleId, callbacks) {
    }

    // Private method to destroy a plugin handle
    function destroyHandle(handleId, callbacks) {
        callbacks = callbacks || {};
        callbacks.success = (typeof callbacks.success == "function") ? callbacks.success : jQuery.noop;
        callbacks.error = (typeof callbacks.error == "function") ? callbacks.error : jQuery.noop;
        Janus.warn(callbacks);
        var asyncRequest = true;
        if(callbacks.asyncRequest !== undefined && callbacks.asyncRequest !== null)
            asyncRequest = (callbacks.asyncRequest === true);
        Janus.log("Destroying handle " + handleId + " (async=" + asyncRequest + ")");
        cleanupWebrtc(handleId);
        if(!connected) {
            Janus.warn("Is the gateway down? (connected=false)");
            callbacks.error("Is the gateway down? (connected=false)");
            return;
        }
        var request = { "janus": "detach", "transaction": randomString(12) };
        if(token !== null && token !== undefined)
            request["token"] = token;
        if(apisecret !== null && apisecret !== undefined)
            request["apisecret"] = apisecret;
        if(websockets) {
            request["session_id"] = sessionId;
            request["handle_id"] = handleId;
            ws.send(JSON.stringify(request));
            delete pluginHandles[handleId];
            callbacks.success();
            return;
        }
        jsdom.env("",["http://code.jquery.com/jquery.min.js"], function(err, window) {
            if (err) {
                console.error(err);
                return;
            }
            var $ = window.$;
            $.support.cors = true;
            $.ajax({
                type: 'POST',
                url: server + "/" + sessionId + "/" + handleId,
                async: asyncRequest,	// Sometimes we need false here, or destroying in onbeforeunload won't work
                cache: false,
                contentType: "application/json",
                data: JSON.stringify(request),
                success: function(json) {
                    Janus.log("Destroyed handle:");
                    Janus.debug(json);
                    if(json["janus"] !== "success") {
                        Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
                    }
                    delete pluginHandles[handleId];
                    callbacks.success();
                },
                error: function(XMLHttpRequest, textStatus, errorThrown) {
                    Janus.error(textStatus + ": " + errorThrown);	// FIXME
                    // We cleanup anyway
                    delete pluginHandles[handleId];
                    callbacks.success();
                },
                dataType: "json"
            });
        });
        // $.ajax({
        // 	type: 'POST',
        // 	url: server + "/" + sessionId + "/" + handleId,
        // 	async: asyncRequest,	// Sometimes we need false here, or destroying in onbeforeunload won't work
        // 	cache: false,
        // 	contentType: "application/json",
        // 	data: JSON.stringify(request),
        // 	success: function(json) {
        // 		Janus.log("Destroyed handle:");
        // 		Janus.debug(json);
        // 		if(json["janus"] !== "success") {
        // 			Janus.error("Ooops: " + json["error"].code + " " + json["error"].reason);	// FIXME
        // 		}
        // 		delete pluginHandles[handleId];
        // 		callbacks.success();
        // 	},
        // 	error: function(XMLHttpRequest, textStatus, errorThrown) {
        // 		Janus.error(textStatus + ": " + errorThrown);	// FIXME
        // 		// We cleanup anyway
        // 		delete pluginHandles[handleId];
        // 		callbacks.success();
        // 	},
        // 	dataType: "json"
        // });
    }

    // WebRTC stuff
    function streamsDone(handleId, jsep, media, callbacks, stream) {
    }

    function prepareWebrtc(handleId, callbacks) {

    }

    function prepareWebrtcPeer(handleId, callbacks) {

    }

    function createOffer(handleId, media, callbacks) {
    }

    function createAnswer(handleId, media, callbacks) {

    }

    function sendSDP(handleId, callbacks) {

    }

    function getVolume(handleId) {

    }

    function isMuted(handleId, video) {

    }

    function mute(handleId, video, mute) {

    }

    function getBitrate(handleId) {

    }

    function webrtcError(error) {
        Janus.error("WebRTC error:", error);
    }

    function cleanupWebrtc(handleId, hangupRequest) {
        Janus.log("Cleaning WebRTC stuff");
        pluginHandle.oncleanup();
    }

    // Helper methods to parse a media object
    function isAudioSendEnabled(media) {
        Janus.debug("isAudioSendEnabled:", media);
        if(media === undefined || media === null)
            return true;	// Default
        if(media.audio === false)
            return false;	// Generic audio has precedence
        if(media.audioSend === undefined || media.audioSend === null)
            return true;	// Default
        return (media.audioSend === true);
    }

    function isAudioSendRequired(media) {
        Janus.debug("isAudioSendRequired:", media);
        if(media === undefined || media === null)
            return false;	// Default
        if(media.audio === false || media.audioSend === false)
            return false;	// If we're not asking to capture audio, it's not required
        if(media.failIfNoAudio === undefined || media.failIfNoAudio === null)
            return false;	// Default
        return (media.failIfNoAudio === true);
    }

    function isAudioRecvEnabled(media) {
        Janus.debug("isAudioRecvEnabled:", media);
        if(media === undefined || media === null)
            return true;	// Default
        if(media.audio === false)
            return false;	// Generic audio has precedence
        if(media.audioRecv === undefined || media.audioRecv === null)
            return true;	// Default
        return (media.audioRecv === true);
    }

    function isVideoSendEnabled(media) {
        Janus.debug("isVideoSendEnabled:", media);
        if(media === undefined || media === null)
            return true;	// Default
        if(media.video === false)
            return false;	// Generic video has precedence
        if(media.videoSend === undefined || media.videoSend === null)
            return true;	// Default
        return (media.videoSend === true);
    }

    function isVideoSendRequired(media) {
        Janus.debug("isVideoSendRequired:", media);
        if(media === undefined || media === null)
            return false;	// Default
        if(media.video === false || media.videoSend === false)
            return false;	// If we're not asking to capture video, it's not required
        if(media.failIfNoVideo === undefined || media.failIfNoVideo === null)
            return false;	// Default
        return (media.failIfNoVideo === true);
    }

    function isVideoRecvEnabled(media) {
        Janus.debug("isVideoRecvEnabled:", media);
        if(media === undefined || media === null)
            return true;	// Default
        if(media.video === false)
            return false;	// Generic video has precedence
        if(media.videoRecv === undefined || media.videoRecv === null)
            return true;	// Default
        return (media.videoRecv === true);
    }

    function isDataEnabled(media) {
        Janus.debug("isDataEnabled:", media);
        if(adapter.browserDetails.browser == "edge") {
            Janus.warn("Edge doesn't support data channels yet");
            return false;
        }
        if(media === undefined || media === null)
            return false;	// Default
        return (media.data === true);
    }

    function isTrickleEnabled(trickle) {
        Janus.debug("isTrickleEnabled:", trickle);
        if(trickle === undefined || trickle === null)
            return true;	// Default is true
        return (trickle === true);
    }
};

