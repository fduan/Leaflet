
L.Editor.Marker = L.Editor.Base.extend({
	type: 'marker',
	title: 'Marker',
	
	// Marker add methods
	addmarker: function (e) {
		var o = {};
		L.Util.extend(o, this._controller.getLayerOptions('marker'));
		e.target.addLayer(new L.Marker(e.latlng, o));
	},
	
	enable: function (map) {
		map.on('click', this.addmarker, this);
	},
	
	disable: function (map) {
		map.off('click', this.addmarker, this);
	}
});
