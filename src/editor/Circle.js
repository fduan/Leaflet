
L.Editor.Circle = L.Editor.Base.extend({
	type: 'circle',
	title: 'Circle',
	
	// Marker add methods
	addcircle: function (e) {
		var map = e.target,
			o = {};
		L.Util.extend(o, this._controller.getLayerOptions('circle'));
		
		var circle = new L.Circle(e.latlng, 1, o);
		this._map = map;
		this._circle = circle;
		
		map.addLayer(circle);
		
		circle.on('click', this.validate, this);
		map.on('mousemove', this.resize, this);
	},
	
	resize: function (e) {
		var	map = e.target,
			center = this._circle.getLatLng();
		this._circle.setRadius(e.latlng.distanceTo(center));
	},
	
	validate: function (e) {
		this._circle.off('click', this.validate, this);
		this._map.off('mousemove', this.resize, this);
	},
	
	enable: function (map) {
		map.on('click', this.addcircle, this);
	},
	
	disable: function (map) {
		map.off('click', this.addcircle, this);
	}
});
