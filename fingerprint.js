/*
 * fingerprintJS 0.5.5cpv - crockpotveggies
 * https://github.com/Valve/fingerprintjs
 * Copyright (c) 2013 Valentin Vasilyev (valentin.vasilyev@outlook.com)
 * Licensed under the MIT (http://www.opensource.org/licenses/mit-license.php) license.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
 * AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
 * IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE
 * ARE DISCLAIMED. IN NO EVENT SHALL <COPYRIGHT HOLDER> BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

;
(function(name, context, definition) {
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = definition();
  } else if (typeof define === 'function' && define.amd) {
    define(definition);
  } else {
    context[name] = definition();
  }
})('Fingerprint', this, function() {
  'use strict';

  var Fingerprint = function(options) {
    var nativeForEach, nativeMap;
    nativeForEach = Array.prototype.forEach;
    nativeMap = Array.prototype.map;

    this.each = function(obj, iterator, context) {
      if (obj === null) {
        return;
      }
      if (nativeForEach && obj.forEach === nativeForEach) {
        obj.forEach(iterator, context);
      } else if (obj.length === +obj.length) {
        for (var i = 0, l = obj.length; i < l; i++) {
          if (iterator.call(context, obj[i], i, obj) === {}) return;
        }
      } else {
        for (var key in obj) {
          if (obj.hasOwnProperty(key)) {
            if (iterator.call(context, obj[key], key, obj) === {}) return;
          }
        }
      }
    };

    this.map = function(obj, iterator, context) {
      var results = [];
      // Not using strict equality so that this acts as a
      // shortcut to checking for `null` and `undefined`.
      if (obj == null) return results;
      if (nativeMap && obj.map === nativeMap) return obj.map(iterator, context);
      this.each(obj, function(value, index, list) {
        results[results.length] = iterator.call(context, value, index, list);
      });
      return results;
    };

    options = options || {};

    this.returnBreakdown = options.breakdown || false;
    this.hasher = options.hasher || this.hasher;
    this.screen_resolution = options.screen_resolution || this.screen_resolution;
    this.canvas = options.canvas || this.canvas;
    this.webgl = options.webgl || false;
    this.ie_activex = options.ie_activex || this.ie_activex;
    if (options.flash) {
      // add placeholder to global scope
      window.__global_fingerprints = {};
      this.flashParameters(options.flash);
      /* store this instance in the global namespace
       * so Flash can access it when loaded
       */
      __global_fingerprints[this.flash.id] = this;
      // trigger loading the flash app
      this.loadSwf();
      this.useFlash = true;
    } else {
      this.useFlash = false;
    }
  };

  Fingerprint.prototype = {
    get: function(keys) {
      keys = keys || {};

      keys.cookieEnabled = navigator.cookieEnabled.toString();
      keys.javaEnabled = navigator.javaEnabled().toString();
      keys.appName = navigator.appName;
      keys.userAgent = navigator.userAgent;
      keys.language = navigator.language;
      keys.colorDepth = screen.colorDepth;
      if (typeof navigator.hardwareConcurrency != 'undefined') {
        keys.hardwareConcurrency = navigator.hardwareConcurrency;
      }
      if (typeof navigator.maxTouchPoints != 'undefined') {
        keys.maxTouchPoints = navigator.maxTouchPoints;
      }
      if (typeof navigator.getGamepads != 'undefined') {
        keys.gamePads = JSON.stringify(navigator.getGamepads);
      }
      if (typeof navigator.cpuClass != 'undefined') {
        keys.cpuClass = navigator.cpuClass;
      }
      if (typeof navigator.mimeTypes != 'undefined') {
        keys.mimeTypesLength = navigator.mimeTypes.length;
      }
      if (this.screen_resolution) {
        var resolution = this.getScreenResolution();
        if (typeof resolution !== 'undefined') { // headless browsers, such as phantomjs
          keys.resolution = this.getScreenResolution().join('x');
        }
      }
      keys.timezoneOffset = new Date().getTimezoneOffset();
      keys.sessionStorage = this.hasSessionStorage();
      keys.localStorage = this.hasLocalStorage();
      keys.indexedDB = !!window.indexedDB;
      //body might not be defined at this point or removed programmatically
      if (document.body) {
        keys.body = typeof(document.body.addBehavior);
      } else {
        keys.body = typeof undefined;
      }
      keys.openDatabase = typeof(window.openDatabase);
      keys.geoLocation = typeof(navigator.geolocation);
      keys.storageUpdates = typeof(navigator.getStorageUpdates);
      keys.platform = navigator.platform;
      keys.doNotTrack = navigator.doNotTrack;
      keys.plugins = this.getPluginsString();
      if (this.canvas) {
        keys.canvas = this.getCanvasFingerprint();
      }
      if (this.webgl == true) {
        var webgl = this.getWebGLFingerprint();
        keys.glVendor = webgl.glVendor;
        keys.glRenderer = webgl.glRenderer;
        keys.glFingerprint = webgl.glFingerprint;
      }
      if (this.useFlash) {
        keys.fonts = this.font_list;
      }
      var vals = [];
      for (var o in keys) {
        vals.push(keys[o]);
      }
      var hash;
      if (this.hasher) {
        hash = this.hasher(vals.join('###'), 31);
      } else {
        hash = this.md5(vals.join('###'));
      }
      if (this.returnBreakdown != true) {
        return hash;
      } else {
        return {
          breakdown: keys,
          value: hash
        };
      }
    },

    /*
     * jQuery MD5 Plugin 1.2.1
     * https://github.com/blueimp/jQuery-MD5
     *
     * Copyright 2010, Sebastian Tschan
     * https://blueimp.net
     *
     * Licensed under the MIT license:
     * http://creativecommons.org/licenses/MIT/
     *
     * Based on
     * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
     * Digest Algorithm, as defined in RFC 1321.
     * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * Distributed under the BSD License
     * See http://pajhome.org.uk/crypt/md5 for more info.
     */

    /*jslint bitwise: true */
    /*global unescape, jQuery */
    md5: function(string, key, raw) {
      'use strict';

      /*
       * Add integers, wrapping at 2^32. This uses 16-bit operations internally
       * to work around bugs in some JS interpreters.
       */
      function safe_add(x, y) {
        var lsw = (x & 0xFFFF) + (y & 0xFFFF),
          msw = (x >> 16) + (y >> 16) + (lsw >> 16);
        return (msw << 16) | (lsw & 0xFFFF);
      }

      /*
       * Bitwise rotate a 32-bit number to the left.
       */
      function bit_rol(num, cnt) {
        return (num << cnt) | (num >>> (32 - cnt));
      }

      /*
       * These functions implement the four basic operations the algorithm uses.
       */
      function md5_cmn(q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
      }

      function md5_ff(a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
      }

      function md5_gg(a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
      }

      function md5_hh(a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
      }

      function md5_ii(a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
      }

      /*
       * Calculate the MD5 of an array of little-endian words, and a bit length.
       */
      function binl_md5(x, len) {
        /* append padding */
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        var i, olda, oldb, oldc, oldd,
          a = 1732584193,
          b = -271733879,
          c = -1732584194,
          d = 271733878;

        for (i = 0; i < x.length; i += 16) {
          olda = a;
          oldb = b;
          oldc = c;
          oldd = d;

          a = md5_ff(a, b, c, d, x[i], 7, -680876936);
          d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
          c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
          b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
          a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
          d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
          c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
          b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
          a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
          d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
          c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
          b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
          a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
          d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
          c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
          b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);

          a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
          d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
          c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
          b = md5_gg(b, c, d, a, x[i], 20, -373897302);
          a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
          d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
          c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
          b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
          a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
          d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
          c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
          b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
          a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
          d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
          c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
          b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

          a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
          d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
          c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
          b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
          a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
          d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
          c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
          b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
          a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
          d = md5_hh(d, a, b, c, x[i], 11, -358537222);
          c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
          b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
          a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
          d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
          c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
          b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);

          a = md5_ii(a, b, c, d, x[i], 6, -198630844);
          d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
          c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
          b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
          a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
          d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
          c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
          b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
          a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
          d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
          c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
          b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
          a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
          d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
          c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
          b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);

          a = safe_add(a, olda);
          b = safe_add(b, oldb);
          c = safe_add(c, oldc);
          d = safe_add(d, oldd);
        }
        return [a, b, c, d];
      }

      /*
       * Convert an array of little-endian words to a string
       */
      function binl2rstr(input) {
        var i,
          output = '';
        for (i = 0; i < input.length * 32; i += 8) {
          output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
        }
        return output;
      }

      /*
       * Convert a raw string to an array of little-endian words
       * Characters >255 have their high-byte silently ignored.
       */
      function rstr2binl(input) {
        var i,
          output = [];
        output[(input.length >> 2) - 1] = undefined;
        for (i = 0; i < output.length; i += 1) {
          output[i] = 0;
        }
        for (i = 0; i < input.length * 8; i += 8) {
          output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
        }
        return output;
      }

      /*
       * Calculate the MD5 of a raw string
       */
      function rstr_md5(s) {
        return binl2rstr(binl_md5(rstr2binl(s), s.length * 8));
      }

      /*
       * Calculate the HMAC-MD5, of a key and some data (raw strings)
       */
      function rstr_hmac_md5(key, data) {
        var i,
          bkey = rstr2binl(key),
          ipad = [],
          opad = [],
          hash;
        ipad[15] = opad[15] = undefined;
        if (bkey.length > 16) {
          bkey = binl_md5(bkey, key.length * 8);
        }
        for (i = 0; i < 16; i += 1) {
          ipad[i] = bkey[i] ^ 0x36363636;
          opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
        hash = binl_md5(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
        return binl2rstr(binl_md5(opad.concat(hash), 512 + 128));
      }

      /*
       * Convert a raw string to a hex string
       */
      function rstr2hex(input) {
        var hex_tab = '0123456789abcdef',
          output = '',
          x,
          i;
        for (i = 0; i < input.length; i += 1) {
          x = input.charCodeAt(i);
          output += hex_tab.charAt((x >>> 4) & 0x0F) +
            hex_tab.charAt(x & 0x0F);
        }
        return output;
      }

      /*
       * Encode a string as utf-8
       */
      function str2rstr_utf8(input) {
        return unescape(encodeURIComponent(input));
      }

      /*
       * Take string arguments and return either raw or hex encoded strings
       */
      function raw_md5(s) {
        return rstr_md5(str2rstr_utf8(s));
      }

      function hex_md5(s) {
        return rstr2hex(raw_md5(s));
      }

      function raw_hmac_md5(k, d) {
        return rstr_hmac_md5(str2rstr_utf8(k), str2rstr_utf8(d));
      }

      function hex_hmac_md5(k, d) {
        return rstr2hex(raw_hmac_md5(k, d));
      }
      if (!key) {
        if (!raw) {
          return hex_md5(string);
        } else {
          return raw_md5(string);
        }
      }
      if (!raw) {
        return hex_hmac_md5(key, string);
      } else {
        return raw_hmac_md5(key, string);
      }
    },

    // https://bugzilla.mozilla.org/show_bug.cgi?id=781447
    hasLocalStorage: function() {
      try {
        return !!window.localStorage;
      } catch (e) {
        return true; // SecurityError when referencing it means it exists
      }
    },

    hasSessionStorage: function() {
      try {
        return !!window.sessionStorage;
      } catch (e) {
        return true; // SecurityError when referencing it means it exists
      }
    },

    isCanvasSupported: function() {
      var elem = document.createElement('canvas');
      return !!(elem.getContext && elem.getContext('2d'));
    },

    isIE: function() {
      if (navigator.appName === 'Microsoft Internet Explorer') {
        return true;
      } else if (navigator.appName === 'Netscape' && /Trident/.test(navigator.userAgent)) { // IE 11
        return true;
      }
      return false;
    },

    getPluginsString: function() {
      if (this.isIE() && this.ie_activex) {
        return this.getIEPluginsString();
      } else {
        return this.getRegularPluginsString();
      }
    },

    getRegularPluginsString: function() {
      return this.map(navigator.plugins, function(p) {
        var mimeTypes = this.map(p, function(mt) {
          return [mt.type, mt.suffixes].join('~');
        }).join(',');
        return [p.name, p.description, mimeTypes].join('::');
      }, this).join(';');
    },

    getIEPluginsString: function() {
      if (window.ActiveXObject) {
        var names = ['ShockwaveFlash.ShockwaveFlash', //flash plugin
          'AcroPDF.PDF', // Adobe PDF reader 7+
          'PDF.PdfCtrl', // Adobe PDF reader 6 and earlier, brrr
          'QuickTime.QuickTime', // QuickTime
          // 5 versions of real players
          'rmocx.RealPlayer G2 Control',
          'rmocx.RealPlayer G2 Control.1',
          'RealPlayer.RealPlayer(tm) ActiveX Control (32-bit)',
          'RealVideo.RealVideo(tm) ActiveX Control (32-bit)',
          'RealPlayer',
          'SWCtl.SWCtl', // ShockWave player
          'WMPlayer.OCX', // Windows media player
          'AgControl.AgControl', // Silverlight
          'Skype.Detection'
        ];

        // starting to detect plugins in IE
        return this.map(names, function(name) {
          try {
            new ActiveXObject(name);
            return name;
          } catch (e) {
            return null;
          }
        }).join(';');
      } else {
        return ""; // behavior prior version 0.5.0, not breaking backwards compat.
      }
    },

    getScreenResolution: function() {
      return [screen.height, screen.width];
    },

    getCanvasFingerprint: function() {
      if (!this.isCanvasSupported()) {
        return "Not supported";
      }
      var canvas = document.createElement('canvas');
      var ctx = canvas.getContext('2d');
      // https://www.browserleaks.com/canvas#how-does-it-work
      var txt = 'Cwm fjordbank glyphs vext quiz';
      ctx.textBaseline = "top";
      ctx.font = "14px 'Arial'";
      ctx.textBaseline = "alphabetic";
      ctx.fillStyle = "#f60";
      ctx.fillRect(125, 1, 62, 20);
      ctx.fillStyle = "#069";
      ctx.fillText(txt, 2, 15);
      ctx.fillStyle = "rgba(102, 204, 0, 0.7)";
      ctx.fillText(txt, 4, 17);
      return canvas.toDataURL();
    },

    getWebGLFingerprint: function() {
      var result = {
        glVendor: "Not supported",
        glRenderer: "Not supported",
        glFingerprint: "Not supported"
      }

      if (!this.isCanvasSupported()) {
        return result;
      }

      // Create canvas
      var canvas = document.createElement("canvas");
      canvas.setAttribute("width", "640px");
      canvas.setAttribute("height", "480px");
      //document.body.appendChild(canvas);

      // Init webgl
      var gl;
      try {
        gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
      } catch (e) {}
      if (!gl) {
        return result;
      }

      // Get vendor and renderer if available
      if (gl.getSupportedExtensions().indexOf("WEBGL_debug_renderer_info") >= 0) {
        result.glVendor = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_VENDOR_WEBGL);
        result.glRenderer = gl.getParameter(gl.getExtension('WEBGL_debug_renderer_info').UNMASKED_RENDERER_WEBGL);
      }

      // Clear canvas
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // Set viewport
      gl.viewport(0, 0, canvas.width, canvas.height);

      // Create cube
      // Vertex Data
      var vertexBuffer;
      vertexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
      var verts = [
        // Front face
        -1.0, -1.0, 1.0,
        1.0, -1.0, 1.0,
        1.0, 1.0, 1.0, -1.0, 1.0, 1.0,

        // Back face
        -1.0, -1.0, -1.0, -1.0, 1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, -1.0, -1.0,

        // Top face
        -1.0, 1.0, -1.0, -1.0, 1.0, 1.0,
        1.0, 1.0, 1.0,
        1.0, 1.0, -1.0,

        // Bottom face
        -1.0, -1.0, -1.0,
        1.0, -1.0, -1.0,
        1.0, -1.0, 1.0, -1.0, -1.0, 1.0,

        // Right face
        1.0, -1.0, -1.0,
        1.0, 1.0, -1.0,
        1.0, 1.0, 1.0,
        1.0, -1.0, 1.0,

        // Left face
        -1.0, -1.0, -1.0, -1.0, -1.0, 1.0, -1.0, 1.0, 1.0, -1.0, 1.0, -1.0
      ];
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(verts), gl.STATIC_DRAW);

      // Color data
      var colorBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      var faceColors = [
        [1.0, 0.0, 0.0, 1.0], // Front face
        [0.0, 1.0, 0.0, 1.0], // Back face
        [0.0, 0.0, 1.0, 1.0], // Top face
        [1.0, 1.0, 0.0, 1.0], // Bottom face
        [1.0, 0.0, 1.0, 1.0], // Right face
        [0.0, 1.0, 1.0, 1.0] // Left face
      ];
      var vertexColors = [];
      for (var i in faceColors) {
        var color = faceColors[i];
        for (var j = 0; j < 4; j++) {
          vertexColors = vertexColors.concat(color);
        }
      }
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertexColors), gl.STATIC_DRAW);

      // Index data (defines the triangles to be drawn)
      var cubeIndexBuffer = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cubeIndexBuffer);
      var cubeIndices = [
        0, 1, 2, 0, 2, 3, // Front face
        4, 5, 6, 4, 6, 7, // Back face
        8, 9, 10, 8, 10, 11, // Top face
        12, 13, 14, 12, 14, 15, // Bottom face
        16, 17, 18, 16, 18, 19, // Right face
        20, 21, 22, 20, 22, 23 // Left face
      ];
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(cubeIndices), gl.STATIC_DRAW);

      var cube = {
        buffer: vertexBuffer,
        colorBuffer: colorBuffer,
        indices: cubeIndexBuffer,
        vertSize: 3,
        nVerts: 24,
        colorSize: 4,
        nColors: 24,
        nIndices: 36,
        primtype: gl.TRIANGLES
      };

      // Create a model view matrix with camera at 0, 0, -6
      var modelViewMatrix = mat4.create();
      mat4.translate(modelViewMatrix, modelViewMatrix, [0, 0, -6]);

      // Create a project matrix with 45 degree field of view
      var projectionMatrix = mat4.create();
      mat4.perspective(projectionMatrix, Math.PI / 4,
        canvas.width / canvas.height, 1, 10000);

      // Create shaders
      var vertexShaderSource =

        "    attribute vec3 vertexPos;\n" +
        "    attribute vec4 vertexColor;\n" +
        "    uniform mat4 modelViewMatrix;\n" +
        "    uniform mat4 projectionMatrix;\n" +
        "    varying vec4 vColor;\n" +
        "    void main(void) {\n" +
        "        // Return the transformed and projected vertex value\n" +
        "        gl_Position = projectionMatrix * modelViewMatrix * \n" +
        "            vec4(vertexPos, 1.0);\n" +
        "        // Output the vertexColor in vColor\n" +
        "        vColor = vertexColor;\n" +
        "    }\n";

      var fragmentShaderSource =
        "    precision mediump float;\n" +
        "    varying vec4 vColor;\n" +
        "    void main(void) {\n" +
        "    // Return the pixel color: always output white\n" +
        "    gl_FragColor = vColor;\n" +
        "}\n";

      var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(fragmentShader, fragmentShaderSource);
      gl.compileShader(fragmentShader);
      var vertexShader = gl.createShader(gl.VERTEX_SHADER);
      gl.shaderSource(vertexShader, vertexShaderSource);
      gl.compileShader(vertexShader);

      // link them together into a new program
      var shaderProgram = gl.createProgram();
      gl.attachShader(shaderProgram, vertexShader);
      gl.attachShader(shaderProgram, fragmentShader);
      gl.linkProgram(shaderProgram);

      // get pointers to the shader params
      var shaderVertexPositionAttribute = gl.getAttribLocation(shaderProgram, "vertexPos");
      gl.enableVertexAttribArray(shaderVertexPositionAttribute);
      var shaderVertexColorAttribute = gl.getAttribLocation(shaderProgram, "vertexColor")
      gl.enableVertexAttribArray(shaderVertexColorAttribute);

      var shaderProjectionMatrixUniform = gl.getUniformLocation(shaderProgram, "projectionMatrix");
      var shaderModelViewMatrixUniform = gl.getUniformLocation(shaderProgram, "modelViewMatrix");

      if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
        return result;
      }

      // Rotate the cube
      var fract = 0.48;
      var angle = Math.PI * 2 * fract;
      mat4.rotate(modelViewMatrix, modelViewMatrix, angle, [1.2, 1, 1]);

      // clear the background (with black)
      gl.clearColor(0.0, 0.0, 0.0, 1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      // set the shader to use
      gl.useProgram(shaderProgram);

      // connect up the shader parameters: vertex position, color and projection/model matrices
      // set up the buffers
      gl.bindBuffer(gl.ARRAY_BUFFER, cube.buffer);
      gl.vertexAttribPointer(shaderVertexPositionAttribute, cube.vertSize, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ARRAY_BUFFER, cube.colorBuffer);
      gl.vertexAttribPointer(shaderVertexColorAttribute, cube.colorSize, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, cube.indices);

      gl.uniformMatrix4fv(shaderProjectionMatrixUniform, false, projectionMatrix);
      gl.uniformMatrix4fv(shaderModelViewMatrixUniform, false, modelViewMatrix);

      // draw the object
      gl.drawElements(cube.primtype, cube.nIndices, gl.UNSIGNED_SHORT, 0);

      result.glFingerprint = canvas.toDataURL("image/png");

      return result;
    },

    hasPlugin: function(name) {
      var plugins = this.getPluginsString();
      if (typeof(plugins) == 'string' && plugins.match(name))
        return true;
      return false;
    },

    flashParameters: function(flashOptions) {
      if (typeof flashOptions == 'object') {
        // load default values
        this.flash = {};
        this.flash.id = 'fingerprint-js-flash';
        this.flash.swf = flashOptions.path;
        this.addFlashDiv();
      } else
        this.flash = options;
    },
    addFlashDiv: function() {
      var node = document.createElement('div');
      node.setAttribute("id", this.flash.id);
      node.setAttribute("style", "'width': 1px; height: 1px;");
      document.body.appendChild(node);
    },
    loadSwf: function() {
      if (!this.hasPlugin(/flash/i))
        return undefined;
      var flashvars = {
        onReady: "__global_fingerprints['" + this.flash.id + "'].swfReady",
        swfObjectId: this.flash.id
      };
      var params = {
        allowScriptAccess: "always",
        menu: "false"
      };
      var attributes = {
        'id': this.flash.id,
        name: this.flash.id
      };
      swfobject.embedSWF(this.flash.swf, this.flash.id, "1", "1", "9.0.0", false, flashvars, params, attributes);
    },
    swfReady: function(id) {
      var swfElement = document.getElementById(id);
      this.font_list = swfElement.fonts().join(";");
      var hash = this.computeHash();
      this.callback(hash);
    }
  };


  return Fingerprint;

});