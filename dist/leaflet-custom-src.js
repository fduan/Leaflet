/*
 Copyright (c) 2010-2012, CloudMade, Vladimir Agafonkin
 Leaflet is an open-source JavaScript library for mobile-friendly interactive maps.
 http://leaflet.cloudmade.com
*/
(function (window, undefined) {

var L, originalL;

if (typeof exports !== undefined + '') {
	L = exports;
} else {
	originalL = window.L;
	L = {};

	L.noConflict = function () {
		window.L = originalL;
		return this;
	};

	window.L = L;
}

L.version = '0.4.2';


/*
 * L.Util is a namespace for various utility functions.
 */

L.Util = {
	extend: function (/*Object*/ dest) /*-> Object*/ {	// merge src properties into dest
		var sources = Array.prototype.slice.call(arguments, 1);
		for (var j = 0, len = sources.length, src; j < len; j++) {
			src = sources[j] || {};
			for (var i in src) {
				if (src.hasOwnProperty(i)) {
					dest[i] = src[i];
				}
			}
		}
		return dest;
	},

	bind: function (fn, obj) { // (Function, Object) -> Function
		var args = arguments.length > 2 ? Array.prototype.slice.call(arguments, 2) : null;
		return function () {
			return fn.apply(obj, args || arguments);
		};
	},

	stamp: (function () {
		var lastId = 0, key = '_leaflet_id';
		return function (/*Object*/ obj) {
			obj[key] = obj[key] || ++lastId;
			return obj[key];
		};
	}()),

	limitExecByInterval: function (fn, time, context) {
		var lock, execOnUnlock;

		return function wrapperFn() {
			var args = arguments;

			if (lock) {
				execOnUnlock = true;
				return;
			}

			lock = true;

			setTimeout(function () {
				lock = false;

				if (execOnUnlock) {
					wrapperFn.apply(context, args);
					execOnUnlock = false;
				}
			}, time);

			fn.apply(context, args);
		};
	},

	falseFn: function () {
		return false;
	},

	formatNum: function (num, digits) {
		var pow = Math.pow(10, digits || 5);
		return Math.round(num * pow) / pow;
	},

	splitWords: function (str) {
		return str.replace(/^\s+|\s+$/g, '').split(/\s+/);
	},

	setOptions: function (obj, options) {
		obj.options = L.Util.extend({}, obj.options, options);
		return obj.options;
	},

	getParamString: function (obj) {
		var params = [];
		for (var i in obj) {
			if (obj.hasOwnProperty(i)) {
				params.push(i + '=' + obj[i]);
			}
		}
		return '?' + params.join('&');
	},

	template: function (str, data) {
		return str.replace(/\{ *([\w_]+) *\}/g, function (str, key) {
			var value = data[key];
			if (!data.hasOwnProperty(key)) {
				throw new Error('No value provided for variable ' + str);
			}
			return value;
		});
	},

	emptyImageUrl: 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
};

(function () {

	function getPrefixed(name) {
		var i, fn,
			prefixes = ['webkit', 'moz', 'o', 'ms'];

		for (i = 0; i < prefixes.length && !fn; i++) {
			fn = window[prefixes[i] + name];
		}

		return fn;
	}

	function timeoutDefer(fn) {
		return window.setTimeout(fn, 1000 / 60);
	}

	var requestFn = window.requestAnimationFrame ||
			getPrefixed('RequestAnimationFrame') || timeoutDefer;

	var cancelFn = window.cancelAnimationFrame ||
			getPrefixed('CancelAnimationFrame') ||
			getPrefixed('CancelRequestAnimationFrame') ||
			function (id) {
				window.clearTimeout(id);
			};


	L.Util.requestAnimFrame = function (fn, context, immediate, element) {
		fn = L.Util.bind(fn, context);

		if (immediate && requestFn === timeoutDefer) {
			fn();
		} else {
			return requestFn.call(window, fn, element);
		}
	};

	L.Util.cancelAnimFrame = function (id) {
		if (id) {
			cancelFn.call(window, id);
		}
	};

}());


/*
 * Class powers the OOP facilities of the library. Thanks to John Resig and Dean Edwards for inspiration!
 */

L.Class = function () {};

L.Class.extend = function (/*Object*/ props) /*-> Class*/ {

	// extended class with the new prototype
	var NewClass = function () {
		if (this.initialize) {
			this.initialize.apply(this, arguments);
		}
	};

	// instantiate class without calling constructor
	var F = function () {};
	F.prototype = this.prototype;

	var proto = new F();
	proto.constructor = NewClass;

	NewClass.prototype = proto;

	//inherit parent's statics
	for (var i in this) {
		if (this.hasOwnProperty(i) && i !== 'prototype') {
			NewClass[i] = this[i];
		}
	}

	// mix static properties into the class
	if (props.statics) {
		L.Util.extend(NewClass, props.statics);
		delete props.statics;
	}

	// mix includes into the prototype
	if (props.includes) {
		L.Util.extend.apply(null, [proto].concat(props.includes));
		delete props.includes;
	}

	// merge options
	if (props.options && proto.options) {
		props.options = L.Util.extend({}, proto.options, props.options);
	}

	// mix given properties into the prototype
	L.Util.extend(proto, props);

	return NewClass;
};


// method for adding properties to prototype
L.Class.include = function (props) {
	L.Util.extend(this.prototype, props);
};

L.Class.mergeOptions = function (options) {
	L.Util.extend(this.prototype.options, options);
};

/*
 * L.Mixin.Events adds custom events functionality to Leaflet classes
 */

var key = '_leaflet_events';

L.Mixin = {};

L.Mixin.Events = {
	
	addEventListener: function (types, fn, context) { // (String, Function[, Object]) or (Object[, Object])
		var events = this[key] = this[key] || {},
			type, i, len;
		
		// Types can be a map of types/handlers
		if (typeof types === 'object') {
			for (type in types) {
				if (types.hasOwnProperty(type)) {
					this.addEventListener(type, types[type], fn);
				}
			}
			
			return this;
		}
		
		types = L.Util.splitWords(types);
		
		for (i = 0, len = types.length; i < len; i++) {
			events[types[i]] = events[types[i]] || [];
			events[types[i]].push({
				action: fn,
				context: context || this
			});
		}
		
		return this;
	},

	hasEventListeners: function (type) { // (String) -> Boolean
		return (key in this) && (type in this[key]) && (this[key][type].length > 0);
	},

	removeEventListener: function (types, fn, context) { // (String[, Function, Object]) or (Object[, Object])
		var events = this[key],
			type, i, len, listeners, j;
		
		if (typeof types === 'object') {
			for (type in types) {
				if (types.hasOwnProperty(type)) {
					this.removeEventListener(type, types[type], fn);
				}
			}
			
			return this;
		}
		
		types = L.Util.splitWords(types);

		for (i = 0, len = types.length; i < len; i++) {

			if (this.hasEventListeners(types[i])) {
				listeners = events[types[i]];
				
				for (j = listeners.length - 1; j >= 0; j--) {
					if (
						(!fn || listeners[j].action === fn) &&
						(!context || (listeners[j].context === context))
					) {
						listeners.splice(j, 1);
					}
				}
			}
		}
		
		return this;
	},

	fireEvent: function (type, data) { // (String[, Object])
		if (!this.hasEventListeners(type)) {
			return this;
		}

		var event = L.Util.extend({
			type: type,
			target: this
		}, data);

		var listeners = this[key][type].slice();

		for (var i = 0, len = listeners.length; i < len; i++) {
			listeners[i].action.call(listeners[i].context || this, event);
		}

		return this;
	}
};

L.Mixin.Events.on = L.Mixin.Events.addEventListener;
L.Mixin.Events.off = L.Mixin.Events.removeEventListener;
L.Mixin.Events.fire = L.Mixin.Events.fireEvent;


(function () {
	var ua = navigator.userAgent.toLowerCase(),
		ie = !!window.ActiveXObject,
		ie6 = ie && !window.XMLHttpRequest,
		webkit = ua.indexOf("webkit") !== -1,
		gecko = ua.indexOf("gecko") !== -1,
		//Terrible browser detection to work around a safari / iOS / android browser bug. See TileLayer._addTile and debug/hacks/jitter.html
		chrome = ua.indexOf("chrome") !== -1,
		opera = window.opera,
		android = ua.indexOf("android") !== -1,
		android23 = ua.search("android [23]") !== -1,
		mobile = typeof orientation !== undefined + '' ? true : false,
		doc = document.documentElement,
		ie3d = ie && ('transition' in doc.style),
		webkit3d = webkit && ('WebKitCSSMatrix' in window) && ('m11' in new window.WebKitCSSMatrix()),
		gecko3d = gecko && ('MozPerspective' in doc.style),
		opera3d = opera && ('OTransition' in doc.style);

	var touch = !window.L_NO_TOUCH && (function () {
		var startName = 'ontouchstart';

		// WebKit, etc
		if (startName in doc) {
			return true;
		}

		// Firefox/Gecko
		var div = document.createElement('div'),
			supported = false;

		if (!div.setAttribute) {
			return false;
		}
		div.setAttribute(startName, 'return;');

		if (typeof div[startName] === 'function') {
			supported = true;
		}

		div.removeAttribute(startName);
		div = null;

		return supported;
	}());

	var retina = (('devicePixelRatio' in window && window.devicePixelRatio > 1) || ('matchMedia' in window && window.matchMedia("(min-resolution:144dpi)").matches));

	L.Browser = {
		ua: ua,
		ie: ie,
		ie6: ie6,
		webkit: webkit,
		gecko: gecko,
		opera: opera,
		android: android,
		android23: android23,

		chrome: chrome,

		ie3d: ie3d,
		webkit3d: webkit3d,
		gecko3d: gecko3d,
		opera3d: opera3d,
		any3d: !window.L_DISABLE_3D && (ie3d || webkit3d || gecko3d || opera3d),

		mobile: mobile,
		mobileWebkit: mobile && webkit,
		mobileWebkit3d: mobile && webkit3d,
		mobileOpera: mobile && opera,

		touch: touch,

		retina: retina
	};
}());


/*
 * L.Point represents a point with x and y coordinates.
 */

L.Point = function (/*Number*/ x, /*Number*/ y, /*Boolean*/ round) {
	this.x = (round ? Math.round(x) : x);
	this.y = (round ? Math.round(y) : y);
};

L.Point.prototype = {
	add: function (point) {
		return this.clone()._add(L.point(point));
	},

	_add: function (point) {
		this.x += point.x;
		this.y += point.y;
		return this;
	},

	subtract: function (point) {
		return this.clone()._subtract(L.point(point));
	},

	// destructive subtract (faster)
	_subtract: function (point) {
		this.x -= point.x;
		this.y -= point.y;
		return this;
	},

	divideBy: function (num, round) {
		return new L.Point(this.x / num, this.y / num, round);
	},

	multiplyBy: function (num, round) {
		return new L.Point(this.x * num, this.y * num, round);
	},

	distanceTo: function (point) {
		point = L.point(point);

		var x = point.x - this.x,
			y = point.y - this.y;

		return Math.sqrt(x * x + y * y);
	},

	round: function () {
		return this.clone()._round();
	},

	// destructive round
	_round: function () {
		this.x = Math.round(this.x);
		this.y = Math.round(this.y);
		return this;
	},

	floor: function () {
		return this.clone()._floor();
	},

	_floor: function () {
		this.x = Math.floor(this.x);
		this.y = Math.floor(this.y);
		return this;
	},

	clone: function () {
		return new L.Point(this.x, this.y);
	},

	toString: function () {
		return 'Point(' +
				L.Util.formatNum(this.x) + ', ' +
				L.Util.formatNum(this.y) + ')';
	}
};

L.point = function (x, y, round) {
	if (x instanceof L.Point) {
		return x;
	}
	if (x instanceof Array) {
		return new L.Point(x[0], x[1]);
	}
	if (isNaN(x)) {
		return x;
	}
	return new L.Point(x, y, round);
};


/*
 * L.Bounds represents a rectangular area on the screen in pixel coordinates.
 */

L.Bounds = L.Class.extend({

	initialize: function (a, b) {	//(Point, Point) or Point[]
		if (!a) { return; }

		var points = b ? [a, b] : a;

		for (var i = 0, len = points.length; i < len; i++) {
			this.extend(points[i]);
		}
	},

	// extend the bounds to contain the given point
	extend: function (point) { // (Point)
		point = L.point(point);

		if (!this.min && !this.max) {
			this.min = point.clone();
			this.max = point.clone();
		} else {
			this.min.x = Math.min(point.x, this.min.x);
			this.max.x = Math.max(point.x, this.max.x);
			this.min.y = Math.min(point.y, this.min.y);
			this.max.y = Math.max(point.y, this.max.y);
		}
		return this;
	},

	getCenter: function (round) { // (Boolean) -> Point
		return new L.Point(
				(this.min.x + this.max.x) / 2,
				(this.min.y + this.max.y) / 2, round);
	},

	getBottomLeft: function () { // -> Point
		return new L.Point(this.min.x, this.max.y);
	},

	getTopRight: function () { // -> Point
		return new L.Point(this.max.x, this.min.y);
	},

	contains: function (obj) { // (Bounds) or (Point) -> Boolean
		var min, max;

		if (typeof obj[0] === 'number' || obj instanceof L.Point) {
			obj = L.point(obj);
		} else {
			obj = L.bounds(obj);
		}

		if (obj instanceof L.Bounds) {
			min = obj.min;
			max = obj.max;
		} else {
			min = max = obj;
		}

		return (min.x >= this.min.x) &&
				(max.x <= this.max.x) &&
				(min.y >= this.min.y) &&
				(max.y <= this.max.y);
	},

	intersects: function (bounds) { // (Bounds) -> Boolean
		bounds = L.bounds(bounds);

		var min = this.min,
			max = this.max,
			min2 = bounds.min,
			max2 = bounds.max;

		var xIntersects = (max2.x >= min.x) && (min2.x <= max.x),
			yIntersects = (max2.y >= min.y) && (min2.y <= max.y);

		return xIntersects && yIntersects;
	}

});

L.bounds = function (a, b) { // (Bounds) or (Point, Point) or (Point[])
	if (!a || a instanceof L.Bounds) {
		return a;
	}
	return new L.Bounds(a, b);
};


/*
 * L.Transformation is an utility class to perform simple point transformations through a 2d-matrix.
 */

L.Transformation = L.Class.extend({
	initialize: function (/*Number*/ a, /*Number*/ b, /*Number*/ c, /*Number*/ d) {
		this._a = a;
		this._b = b;
		this._c = c;
		this._d = d;
	},

	transform: function (point, scale) {
		return this._transform(point.clone(), scale);
	},

	// destructive transform (faster)
	_transform: function (/*Point*/ point, /*Number*/ scale) /*-> Point*/ {
		scale = scale || 1;
		point.x = scale * (this._a * point.x + this._b);
		point.y = scale * (this._c * point.y + this._d);
		return point;
	},

	untransform: function (/*Point*/ point, /*Number*/ scale) /*-> Point*/ {
		scale = scale || 1;
		return new L.Point(
			(point.x / scale - this._b) / this._a,
			(point.y / scale - this._d) / this._c);
	}
});


/*
 * L.DomUtil contains various utility functions for working with DOM
 */

L.DomUtil = {
	get: function (id) {
		return (typeof id === 'string' ? document.getElementById(id) : id);
	},

	getStyle: function (el, style) {
		var value = el.style[style];
		if (!value && el.currentStyle) {
			value = el.currentStyle[style];
		}
		if (!value || value === 'auto') {
			var css = document.defaultView.getComputedStyle(el, null);
			value = css ? css[style] : null;
		}
		return (value === 'auto' ? null : value);
	},

	getViewportOffset: function (element) {
		var top = 0,
			left = 0,
			el = element,
			docBody = document.body;

		do {
			top += el.offsetTop || 0;
			left += el.offsetLeft || 0;

			if (el.offsetParent === docBody &&
					L.DomUtil.getStyle(el, 'position') === 'absolute') {
				break;
			}
			if (L.DomUtil.getStyle(el, 'position') === 'fixed') {
				top += docBody.scrollTop || 0;
				left += docBody.scrollLeft || 0;
				break;
			}

			el = el.offsetParent;
		} while (el);

		el = element;

		do {
			if (el === docBody) {
				break;
			}

			top -= el.scrollTop || 0;
			left -= el.scrollLeft || 0;

			el = el.parentNode;
		} while (el);

		return new L.Point(left, top);
	},

	create: function (tagName, className, container) {
		var el = document.createElement(tagName);
		el.className = className;
		if (container) {
			container.appendChild(el);
		}
		return el;
	},

	disableTextSelection: function () {
		if (document.selection && document.selection.empty) {
			document.selection.empty();
		}
		if (!this._onselectstart) {
			this._onselectstart = document.onselectstart;
			document.onselectstart = L.Util.falseFn;
		}
	},

	enableTextSelection: function () {
		document.onselectstart = this._onselectstart;
		this._onselectstart = null;
	},

	hasClass: function (el, name) {
		return (el.className.length > 0) &&
				new RegExp("(^|\\s)" + name + "(\\s|$)").test(el.className);
	},

	addClass: function (el, name) {
		if (!L.DomUtil.hasClass(el, name)) {
			el.className += (el.className ? ' ' : '') + name;
		}
	},

	removeClass: function (el, name) {
		function replaceFn(w, match) {
			if (match === name) {
				return '';
			}
			return w;
		}
		el.className = el.className
				.replace(/(\S+)\s*/g, replaceFn)
				.replace(/(^\s+|\s+$)/, '');
	},

	setOpacity: function (el, value) {

		if ('opacity' in el.style) {
			el.style.opacity = value;

		} else if (L.Browser.ie) {

			var filter = false,
				filterName = 'DXImageTransform.Microsoft.Alpha';

			// filters collection throws an error if we try to retrieve a filter that doesn't exist
			try { filter = el.filters.item(filterName); } catch (e) {}

			value = Math.round(value * 100);

			if (filter) {
				filter.Enabled = (value !== 100);
				filter.Opacity = value;
			} else {
				el.style.filter += ' progid:' + filterName + '(opacity=' + value + ')';
			}
		}
	},

	testProp: function (props) {
		var style = document.documentElement.style;

		for (var i = 0; i < props.length; i++) {
			if (props[i] in style) {
				return props[i];
			}
		}
		return false;
	},

	getTranslateString: function (point) {
		// On webkit browsers (Chrome/Safari/MobileSafari/Android) using translate3d instead of translate
		// makes animation smoother as it ensures HW accel is used. Firefox 13 doesn't care
		// (same speed either way), Opera 12 doesn't support translate3d

		var is3d = L.Browser.webkit3d,
			open = 'translate' + (is3d ? '3d' : '') + '(',
			close = (is3d ? ',0' : '') + ')';

		return open + point.x + 'px,' + point.y + 'px' + close;
	},

	getScaleString: function (scale, origin) {
		var preTranslateStr = L.DomUtil.getTranslateString(origin),
			scaleStr = ' scale(' + scale + ') ',
			postTranslateStr = L.DomUtil.getTranslateString(origin.multiplyBy(-1));

		return preTranslateStr + scaleStr + postTranslateStr;
	},

	setPosition: function (el, point, disable3D) {
		el._leaflet_pos = point;
		if (!disable3D && L.Browser.any3d) {
			el.style[L.DomUtil.TRANSFORM] =  L.DomUtil.getTranslateString(point);

			// workaround for Android 2/3 stability (https://github.com/CloudMade/Leaflet/issues/69)
			if (L.Browser.mobileWebkit3d) {
				el.style.WebkitBackfaceVisibility = 'hidden';
			}
		} else {
			el.style.left = point.x + 'px';
			el.style.top = point.y + 'px';
		}
	},

	getPosition: function (el) {
		return el._leaflet_pos;
	}
};

L.Util.extend(L.DomUtil, {
	TRANSITION: L.DomUtil.testProp(['transition', 'webkitTransition', 'OTransition', 'MozTransition', 'msTransition']),
	TRANSFORM: L.DomUtil.testProp(['transform', 'WebkitTransform', 'OTransform', 'MozTransform', 'msTransform'])
});




}(this));