L.Editor = {};

L.Editor.Base = L.Class.extend({
	ns: 'editor',
	type: 'base', // marker, circle, polygon, polyline, ... must be unique !!!
	title: 'Editor',
	
	options: {},
	includes: [L.Mixin.Events],
	
	_enabled: false,
	_controller: null,
	
	initialize: function () {},
	
	enabled: function () {
		return this._enabled;
	},
	
/* Theses two following commented methods must be implemented in child editor buttons */
	enable: function (map) {},
	disable: function (map) {},
	
	_enable: function (e) {
		if (! this._enabled) {
			this._enabled = true;
			this.enable.apply(this, [this._map]);
			
			L.DomUtil.addClass(this._link, 'active');
			this.fire(this.ns + this.type + 'enable');
		} else {
			this._disable.apply(this, [e]);
		}
	},
	
	_disable: function (e) {
		if (this._enabled) {
			this.disable.apply(this, [this._map]);
			this._enabled = false;
			
			L.DomUtil.removeClass(this._link, 'active');
			this.fire(this.ns + this.type + 'disable');
		}
	},
	
	_onClick: function (e) {
		if (! this._enabled && typeof (this._controller._editors) !== 'undefined') {
			var type = null;
			for (type in this._controller._editors) {
				if (true) {
					var editor = this._controller._editors[type];
					editor._disable.apply(editor);
				}
			}
		}
		this._enable.apply(this, [e]);
	}
});
