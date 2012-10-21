L.Control.Editor = L.Control.extend({
	options: {
		position: 'topleft',
		editables: {
			'marker': true,
			'circle': true,
			'polyline': true,
			'polygon': true
		}
	},
	
	_layer_options: {
		marker: {},
		circle: {},
		polyline: {},
		polyline_helper: { dashArray: '10, 10'},
		polygon: {},
		polygon_helper: { dashArray: '10, 10'},
		rectangle: {}
	},
	
	includes: [L.Mixin.Events],
	
	_editors: {},
	
	onAdd: function (map) {
		var	className = 'leaflet-control-editor',
			container = L.DomUtil.create('div', className),
			type = null;
		
		if (typeof(L.Editor.Marker) !== 'undefined') {
			this.register.apply(this, [new L.Editor.Marker()]);
		}
		if (typeof(L.Editor.Circle) !== 'undefined') {
			this.register.apply(this, [new L.Editor.Circle()]);
		}
		if (typeof(L.Editor.Polyline) !== 'undefined') {
			this.register.apply(this, [new L.Editor.Polyline()]);
		}
		if (typeof(L.Editor.Polygon) !== 'undefined') {
			this.register.apply(this, [new L.Editor.Polygon()]);
		}
				
		for (type in this._editors) {
			if (true) {
				var	editor = this._editors[type];
				editor._map = map;
				editor._controller = this;
				
				var link = this._createButton.apply(this, [editor.title, className + '-' + editor.type, container, editor]);
			}
		}
		
		return container;
	},
	
	_createButton: function (title, className, container, editor) {
		var link = L.DomUtil.create('a', className, container);
		link.href = '#';
		link.title = title;
		editor._link = link;
		L.DomEvent
			.on(link, 'click', L.DomEvent.stopPropagation)
			.on(link, 'click', L.DomEvent.preventDefault)
			.on(link, 'click', editor._onClick, editor)
			.on(link, 'dblclick', L.DomEvent.stopPropagation);

		return link;
	},
	
	register: function (editor) {
		if (typeof(this.options.editables[editor.type]) !== 'undefined' && this.options.editables[editor.type] === true) {
			if (typeof(this._editors[editor.type]) === 'undefined') {
				this._editors[editor.type] = editor;
			}
		}
	},
	
	getLayerOptions: function (type) {
		if (typeof(this._layer_options[type]) === 'undefined') {
			return {};
		} else {
			return this._layer_options[type];
		}
	},
	
	setLayerOptions: function (type, options) {
		if (typeof(this._layer_options[type]) !== 'undefined') {
			this._layer_options[type] = options;
		}
	}
	
});
