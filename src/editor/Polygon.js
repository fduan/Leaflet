/*
 * Forked from polyline
 */

L.Editor.Polygon = L.Editor.Base.extend({
	type: 'polygon',
	title: 'Polygon',
	
	add: function (e) {
		var map = e.target,
			o = {}, oh = {};
		
		L.Util.extend(o, this._controller.getLayerOptions('polygon'));
		L.Util.extend(oh, this._controller.getLayerOptions('polygon_helper'));
		
		// First point
		if (this._poly === null) {
			var poly = new L.Polyline([e.latlng], o);
			poly.editing.enable();
			this._poly = poly;
			
			var hcoords = [e.latlng, e.latlng];
			hcoords.push(poly.getLatLngs()[0]);
			
			// Helper
			var helper = new L.Polyline(hcoords, oh);
			helper.addTo(map);
			this._helper = helper;
			
			map.addLayer(poly);
			map.on('mousemove', this.helper, this);
			map.on('contextmenu', this.validate, this);
			helper.on('click', this.extend, this);
		
		} else {
			this.extend.apply(this, [e]);
		}
	},
	
	extend: function (e) {
		var	poly = this._poly,
			helper = this._helper;
		poly.addLatLng(e.latlng);
		poly.editing.disable();
		poly.editing.enable();
		helper.spliceLatLngs(0, 1, e.latlng);
	},
	
	helper: function (e) {
		var map = e.target,
			helper = this._helper;
		if (helper) {
			var latlngs = helper.getLatLngs();
			helper.spliceLatLngs(1, 1, e.latlng);
		}
		this.off('click', this.extend, this);
	},
	
	validate: function (e) {
		var map = e.target,
			poly = this._poly,
			helper = this._helper;
		
		if (poly !== null) {
			if (helper) {
				map.removeLayer(helper);
				
				var polygon = new L.Polygon(poly.getLatLngs());
				map.removeLayer(poly);
				map.addLayer(polygon);
				
			} else if (poly.getLatLngs().length <= 1) {
				map.removeLayer(poly);
			}
		}
		
		map.off('mousemove', this.helper, this);
		map.off('contextmenu', this.validate, this);
		helper.off('click', this.extend, this);
		
		this._poly = null;
		this._helper = null;
	},
	
	
	enable: function (map) {
		this._poly = null;
		this._helper = null;
		map.on('click', this.add, this);
	},
	
	disable: function (map) {
		map.off('click', this.add, this);
	}
});
