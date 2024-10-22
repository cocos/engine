/*!
 * 
 * 			adpater.js
 * 			create time "1.0.1_2004071100"
 * 			
 */
/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, { enumerable: true, get: getter });
/******/ 		}
/******/ 	};
/******/
/******/ 	// define __esModule on exports
/******/ 	__webpack_require__.r = function(exports) {
/******/ 		if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 			Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 		}
/******/ 		Object.defineProperty(exports, '__esModule', { value: true });
/******/ 	};
/******/
/******/ 	// create a fake namespace object
/******/ 	// mode & 1: value is a module id, require it
/******/ 	// mode & 2: merge all properties of value into the ns
/******/ 	// mode & 4: return value when already ns object
/******/ 	// mode & 8|1: behave like require
/******/ 	__webpack_require__.t = function(value, mode) {
/******/ 		if(mode & 1) value = __webpack_require__(value);
/******/ 		if(mode & 8) return value;
/******/ 		if((mode & 4) && typeof value === 'object' && value && value.__esModule) return value;
/******/ 		var ns = Object.create(null);
/******/ 		__webpack_require__.r(ns);
/******/ 		Object.defineProperty(ns, 'default', { enumerable: true, value: value });
/******/ 		if(mode & 2 && typeof value != 'string') for(var key in value) __webpack_require__.d(ns, key, function(key) { return value[key]; }.bind(null, key));
/******/ 		return ns;
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = "./src/index.js");
/******/ })
/************************************************************************/
/******/ ({

/***/ "./src/Audio.js":
/*!**********************!*\
  !*** ./src/Audio.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _HTMLAudioElement2 = __webpack_require__(/*! ./HTMLAudioElement */ "./src/HTMLAudioElement.js");

var _HTMLAudioElement3 = _interopRequireDefault(_HTMLAudioElement2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _innerAudioContextMap = new WeakMap();

var HAVE_NOTHING = 0;
var HAVE_METADATA = 1;
var HAVE_CURRENT_DATA = 2;
var HAVE_FUTURE_DATA = 3;
var HAVE_ENOUGH_DATA = 4;

var Audio = function (_HTMLAudioElement) {
    _inherits(Audio, _HTMLAudioElement);

    function Audio(url) {
        _classCallCheck(this, Audio);

        var _this = _possibleConstructorReturn(this, (Audio.__proto__ || Object.getPrototypeOf(Audio)).call(this));

        _this.readyState = HAVE_NOTHING;

        var innerAudioContext = my.createInnerAudioContext();
        _innerAudioContextMap.set(_this, innerAudioContext);

        _this._canplayEvents = ['load', 'loadend', 'canplay', 'canplaythrough', 'loadedmetadata'];

        innerAudioContext.onCanPlay(function () {
            _this._loaded = true;
            _this.readyState = HAVE_CURRENT_DATA;

            _this._canplayEvents.forEach(function (type) {
                _this.dispatchEvent({ type: type });
            });

            if (typeof _this.oncanplay === "function") {
                _this.oncanplay();
            }
        });

        innerAudioContext.onPlay(function () {
            _this._paused = false;
            _this.dispatchEvent({ type: 'play' });
            if (typeof _this.onplay === "function") {
                _this.onplay();
            }
        });

        innerAudioContext.onPause(function () {
            _this._paused = true;
            _this.dispatchEvent({ type: 'pause' });
            if (typeof _this.onpause === "function") {
                _this.onpause();
            }
        });

        innerAudioContext.onEnded(function () {
            _this._paused = false;
            _this.dispatchEvent({ type: 'ended' });
            _this.readyState = HAVE_ENOUGH_DATA;

            if (typeof _this.onended === "function") {
                _this.onended();
            }
        });

        innerAudioContext.onError(function () {
            _this._paused = true;
            _this.dispatchEvent({ type: 'error' });
            if (typeof _this.onerror === "function") {
                _this.onerror();
            }
        });

        if (url) {
            _this.src = url;
        } else {
            _this._src = '';
        }

        _this._loop = innerAudioContext.loop;
        _this._autoplay = innerAudioContext.autoplay;
        _this._paused = innerAudioContext.paused;
        _this._volume = innerAudioContext.volume;
        _this._muted = false;
        return _this;
    }

    _createClass(Audio, [{
        key: 'addEventListener',
        value: function addEventListener(type, listener) {
            var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            type = String(type).toLowerCase();

            _get(Audio.prototype.__proto__ || Object.getPrototypeOf(Audio.prototype), 'addEventListener', this).call(this, type, listener, options);

            if (this._loaded && this._canplayEvents.indexOf(type) !== -1) {
                this.dispatchEvent({ type: type });
            }
        }
    }, {
        key: 'load',
        value: function load() {
            // console.warn('HTMLAudioElement.load() is not implemented.')
            // weixin doesn't need call load() manually
        }
    }, {
        key: 'play',
        value: function play() {
            _innerAudioContextMap.get(this).play();
        }
    }, {
        key: 'resume',
        value: function resume() {
            _innerAudioContextMap.get(this).play();
        }
    }, {
        key: 'pause',
        value: function pause() {
            _innerAudioContextMap.get(this).pause();
        }
    }, {
        key: 'destroy',
        value: function destroy() {
            console.log("destroy: " + _typeof(_innerAudioContextMap.get(this).destroy));
            _innerAudioContextMap.get(this).destroy();
        }
    }, {
        key: 'canPlayType',
        value: function canPlayType() {
            var mediaType = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : '';

            if (typeof mediaType !== 'string') {
                return '';
            }

            if (mediaType.indexOf('audio/mpeg') > -1 || mediaType.indexOf('audio/mp4')) {
                return 'probably';
            }
            return '';
        }
    }, {
        key: 'cloneNode',
        value: function cloneNode() {
            var newAudio = new Audio();
            newAudio.loop = this.loop;
            newAudio.autoplay = this.autoplay;
            newAudio.src = this.src;
            return newAudio;
        }
    }, {
        key: 'currentTime',
        get: function get() {
            return _innerAudioContextMap.get(this).currentTime;
        },
        set: function set(value) {
            _innerAudioContextMap.get(this).seek(value);
        }
    }, {
        key: 'duration',
        get: function get() {
            return _innerAudioContextMap.get(this).duration;
        }
    }, {
        key: 'src',
        get: function get() {
            return this._src;
        },
        set: function set(value) {
            this._src = value;
            this._loaded = false;
            this.readyState = HAVE_NOTHING;

            var innerAudioContext = _innerAudioContextMap.get(this);

            innerAudioContext.src = value;
        }
    }, {
        key: 'loop',
        get: function get() {
            return this._loop;
        },
        set: function set(value) {
            this._loop = value;
            _innerAudioContextMap.get(this).loop = value;
        }
    }, {
        key: 'autoplay',
        get: function get() {
            return this._autoplay;
        },
        set: function set(value) {
            this._autoplay = value;
            _innerAudioContextMap.get(this).autoplay = value;
        }
    }, {
        key: 'paused',
        get: function get() {
            return this._paused;
        }
    }, {
        key: 'volume',
        get: function get() {
            return this._volume;
        },
        set: function set(value) {
            this._volume = value;
            if (!this._muted) {
                _innerAudioContextMap.get(this).volume = value;
            }
        }
    }, {
        key: 'muted',
        get: function get() {
            return this._muted;
        },
        set: function set(value) {
            this._muted = value;
            if (value) {
                _innerAudioContextMap.get(this).volume = 0;
            } else {
                _innerAudioContextMap.get(this).volume = this._volume;
            }
        }
    }]);

    return Audio;
}(_HTMLAudioElement3.default);

exports.default = Audio;

/***/ }),

/***/ "./src/Base64.js":
/*!***********************!*\
  !*** ./src/Base64.js ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});
var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';

function InvalidCharacterError(message) {
    this.message = message;
}
InvalidCharacterError.prototype = new Error();
InvalidCharacterError.prototype.name = 'InvalidCharacterError';

// encoder
// [https://gist.github.com/999166] by [https://github.com/nignag]

function btoa(input) {
    var str = String(input);
    var output = '';
    for (
    // initialize result and counter
    var block, charCode, idx = 0, map = chars;
    // if the next str index does not exist:
    //   change the mapping table to "="
    //   check if d has no fractional digits
    str.charAt(idx | 0) || (map = '=', idx % 1);
    // "8 - idx % 1 * 8" generates the sequence 2, 4, 6, 8
    output += map.charAt(63 & block >> 8 - idx % 1 * 8)) {
        charCode = str.charCodeAt(idx += 3 / 4);
        if (charCode > 0xFF) {
            throw new InvalidCharacterError("'btoa' failed: The string to be encoded contains characters outside of the Latin1 range.");
        }
        block = block << 8 | charCode;
    }
    return output;
}

// decoder
// [https://gist.github.com/1020396] by [https://github.com/atk]
function atob(input) {
    var str = String(input).replace(/[=]+$/, '');
    var output = '';
    for (
    // initialize result and counters
    var bc = 0, bs, buffer, idx = 0;
    // get next character
    buffer = str.charAt(idx++);
    // character found in table? initialize bit storage and add its ascii value;
    ~buffer && (bs = bc % 4 ? bs * 64 + buffer : buffer,
    // and if not first of each 4 characters,
    // convert the first 8 bits to one ascii character
    bc++ % 4) ? output += String.fromCharCode(255 & bs >> (-2 * bc & 6)) : 0) {
        // try to find character in table (0-63, not found => -1)
        buffer = chars.indexOf(buffer);
    }
    return output;
}

exports.btoa = btoa;
exports.atob = atob;

/***/ }),

/***/ "./src/Canvas.js":
/*!***********************!*\
  !*** ./src/Canvas.js ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = Canvas;

var _HTMLCanvasElement = __webpack_require__(/*! ./HTMLCanvasElement */ "./src/HTMLCanvasElement.js");

var _HTMLCanvasElement2 = _interopRequireDefault(_HTMLCanvasElement);

var _util = __webpack_require__(/*! ./utils/util */ "./src/utils/util.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Canvas() {
    var canvas = my.createCanvas();

    if (!_util.isIDE) {
        if (!('tagName' in canvas)) {
            canvas.tagName = 'canvas';
        }

        canvas.__proto__.__proto__ = new _HTMLCanvasElement2.default();
    }

    return canvas;
}

/***/ }),

/***/ "./src/Element.js":
/*!************************!*\
  !*** ./src/Element.js ***!
  \************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _Node2 = __webpack_require__(/*! ./Node */ "./src/Node.js");

var _Node3 = _interopRequireDefault(_Node2);

var _noop = __webpack_require__(/*! ./utils/noop */ "./src/utils/noop.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Element = function (_Node) {
    _inherits(Element, _Node);

    function Element() {
        _classCallCheck(this, Element);

        var _this = _possibleConstructorReturn(this, (Element.__proto__ || Object.getPrototypeOf(Element)).call(this));

        _this.className = '';
        _this.children = [];

        _this.remove = _noop.noop;
        return _this;
    }

    _createClass(Element, [{
        key: "setAttribute",
        value: function setAttribute(name, value) {
            this[name] = value;
        }
    }, {
        key: "getAttribute",
        value: function getAttribute(name) {
            return this[name];
        }
    }, {
        key: "setAttributeNS",
        value: function setAttributeNS(name, value) {
            this[name] = value;
        }
    }, {
        key: "getAttributeNS",
        value: function getAttributeNS(name) {
            return this[name];
        }
    }]);

    return Element;
}(_Node3.default);

exports.default = Element;

/***/ }),

/***/ "./src/Event.js":
/*!**********************!*\
  !*** ./src/Event.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _noop = __webpack_require__(/*! ./utils/noop */ "./src/utils/noop.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Event = function Event(type) {
    _classCallCheck(this, Event);

    this.cancelBubble = false;
    this.cacelable = false;
    this.target = null;
    this.timestampe = Date.now();
    this.preventDefault = _noop.noop;
    this.stopPropagation = _noop.noop;

    this.type = type;
};

exports.default = Event;

/***/ }),

/***/ "./src/EventIniter/MouseEvent.js":
/*!***************************************!*\
  !*** ./src/EventIniter/MouseEvent.js ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var MouseEvent = function MouseEvent() {
  _classCallCheck(this, MouseEvent);
};

exports.default = MouseEvent;

/***/ }),

/***/ "./src/EventIniter/TouchEvent.js":
/*!***************************************!*\
  !*** ./src/EventIniter/TouchEvent.js ***!
  \***************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Event2 = __webpack_require__(/*! ../Event */ "./src/Event.js");

var _Event3 = _interopRequireDefault(_Event2);

var _document = __webpack_require__(/*! ../document */ "./src/document.js");

var _document2 = _interopRequireDefault(_document);

var _util = __webpack_require__(/*! ../utils/util */ "./src/utils/util.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var TouchEvent = function (_Event) {
    _inherits(TouchEvent, _Event);

    function TouchEvent(type) {
        _classCallCheck(this, TouchEvent);

        var _this = _possibleConstructorReturn(this, (TouchEvent.__proto__ || Object.getPrototypeOf(TouchEvent)).call(this, type));

        _this.touches = [];
        _this.targetTouches = [];
        _this.changedTouches = [];

        _this.target = window.canvas;
        _this.currentTarget = window.canvas;
        return _this;
    }

    return TouchEvent;
}(_Event3.default);

exports.default = TouchEvent;


function eventHandlerFactory(type) {
    return function (rawEvent) {
        if (_util.isIDE) return;
        var event = new TouchEvent(type);

        event.changedTouches = rawEvent.touches;
        event.touches = rawEvent.touches;
        event.targetTouches = Array.prototype.slice.call(rawEvent.touches);
        // event.timeStamp = rawEvent.timeStamp
        _document2.default.dispatchEvent(event);
    };
}

my.onTouchStart(eventHandlerFactory('touchstart'));
my.onTouchMove(eventHandlerFactory('touchmove'));
my.onTouchEnd(eventHandlerFactory('touchend'));
my.onTouchCancel(eventHandlerFactory('touchcancel'));

/***/ }),

/***/ "./src/EventIniter/index.js":
/*!**********************************!*\
  !*** ./src/EventIniter/index.js ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _TouchEvent = __webpack_require__(/*! ./TouchEvent */ "./src/EventIniter/TouchEvent.js");

Object.defineProperty(exports, 'TouchEvent', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_TouchEvent).default;
  }
});

var _MouseEvent = __webpack_require__(/*! ./MouseEvent */ "./src/EventIniter/MouseEvent.js");

Object.defineProperty(exports, 'MouseEvent', {
  enumerable: true,
  get: function get() {
    return _interopRequireDefault(_MouseEvent).default;
  }
});

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

/***/ }),

/***/ "./src/EventTarget.js":
/*!****************************!*\
  !*** ./src/EventTarget.js ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _events = new WeakMap();

var EventTarget = function () {
    function EventTarget() {
        _classCallCheck(this, EventTarget);

        _events.set(this, {});
    }

    _createClass(EventTarget, [{
        key: "addEventListener",
        value: function addEventListener(type, listener) {
            var options = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};

            var events = _events.get(this);

            if (!events) {
                events = {};
                _events.set(this, events);
            }

            if (!events[type]) {
                events[type] = [];
            }
            events[type].push(listener);
        }
    }, {
        key: "removeEventListener",
        value: function removeEventListener(type, listener) {
            var events = _events.get(this);
            if (events) {
                var listeners = events[type];
                if (listeners && listeners.length > 0) {
                    for (var i = listeners.length; i--; i > 0) {
                        if (listeners[i] === listener) {
                            listeners.splice(i, 1);
                            break;
                        }
                    }
                }
            }
        }
    }, {
        key: "dispatchEvent",
        value: function dispatchEvent() {
            var event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

            if (typeof event.type !== "string") {
                return;
            }

            if (!_events.get(this)) {
                return;
            }

            var listeners = _events.get(this)[event.type];
            if (listeners) {
                for (var i = 0; i < listeners.length; i++) {
                    var listener = listeners[i];
                    listener.call(this, event);
                }
            }
        }
    }]);

    return EventTarget;
}();

exports.default = EventTarget;

/***/ }),

/***/ "./src/FileReader.js":
/*!***************************!*\
  !*** ./src/FileReader.js ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var FileReader = function () {
    function FileReader() {
        _classCallCheck(this, FileReader);
    }

    _createClass(FileReader, [{
        key: "construct",
        value: function construct() {}
    }]);

    return FileReader;
}();

exports.default = FileReader;

/***/ }),

/***/ "./src/HTMLAudioElement.js":
/*!*********************************!*\
  !*** ./src/HTMLAudioElement.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _HTMLMediaElement2 = __webpack_require__(/*! ./HTMLMediaElement */ "./src/HTMLMediaElement.js");

var _HTMLMediaElement3 = _interopRequireDefault(_HTMLMediaElement2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HTMLAudioElement = function (_HTMLMediaElement) {
    _inherits(HTMLAudioElement, _HTMLMediaElement);

    function HTMLAudioElement() {
        _classCallCheck(this, HTMLAudioElement);

        return _possibleConstructorReturn(this, (HTMLAudioElement.__proto__ || Object.getPrototypeOf(HTMLAudioElement)).call(this, "audio"));
    }

    return HTMLAudioElement;
}(_HTMLMediaElement3.default);

exports.default = HTMLAudioElement;

/***/ }),

/***/ "./src/HTMLCanvasElement.js":
/*!**********************************!*\
  !*** ./src/HTMLCanvasElement.js ***!
  \**********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _HTMLElement2 = __webpack_require__(/*! ./HTMLElement */ "./src/HTMLElement.js");

var _HTMLElement3 = _interopRequireDefault(_HTMLElement2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HTMLCanvasElement = function (_HTMLElement) {
    _inherits(HTMLCanvasElement, _HTMLElement);

    function HTMLCanvasElement() {
        _classCallCheck(this, HTMLCanvasElement);

        return _possibleConstructorReturn(this, (HTMLCanvasElement.__proto__ || Object.getPrototypeOf(HTMLCanvasElement)).call(this, 'canvas'));
    }

    return HTMLCanvasElement;
}(_HTMLElement3.default);

exports.default = HTMLCanvasElement;
;

/***/ }),

/***/ "./src/HTMLElement.js":
/*!****************************!*\
  !*** ./src/HTMLElement.js ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Element2 = __webpack_require__(/*! ./Element */ "./src/Element.js");

var _Element3 = _interopRequireDefault(_Element2);

var _noop = __webpack_require__(/*! ./utils/noop */ "./src/utils/noop.js");

var _WindowProperties = __webpack_require__(/*! ./WindowProperties */ "./src/WindowProperties.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HTMLElement = function (_Element) {
    _inherits(HTMLElement, _Element);

    function HTMLElement() {
        var tagName = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";

        _classCallCheck(this, HTMLElement);

        var _this = _possibleConstructorReturn(this, (HTMLElement.__proto__ || Object.getPrototypeOf(HTMLElement)).call(this));

        _this.className = '';
        _this.childern = [];

        _this.style = {
            width: _WindowProperties.innerWidth + 'px',
            height: _WindowProperties.innerHeight + 'px'
        };

        _this.focus = _noop.noop;
        _this.blur = _noop.noop;

        _this.innerHTML = '';

        _this.tagName = tagName.toUpperCase();
        return _this;
    }

    return HTMLElement;
}(_Element3.default);

exports.default = HTMLElement;

/***/ }),

/***/ "./src/HTMLImageElement.js":
/*!*********************************!*\
  !*** ./src/HTMLImageElement.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _HTMLElement2 = __webpack_require__(/*! ./HTMLElement */ "./src/HTMLElement.js");

var _HTMLElement3 = _interopRequireDefault(_HTMLElement2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HTMLImageElement = function (_HTMLElement) {
    _inherits(HTMLImageElement, _HTMLElement);

    function HTMLImageElement() {
        _classCallCheck(this, HTMLImageElement);

        return _possibleConstructorReturn(this, (HTMLImageElement.__proto__ || Object.getPrototypeOf(HTMLImageElement)).call(this, "img"));
    }

    return HTMLImageElement;
}(_HTMLElement3.default);

exports.default = HTMLImageElement;
;

/***/ }),

/***/ "./src/HTMLMediaElement.js":
/*!*********************************!*\
  !*** ./src/HTMLMediaElement.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _HTMLElement2 = __webpack_require__(/*! ./HTMLElement */ "./src/HTMLElement.js");

var _HTMLElement3 = _interopRequireDefault(_HTMLElement2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HTMLMediaElement = function (_HTMLElement) {
    _inherits(HTMLMediaElement, _HTMLElement);

    function HTMLMediaElement(tagName) {
        var _this, _ret;

        _classCallCheck(this, HTMLMediaElement);

        return _ret = (_this = _possibleConstructorReturn(this, (HTMLMediaElement.__proto__ || Object.getPrototypeOf(HTMLMediaElement)).call(this, tagName)), _this), _possibleConstructorReturn(_this, _ret);
    }

    _createClass(HTMLMediaElement, [{
        key: "addTextTrack",
        value: function addTextTrack() {}
    }, {
        key: "capureStream",
        value: function capureStream() {}
    }, {
        key: "fastSeek",
        value: function fastSeek() {}
    }, {
        key: "load",
        value: function load() {}
    }, {
        key: "pause",
        value: function pause() {}
    }, {
        key: "play",
        value: function play() {}
    }, {
        key: "canPlayType",
        value: function canPlayType() {}
    }]);

    return HTMLMediaElement;
}(_HTMLElement3.default);

exports.default = HTMLMediaElement;

/***/ }),

/***/ "./src/HTMLVideoElement.js":
/*!*********************************!*\
  !*** ./src/HTMLVideoElement.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _HTMLMediaElement2 = __webpack_require__(/*! ./HTMLMediaElement */ "./src/HTMLMediaElement.js");

var _HTMLMediaElement3 = _interopRequireDefault(_HTMLMediaElement2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var HTMLVideoElement = function (_HTMLMediaElement) {
    _inherits(HTMLVideoElement, _HTMLMediaElement);

    function HTMLVideoElement() {
        _classCallCheck(this, HTMLVideoElement);

        return _possibleConstructorReturn(this, (HTMLVideoElement.__proto__ || Object.getPrototypeOf(HTMLVideoElement)).call(this, 'video'));
    }

    return HTMLVideoElement;
}(_HTMLMediaElement3.default);

exports.default = HTMLVideoElement;
;

/***/ }),

/***/ "./src/Image.js":
/*!**********************!*\
  !*** ./src/Image.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.default = Image;

var _HTMLImageElement = __webpack_require__(/*! ./HTMLImageElement */ "./src/HTMLImageElement.js");

var _HTMLImageElement2 = _interopRequireDefault(_HTMLImageElement);

var _util = __webpack_require__(/*! ./utils/util */ "./src/utils/util.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function Image() {
    var image = my.createImage();
    if (!_util.isIDE) {
        image.__proto__ = new _HTMLImageElement2.default();
        if (image.tagName === undefined) {
            image.tagName = "IMG";
        }

        image.onload = function () {
            image.dispatchEvent({
                type: "load"
            });
        };

        image.onerror = function () {
            image.dispatchEvent({
                type: "error"
            });
        };
    }

    return image;
}

/***/ }),

/***/ "./src/ImageBitmap.js":
/*!****************************!*\
  !*** ./src/ImageBitmap.js ***!
  \****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ImageBitmap = function ImageBitmap() {
    // TODO

    _classCallCheck(this, ImageBitmap);
};

exports.default = ImageBitmap;

/***/ }),

/***/ "./src/Node.js":
/*!*********************!*\
  !*** ./src/Node.js ***!
  \*********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _EventTarget2 = __webpack_require__(/*! ./EventTarget */ "./src/EventTarget.js");

var _EventTarget3 = _interopRequireDefault(_EventTarget2);

var _noop = __webpack_require__(/*! ./utils/noop */ "./src/utils/noop.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Node = function (_EventTarget) {
  _inherits(Node, _EventTarget);

  function Node() {
    _classCallCheck(this, Node);

    var _this = _possibleConstructorReturn(this, (Node.__proto__ || Object.getPrototypeOf(Node)).call(this));

    _this.childNodes = [];

    _this.insertBefor = _noop.noop;
    return _this;
  }

  _createClass(Node, [{
    key: 'appendChild',
    value: function appendChild(node) {
      if (node instanceof Node || node instanceof window.Node) {
        this.childNodes.push(node);
      } else {
        throw new TypeError('Failed to executed \'appendChild\' on \'Node\': parameter 1 is not of type \'Node\'.');
      }
    }
  }, {
    key: 'cloneNode',
    value: function cloneNode() {
      var copyNode = Object.create(this);

      return Object.assign(copyNode, this);
    }
  }, {
    key: 'removeChild',
    value: function removeChild(node) {
      var index = this.childNodes.findIndex(function (child) {
        return child === node;
      });

      if (index > -1) {
        return this.childNodes.splice(index, 1);
      }
      return null;
    }
  }]);

  return Node;
}(_EventTarget3.default);

exports.default = Node;

/***/ }),

/***/ "./src/WebGLRenderingContext.js":
/*!**************************************!*\
  !*** ./src/WebGLRenderingContext.js ***!
  \**************************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var WebGLRenderingContext = function WebGLRenderingContext() {
    // TODO

    _classCallCheck(this, WebGLRenderingContext);
};

exports.default = WebGLRenderingContext;

/***/ }),

/***/ "./src/WebSocket.js":
/*!**************************!*\
  !*** ./src/WebSocket.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _util = __webpack_require__(/*! ./utils/util */ "./src/utils/util.js");

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var _taskMap = new WeakMap();

var WebSocket = function () {
    function WebSocket(url) {
        var _this = this;

        var protocols = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : [];

        _classCallCheck(this, WebSocket);

        this.OPEN = WebSocket.OPEN;
        this.CONNECTING = WebSocket.CONNECTING;
        this.CLOSING = WebSocket.CLOSING;
        this.CLOSED = WebSocket.CLOSED;

        this.binaryType = '';
        this.bufferedAmount = 0;
        this.extensions = '';

        this.onclose = null;
        this.onerror = null;
        this.onmessage = null;
        this.onopen = null;

        this.protocol = '';
        this.readyState = this.CLOSED;

        if (typeof url !== 'string' || !/(^ws:\/\/)|(^wss:\/\/)/.test(url)) {
            throw new TypeError('Failed to construct \'WebSocket\': The URL=\'' + url + '\' is invalid');
        }

        this.url = url;
        this.readyState = this.CONNECTING;

        var task = my.connectSocket({
            url: url,
            multiple: true,
            protocols: Array.isArray(protocols) ? protocols : [protocols],
            fail: function fail(res) {
                if (typeof _this.onerror === 'function') {
                    _this.onerror(new Error(res.errorMessage));
                }
            }
        });
        _taskMap.set(this, task);

        task.onOpen(function (res) {
            _this.readyState = _this.OPEN;
            if (typeof _this.onopen === 'function') {
                _this.onopen(res);
            }
        });

        task.onError(function (res) {
            if (typeof _this.onerror === 'function') {
                _this.onerror(new Error(res.errorMessage));
            }
        });

        task.onMessage(function (res) {
            if (typeof _this.onmessage === 'function') {
                if (res.data) {
                    var data = res.data;
                    if (data.isBuffer) {
                        // 对齐web转成arrayBuffer;
                        data.data = (0, _util.base64ToArrayBuffer)(data.data);
                    }
                    _this.onmessage(data);
                } else {
                    _this.onmessage(null);
                }
            }
        });

        task.onClose(function (res) {
            _this.readyState = _this.CLOSED;
            if (typeof _this.onclose === 'function') {
                _this.onclose(res);
            }
        });
    }

    _createClass(WebSocket, [{
        key: 'send',
        value: function send(data) {
            var _this2 = this;

            if (typeof data !== 'string' && !(data instanceof ArrayBuffer)) {
                throw new TypeError('Failed to send message: The data ' + data + ' is invalid');
            }
            var p = {};
            if (data instanceof ArrayBuffer) {
                data = (0, _util.transformArrayBufferToBase64)(data);
                p.isBuffer = true;
            }
            p.data = data;
            p.fail = function (res) {
                if (typeof _this2.onerror === 'function') {
                    _this2.onerror(new Error(res.errorMessage));
                }
            };
            var task = _taskMap.get(this);
            task.send(p);
        }
    }, {
        key: 'close',
        value: function close() {
            this.readyState = this.CLOSING;
            var task = _taskMap.get(this);
            task.close();
        }
    }]);

    return WebSocket;
}();

WebSocket.CONNECTING = 0;
WebSocket.OPEN = 1;
WebSocket.CLOSING = 2;
WebSocket.CLOSED = 3;
exports.default = WebSocket;

/***/ }),

/***/ "./src/WindowProperties.js":
/*!*********************************!*\
  !*** ./src/WindowProperties.js ***!
  \*********************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _my$getSystemInfoSync = my.getSystemInfoSync(),
    screenWidth = _my$getSystemInfoSync.screenWidth,
    screenHeight = _my$getSystemInfoSync.screenHeight,
    pixelRatio = _my$getSystemInfoSync.pixelRatio,
    windowHeight = _my$getSystemInfoSync.windowHeight,
    windowWidth = _my$getSystemInfoSync.windowWidth;

var innerHeight = exports.innerHeight = windowHeight;
var innerWidth = exports.innerWidth = windowWidth;
var devicePixelRatio = exports.devicePixelRatio = pixelRatio;
var screen = exports.screen = {
  width: screenWidth,
  height: screenHeight,
  availWidth: innerWidth,
  availHeight: innerHeight,
  availLeft: 0,
  availTop: 0
};

/***/ }),

/***/ "./src/XMLHttpRequest.js":
/*!*******************************!*\
  !*** ./src/XMLHttpRequest.js ***!
  \*******************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _EventTarget2 = __webpack_require__(/*! ./EventTarget */ "./src/EventTarget.js");

var _EventTarget3 = _interopRequireDefault(_EventTarget2);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var _url = new WeakMap();
var _method = new WeakMap();
var _requestHeader = new WeakMap();
var _responseHeader = new WeakMap();
var _requestTask = new WeakMap();

function _triggerEvent(type) {
  var event = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  event.target = event.target || this;
  if (typeof this['on' + type] === 'function') {
    this['on' + type].apply(this, event);
  }
}

function _changeReadyState(readyState) {
  var event = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};

  this.readyState = readyState;
  event.readyState = readyState;
  _triggerEvent.call(this, 'readystatechange', event);
}

var UNSEND = 0;
var OPENED = 1;
var HEADERS_RECEIVED = 2;
var LOADING = 3;
var DONE = 4;

var XMLHttpRequest = function (_EventTarget) {
  _inherits(XMLHttpRequest, _EventTarget);

  function XMLHttpRequest() {
    _classCallCheck(this, XMLHttpRequest);

    var _this = _possibleConstructorReturn(this, (XMLHttpRequest.__proto__ || Object.getPrototypeOf(XMLHttpRequest)).call(this));

    _this.onabort = null;
    _this.onerror = null;
    _this.onload = null;
    _this.onloadstart = null;
    _this.onprogress = null;
    _this.ontimeout = null;
    _this.onloadend = null;

    _this.onreadystatechange = null;
    _this.readyState = 0;
    _this.response = null;
    _this.responseText = null;
    _this.responseType = '';
    _this.dataType = 'string';
    _this.responseXML = null;
    _this.status = 0;
    _this.statusText = '';
    _this.upload = {};
    _this.withCredentials = false;
    _this.timeout = 0;

    _requestHeader.set(_this, {
      'content-type': 'application/x-www-form-urlencoded'
    });
    _responseHeader.set(_this, {});
    return _this;
  }

  _createClass(XMLHttpRequest, [{
    key: 'abort',
    value: function abort() {
      var myRequestTask = _requestTask.get(this);

      if (myRequestTask) {
        myRequestTask.abort();
      }
    }
  }, {
    key: 'getAllResponseHeaders',
    value: function getAllResponseHeaders() {
      var responseHeader = _responseHeader.get(this);

      return Object.keys(responseHeader).map(function (header) {
        return header + ': ' + responseHeader[header];
      }).join('\n');
    }

    /* async, user, password 这几个参数在小程序内不支持*/

  }, {
    key: 'open',
    value: function open(method, url) {
      _method.set(this, method);
      _url.set(this, url);
      _changeReadyState.call(this, OPENED);
    }
  }, {
    key: 'overrideMimeType',
    value: function overrideMimeType() {}
  }, {
    key: 'send',
    value: function send() {
      var _this2 = this;

      var data = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "";


      if (this.readyState !== OPENED) {
        throw new Error("Failed to execute 'send' on 'XMLHttpRequest': The object's state must be OPENED.");
      } else {
        var task = my.request({
          data: data,
          url: _url.get(this),
          method: _method.get(this),
          headers: _requestHeader.get(this),
          timeout: this.timeout,
          dataType: this.dataType,
          responseType: this.responseType,
          success: function success(res) {
            var data = res.data,
                status = res.status,
                headers = res.headers;


            if (typeof data !== 'string' && !(data instanceof ArrayBuffer)) {
              try {
                data = JSON.stringify(data);
              } catch (e) {
                data = data;
              }
            }

            _this2.status = status;
            _responseHeader.set(_this2, headers || {});
            _triggerEvent.call(_this2, 'loadstart');
            _changeReadyState.call(_this2, HEADERS_RECEIVED);
            _changeReadyState.call(_this2, LOADING);

            _this2.response = data;

            if (data instanceof ArrayBuffer) {
              _this2.responseText = '';
              var bytes = new Uint8Array(data);
              var len = bytes.byteLength;

              for (var i = 0; i < len; i++) {
                _this2.responseText += String.fromCharCode(bytes[i]);
              }
            } else {
              _this2.responseText = data;
            }
            _changeReadyState.call(_this2, DONE);
            _triggerEvent.call(_this2, 'load');
            _triggerEvent.call(_this2, 'loadend');
          },

          fail: function fail(res) {
            var _res$errorMessage = res.errorMessage,
                errorMessage = _res$errorMessage === undefined ? "" : _res$errorMessage;

            var data = res.data || "";
            if ((typeof data === "string" && data.includes("超时")) || errorMessage.includes("超时")) {
              _triggerEvent.call(_this2, 'timeout');
            }

            _triggerEvent.call(_this2, 'error');
            _triggerEvent.call(_this2, 'loadend');
          }
        });

        _requestTask.set(this, task);
      }
    }
  }, {
    key: 'setRequestHeader',
    value: function setRequestHeader(header, value) {
      var myHeader = _requestHeader.get(this);
      myHeader[header] = value;
      _requestHeader.set(this, myHeader);
    }
  }, {
    key: 'addEventListener',
    value: function addEventListener(type, listener) {
      var _this3 = this;

      if (typeof listener === 'function') {
        this['on' + type] = function () {
          var event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

          event.target = event.target || _this3;
          listener.call(_this3, event);
        };
      }
    }
  }, {
    key: 'removeEventListener',
    value: function removeEventListener(type, listener) {
      if (this['on' + type] === listener) {
        this['on' + type] = null;
      }
    }
  }]);

  return XMLHttpRequest;
}(_EventTarget3.default);

exports.default = XMLHttpRequest;

/***/ }),

/***/ "./src/document.js":
/*!*************************!*\
  !*** ./src/document.js ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _Event = __webpack_require__(/*! ./Event */ "./src/Event.js");

var _Event2 = _interopRequireDefault(_Event);

var _HTMLElement = __webpack_require__(/*! ./HTMLElement */ "./src/HTMLElement.js");

var _HTMLElement2 = _interopRequireDefault(_HTMLElement);

var _HTMLVideoElement = __webpack_require__(/*! ./HTMLVideoElement */ "./src/HTMLVideoElement.js");

var _HTMLVideoElement2 = _interopRequireDefault(_HTMLVideoElement);

var _Image = __webpack_require__(/*! ./Image */ "./src/Image.js");

var _Image2 = _interopRequireDefault(_Image);

var _Audio = __webpack_require__(/*! ./Audio */ "./src/Audio.js");

var _Audio2 = _interopRequireDefault(_Audio);

var _Canvas = __webpack_require__(/*! ./Canvas */ "./src/Canvas.js");

var _Canvas2 = _interopRequireDefault(_Canvas);

__webpack_require__(/*! ./EventIniter/index.js */ "./src/EventIniter/index.js");

var _WindowProperties = __webpack_require__(/*! ./WindowProperties */ "./src/WindowProperties.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var events = {};

var getElementsByTagName_;
if (window.document && window.document.getElementsByTagName) {
    getElementsByTagName_ = window.document.getElementsByTagName.bind(window.document);
}

var document = {
    readyState: 'complete',
    visibilityState: 'visible', // 'visible' , 'hidden'
    fullscreen: true,
    hidden: false,
    style: {},
    scripts: [],

    location: window.location,

    ontouchstart: null,
    ontouchmove: null,
    ontouchend: null,
    onvisibilitychange: null,

    head: new _HTMLElement2.default("head"),
    body: new _HTMLElement2.default("body"),

    documentElement: {
        clientWidth: _WindowProperties.screen.width,
        clientHight: _WindowProperties.screen.height,
        clientLeft: 0,
        clientTop: 0,
        scrollLeft: 0,
        scrollTop: 0
    },

    createElement: function createElement(tagName) {
        tagName = tagName.toLowerCase();
        if (tagName === 'canvas') {
            return new _Canvas2.default();
        } else if (tagName === 'audio') {
            return new _Audio2.default();
        } else if (tagName === 'img') {
            return new _Image2.default();
        } else if (tagName === 'video') {
            return new _HTMLVideoElement2.default();
        }

        return new _HTMLElement2.default(tagName);
    },
    createElementNS: function createElementNS(nameSpace, tagName) {
        return this.createElement(tagName);
    },
    getElementById: function getElementById(id) {
        if (id === window.canvas.id) {
            return window.canvas;
        }
        return null;
    },
    getElementsByTagName: function getElementsByTagName(tagName) {
        if (getElementsByTagName_) {
            return getElementsByTagName_(tagName);
        }

        tagName = tagName.toLowerCase();
        if (tagName === 'head') {
            return [document.head];
        } else if (tagName === 'body') {
            return [document.body];
        } else if (tagName === 'canvas') {
            return [window.canvas];
        }
        return [];
    },
    getElementsByTagNameNS: function getElementsByTagNameNS(nameSpace, tagName) {
        return this.getElementsByTagName(tagName);
    },
    getElementsByName: function getElementsByName(tagName) {
        if (tagName === 'head') {
            return [document.head];
        } else if (tagName === 'body') {
            return [document.body];
        } else if (tagName === 'canvas') {
            return [window.canvas];
        }
        return [];
    },
    querySelector: function querySelector(query) {
        if (query === 'head') {
            return document.head;
        } else if (query === 'body') {
            return document.body;
        } else if (query === 'canvas') {
            return window.canvas;
        } else if (query === '#' + window.canvas.id) {
            return window.canvas;
        }
        return null;
    },
    querySelectorAll: function querySelectorAll(query) {
        if (query === 'head') {
            return [document.head];
        } else if (query === 'body') {
            return [document.body];
        } else if (query === 'canvas') {
            return [window.canvas];
        }
        return [];
    },
    addEventListener: function addEventListener(type, listener) {
        if (!events[type]) {
            events[type] = [];
        }
        events[type].push(listener);
    },
    removeEventListener: function removeEventListener(type, listener) {
        var listeners = events[type];

        if (listeners && listeners.length > 0) {
            for (var i = listeners.length; i--; i > 0) {
                if (listeners[i] === listener) {
                    listeners.splice(i, 1);
                    break;
                }
            }
        }
    },
    dispatchEvent: function dispatchEvent(event) {
        var type = event.type;
        var listeners = events[type];

        if (listeners) {
            for (var i = 0; i < listeners.length; i++) {
                listeners[i](event);
            }
        }

        window.canvas.dispatchEvent(event);

        if (event.target && typeof event.target['on' + type] === 'function') {
            event.target['on' + type](event);
        }
    }
};

function onVisibilityChange(visible) {

    return function () {

        document.visibilityState = visible ? 'visible' : 'hidden';

        var hidden = !visible;
        if (document.hidden === hidden) {
            return;
        }
        document.hidden = hidden;

        var event = new _Event2.default('visibilitychange');

        event.target = document;
        event.timeStamp = Date.now();

        document.dispatchEvent(event);
    };
}

if (my.onHide) {
    my.onHide(onVisibilityChange(false));
}
if (my.onShow) {
    my.onShow(onVisibilityChange(true));
}

exports.default = document;

/***/ }),

/***/ "./src/index.js":
/*!**********************!*\
  !*** ./src/index.js ***!
  \**********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var _window2 = __webpack_require__(/*! ./window */ "./src/window.js");

var _window = _interopRequireWildcard(_window2);

var _document = __webpack_require__(/*! ./document */ "./src/document.js");

var _document2 = _interopRequireDefault(_document);

var _util = __webpack_require__(/*! ./utils/util */ "./src/utils/util.js");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj.default = obj; return newObj; } }

function inject() {
    _window.document = _document2.default;

    _window.addEventListener = function (type, listener) {
        _window.document.addEventListener(type, listener);
    };
    _window.removeEventListener = function (type, listener) {
        _window.document.removeEventListener(type, listener);
    };
    _window.dispatchEvent = function () {
        var event = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : {};

        console.log('window.dispatchEvent', event.type, event);
    };

    if (_util.isIDE) {
        for (var key in _window) {
            var descriptor = Object.getOwnPropertyDescriptor(window, key);

            if (!descriptor || descriptor.configurable === true) {
                Object.defineProperty(window, key, {
                    value: _window[key]
                });
            }
        }

        for (var _key in _window.document) {
            var _descriptor = Object.getOwnPropertyDescriptor(window.document, _key);

            if (!_descriptor || _descriptor.configurable === true) {
                Object.defineProperty(window.document, _key, {
                    value: _window.document[_key]
                });
            }
        }
        window.parent = window;
        window.my = my;
    } else {
        _window.my = my;
        for (var _key2 in _window) {
            window[_key2] = _window[_key2];
        }
    }
}

inject();

/***/ }),

/***/ "./src/localStorage.js":
/*!*****************************!*\
  !*** ./src/localStorage.js ***!
  \*****************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});
var localStorage = {
    get length() {
        var _my$getStorageInfoSyn = my.getStorageInfoSync(),
            keys = _my$getStorageInfoSyn.keys;

        console.log("getStorageInfoSync: " + JSON.stringify(my.getStorageInfoSync()));
        return keys.length;
    },

    key: function key(n) {
        var _my$getStorageInfoSyn2 = my.getStorageInfoSync(),
            keys = _my$getStorageInfoSyn2.keys;

        return keys[n];
    },
    getItem: function getItem(key) {
        var value = my.getStorageSync({ key: key });
        return value.data === null ? null : value.data;
    },
    setItem: function setItem(key, value) {
        if (window.asyncStorage) {
            return my.setStorage({
                key: key,
                data: value
            });
        }
        return my.setStorageSync({ key: key, data: value });
    },
    removeItem: function removeItem(key) {
        if (window.asyncStorage) {
            return my.removeStorage({
                key: key
            });
        }
        return my.removeStorageSync({ key: key });
    },
    clear: function clear() {
        if (window.asyncStorage) {
            return my.clearStorage();
        }
        return my.clearStorageSync();
    }
};

exports.default = localStorage;

/***/ }),

/***/ "./src/location.js":
/*!*************************!*\
  !*** ./src/location.js ***!
  \*************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
var location = {
  href: 'game.js',
  hostname: "alipay.com",
  protocol: '',

  reload: function reload() {},
  replace: function replace() {}
};

exports.default = location;

/***/ }),

/***/ "./src/navigator.js":
/*!**************************!*\
  !*** ./src/navigator.js ***!
  \**************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});

var _noop = __webpack_require__(/*! ./utils/noop */ "./src/utils/noop.js");

var systemInfo = my.getSystemInfoSync();

var _ref = systemInfo || {},
    system = _ref.system,
    _ref$platform = _ref.platform,
    platform = _ref$platform === undefined ? "android" : _ref$platform,
    language = _ref.language;

var android = platform.toLowerCase().indexOf('android') !== -1;

if (my.onNetworkStatusChange) {
    my.onNetworkStatusChange(function (res) {
        navigator.onLine = res.isConnected ? true : false;
    });
}

function getCurrentPosition(cb) {
    if (typeof cb !== "function") {
        throw new TypeError("Failed to execute 'getCurrentPosition' on 'Geolocation': 1 argument required, but only 0 present.");
    }

    my.getLocation({
        success: function success(res) {
            var accuracy = res.accuracy,
                latitude = res.latitude,
                longitude = res.longitude;

            cb({
                coords: {
                    accuracy: accuracy,
                    latitude: latitude,
                    longitude: longitude
                },
                timestamp: new Date().valueOf()
            });
        }
    });
}

var uaDesc = android ? 'Android; CPU ' + system : 'iPhone; CPU iPhone OS ' + system + ' like Mac OS X';
var userAgent = "Mozilla/5.0 (" + uaDesc + ") AliApp(AP/" + systemInfo.version + ") AppleWebKit/603.1.30 (KHTML, like Gecko) Mobile/14E8301 MicroMessenger/6.6.0 AlipayMiniGame NetType/WIFI Language/" + language;
if (window.navigator) {
    userAgent = window.navigator.userAgent + " AlipayMiniGame";
}

var navigator = {
    platform: platform,
    language: language,
    userAgent: userAgent,
    appVersion: '5.0 (' + uaDesc + ') AppleWebKit/601.1.46 (KHTML, like Gecko) Version/9.0 Mobile/13B143 Safari/601.1',
    geolocation: {
        getCurrentPosition: getCurrentPosition,
        watchPositon: _noop.noop,
        clearWatch: _noop.noop
    }
};

exports.default = navigator;

/***/ }),

/***/ "./src/utils/noop.js":
/*!***************************!*\
  !*** ./src/utils/noop.js ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.noop = noop;
function noop() {};

/***/ }),

/***/ "./src/utils/util.js":
/*!***************************!*\
  !*** ./src/utils/util.js ***!
  \***************************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.isIDE = undefined;
exports.transformArrayBufferToBase64 = transformArrayBufferToBase64;
exports.arrayBufferToBase64 = arrayBufferToBase64;
exports.base64ToArrayBuffer = base64ToArrayBuffer;

var _Base = __webpack_require__(/*! ../Base64 */ "./src/Base64.js");

function transformArrayBufferToBase64(buffer) {
  var binary = '';
  var bytes = new Uint8Array(buffer);
  for (var len = bytes.byteLength, i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return (0, _Base.btoa)(binary);
}

function encode(str) {
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var string = String(str);
  var result = '';
  var currentIndex = 0;
  var sum = void 0;
  while (string.charAt(0 | currentIndex) || (encodings = '=', currentIndex % 1)) {
    currentIndex += 0.75; // 每次移动3/4个位置
    var currentCode = string.charCodeAt(currentIndex); // 获取code point
    if (currentCode > 255) {
      // 大于255无法处理
      throw new Error('"btoa" failed');
    }
    sum = sum << 8 | currentCode; // 每次在上次的基础上左移8位再加上当前code point
    var encodeIndex = 63 & sum >> 8 - currentIndex % 1 * 8; // 去除多余的位数，再去最后6位
    result += encodings.charAt(encodeIndex);
  }

  return result;
}

function decode(str) {
  var encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var res = '';
  var string = String(str).replace(/[=]+$/, '');
  var o,
      r,
      i = 0,
      currentIndex = 0;
  while (r = string.charAt(currentIndex)) {
    currentIndex = currentIndex + 1;
    r = encodings.indexOf(r);
    if (~r) {
      o = i % 4 ? 64 * o + r : r;
      if (i++ % 4) {
        res += String.fromCharCode(255 & o >> (-2 * i & 6));
      }
    }
  }

  return res;
}

function arrayBufferToBase64(buffer) {
  var result = '';
  var uintArray = new Uint8Array(buffer);
  var byteLength = uintArray.byteLength;
  for (var i = 0; i < byteLength; i++) {
    result += String.fromCharCode(uintArray[i]);
  }
  return encode(result);
}

function base64ToArrayBuffer(base64) {
  var string = decode(base64);
  var length = string.length;
  var uintArray = new Uint8Array(length);
  for (var i = 0; i < length; i++) {
    uintArray[i] = string.charCodeAt(i);
  }
  return uintArray.buffer;
}

var isIDE = exports.isIDE = window.navigator && /AlipayIDE/.test(window.navigator.userAgent);

/***/ }),

/***/ "./src/window.js":
/*!***********************!*\
  !*** ./src/window.js ***!
  \***********************/
/*! no static exports found */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.canvas = exports.location = exports.atob = exports.btoa = exports.localStorage = exports.MouseEvent = exports.TouchEvent = exports.WebGLRenderingContext = exports.HTMLVideoElement = exports.HTMLAudioElement = exports.HTMLMediaElement = exports.HTMLCanvasElement = exports.HTMLImageElement = exports.HTMLElement = exports.Element = exports.FileReader = exports.Audio = exports.ImageBitmap = exports.Image = exports.WebSocket = exports.XMLHttpRequest = exports.navigator = undefined;

var _navigator = __webpack_require__(/*! ./navigator */ "./src/navigator.js");

Object.defineProperty(exports, 'navigator', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_navigator).default;
    }
});

var _XMLHttpRequest = __webpack_require__(/*! ./XMLHttpRequest */ "./src/XMLHttpRequest.js");

Object.defineProperty(exports, 'XMLHttpRequest', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_XMLHttpRequest).default;
    }
});

var _WebSocket = __webpack_require__(/*! ./WebSocket */ "./src/WebSocket.js");

Object.defineProperty(exports, 'WebSocket', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_WebSocket).default;
    }
});

var _Image = __webpack_require__(/*! ./Image */ "./src/Image.js");

Object.defineProperty(exports, 'Image', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_Image).default;
    }
});

var _ImageBitmap = __webpack_require__(/*! ./ImageBitmap */ "./src/ImageBitmap.js");

Object.defineProperty(exports, 'ImageBitmap', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_ImageBitmap).default;
    }
});

var _Audio = __webpack_require__(/*! ./Audio */ "./src/Audio.js");

Object.defineProperty(exports, 'Audio', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_Audio).default;
    }
});

var _FileReader = __webpack_require__(/*! ./FileReader */ "./src/FileReader.js");

Object.defineProperty(exports, 'FileReader', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_FileReader).default;
    }
});

var _Element = __webpack_require__(/*! ./Element */ "./src/Element.js");

Object.defineProperty(exports, 'Element', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_Element).default;
    }
});

var _HTMLElement = __webpack_require__(/*! ./HTMLElement */ "./src/HTMLElement.js");

Object.defineProperty(exports, 'HTMLElement', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_HTMLElement).default;
    }
});

var _HTMLImageElement = __webpack_require__(/*! ./HTMLImageElement */ "./src/HTMLImageElement.js");

Object.defineProperty(exports, 'HTMLImageElement', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_HTMLImageElement).default;
    }
});

var _HTMLCanvasElement = __webpack_require__(/*! ./HTMLCanvasElement */ "./src/HTMLCanvasElement.js");

Object.defineProperty(exports, 'HTMLCanvasElement', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_HTMLCanvasElement).default;
    }
});

var _HTMLMediaElement = __webpack_require__(/*! ./HTMLMediaElement */ "./src/HTMLMediaElement.js");

Object.defineProperty(exports, 'HTMLMediaElement', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_HTMLMediaElement).default;
    }
});

var _HTMLAudioElement = __webpack_require__(/*! ./HTMLAudioElement */ "./src/HTMLAudioElement.js");

Object.defineProperty(exports, 'HTMLAudioElement', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_HTMLAudioElement).default;
    }
});

var _HTMLVideoElement = __webpack_require__(/*! ./HTMLVideoElement */ "./src/HTMLVideoElement.js");

Object.defineProperty(exports, 'HTMLVideoElement', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_HTMLVideoElement).default;
    }
});

var _WebGLRenderingContext = __webpack_require__(/*! ./WebGLRenderingContext */ "./src/WebGLRenderingContext.js");

Object.defineProperty(exports, 'WebGLRenderingContext', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_WebGLRenderingContext).default;
    }
});

var _index = __webpack_require__(/*! ./EventIniter/index.js */ "./src/EventIniter/index.js");

Object.defineProperty(exports, 'TouchEvent', {
    enumerable: true,
    get: function get() {
        return _index.TouchEvent;
    }
});
Object.defineProperty(exports, 'MouseEvent', {
    enumerable: true,
    get: function get() {
        return _index.MouseEvent;
    }
});

var _localStorage = __webpack_require__(/*! ./localStorage */ "./src/localStorage.js");

Object.defineProperty(exports, 'localStorage', {
    enumerable: true,
    get: function get() {
        return _interopRequireDefault(_localStorage).default;
    }
});

var _Base = __webpack_require__(/*! ./Base64 */ "./src/Base64.js");

Object.defineProperty(exports, 'btoa', {
    enumerable: true,
    get: function get() {
        return _Base.btoa;
    }
});
Object.defineProperty(exports, 'atob', {
    enumerable: true,
    get: function get() {
        return _Base.atob;
    }
});

var _WindowProperties = __webpack_require__(/*! ./WindowProperties */ "./src/WindowProperties.js");

Object.keys(_WindowProperties).forEach(function (key) {
    if (key === "default" || key === "__esModule") return;
    Object.defineProperty(exports, key, {
        enumerable: true,
        get: function get() {
            return _WindowProperties[key];
        }
    });
});
exports.alert = alert;
exports.focus = focus;
exports.blur = blur;

var _Canvas = __webpack_require__(/*! ./Canvas */ "./src/Canvas.js");

var _Canvas2 = _interopRequireDefault(_Canvas);

var _location = __webpack_require__(/*! ./location */ "./src/location.js");

var _location2 = _interopRequireDefault(_location);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var location = exports.location = _location2.default;

// 暴露全局的 canvas
window.screencanvas = window.screencanvas || new _Canvas2.default();
window.self = window;
var canvas = exports.canvas = window.screencanvas;

function alert(msg) {
    my.alert({
        content: msg
    });
}

function focus() {}

function blur() {}

/***/ })

/******/ });
//# sourceMappingURL=my-adapter.js.map

require('../../../common/xmldom/dom-parser');
require('./unify');
