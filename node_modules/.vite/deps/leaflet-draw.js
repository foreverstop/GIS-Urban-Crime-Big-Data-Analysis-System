// node_modules/leaflet-draw/dist/leaflet.draw.js
!function(t, e, i) {
  function o(t2, e2) {
    for (; (t2 = t2.parentElement) && !t2.classList.contains(e2); ) ;
    return t2;
  }
  L.drawVersion = "1.0.4", L.Draw = {}, L.drawLocal = { draw: { toolbar: { actions: { title: "Cancel drawing", text: "Cancel" }, finish: { title: "Finish drawing", text: "Finish" }, undo: { title: "Delete last point drawn", text: "Delete last point" }, buttons: { polyline: "Draw a polyline", polygon: "Draw a polygon", rectangle: "Draw a rectangle", circle: "Draw a circle", marker: "Draw a marker", circlemarker: "Draw a circlemarker" } }, handlers: { circle: { tooltip: { start: "Click and drag to draw circle." }, radius: "Radius" }, circlemarker: { tooltip: { start: "Click map to place circle marker." } }, marker: { tooltip: { start: "Click map to place marker." } }, polygon: { tooltip: { start: "Click to start drawing shape.", cont: "Click to continue drawing shape.", end: "Click first point to close this shape." } }, polyline: { error: "<strong>Error:</strong> shape edges cannot cross!", tooltip: { start: "Click to start drawing line.", cont: "Click to continue drawing line.", end: "Click last point to finish line." } }, rectangle: { tooltip: { start: "Click and drag to draw rectangle." } }, simpleshape: { tooltip: { end: "Release mouse to finish drawing." } } } }, edit: { toolbar: { actions: { save: { title: "Save changes", text: "Save" }, cancel: { title: "Cancel editing, discards all changes", text: "Cancel" }, clearAll: { title: "Clear all layers", text: "Clear All" } }, buttons: { edit: "Edit layers", editDisabled: "No layers to edit", remove: "Delete layers", removeDisabled: "No layers to delete" } }, handlers: { edit: { tooltip: { text: "Drag handles or markers to edit features.", subtext: "Click cancel to undo changes." } }, remove: { tooltip: { text: "Click on a feature to remove." } } } } }, L.Draw.Event = {}, L.Draw.Event.CREATED = "draw:created", L.Draw.Event.EDITED = "draw:edited", L.Draw.Event.DELETED = "draw:deleted", L.Draw.Event.DRAWSTART = "draw:drawstart", L.Draw.Event.DRAWSTOP = "draw:drawstop", L.Draw.Event.DRAWVERTEX = "draw:drawvertex", L.Draw.Event.EDITSTART = "draw:editstart", L.Draw.Event.EDITMOVE = "draw:editmove", L.Draw.Event.EDITRESIZE = "draw:editresize", L.Draw.Event.EDITVERTEX = "draw:editvertex", L.Draw.Event.EDITSTOP = "draw:editstop", L.Draw.Event.DELETESTART = "draw:deletestart", L.Draw.Event.DELETESTOP = "draw:deletestop", L.Draw.Event.TOOLBAROPENED = "draw:toolbaropened", L.Draw.Event.TOOLBARCLOSED = "draw:toolbarclosed", L.Draw.Event.MARKERCONTEXT = "draw:markercontext", L.Draw = L.Draw || {}, L.Draw.Feature = L.Handler.extend({ initialize: function(t2, e2) {
    this._map = t2, this._container = t2._container, this._overlayPane = t2._panes.overlayPane, this._popupPane = t2._panes.popupPane, e2 && e2.shapeOptions && (e2.shapeOptions = L.Util.extend({}, this.options.shapeOptions, e2.shapeOptions)), L.setOptions(this, e2);
    var i2 = L.version.split(".");
    1 === parseInt(i2[0], 10) && parseInt(i2[1], 10) >= 2 ? L.Draw.Feature.include(L.Evented.prototype) : L.Draw.Feature.include(L.Mixin.Events);
  }, enable: function() {
    this._enabled || (L.Handler.prototype.enable.call(this), this.fire("enabled", { handler: this.type }), this._map.fire(L.Draw.Event.DRAWSTART, { layerType: this.type }));
  }, disable: function() {
    this._enabled && (L.Handler.prototype.disable.call(this), this._map.fire(L.Draw.Event.DRAWSTOP, { layerType: this.type }), this.fire("disabled", { handler: this.type }));
  }, addHooks: function() {
    var t2 = this._map;
    t2 && (L.DomUtil.disableTextSelection(), t2.getContainer().focus(), this._tooltip = new L.Draw.Tooltip(this._map), L.DomEvent.on(this._container, "keyup", this._cancelDrawing, this));
  }, removeHooks: function() {
    this._map && (L.DomUtil.enableTextSelection(), this._tooltip.dispose(), this._tooltip = null, L.DomEvent.off(this._container, "keyup", this._cancelDrawing, this));
  }, setOptions: function(t2) {
    L.setOptions(this, t2);
  }, _fireCreatedEvent: function(t2) {
    this._map.fire(L.Draw.Event.CREATED, { layer: t2, layerType: this.type });
  }, _cancelDrawing: function(t2) {
    27 === t2.keyCode && (this._map.fire("draw:canceled", { layerType: this.type }), this.disable());
  } }), L.Draw.Polyline = L.Draw.Feature.extend({ statics: { TYPE: "polyline" }, Poly: L.Polyline, options: { allowIntersection: true, repeatMode: false, drawError: { color: "#b00b00", timeout: 2500 }, icon: new L.DivIcon({ iconSize: new L.Point(8, 8), className: "leaflet-div-icon leaflet-editing-icon" }), touchIcon: new L.DivIcon({ iconSize: new L.Point(20, 20), className: "leaflet-div-icon leaflet-editing-icon leaflet-touch-icon" }), guidelineDistance: 20, maxGuideLineLength: 4e3, shapeOptions: { stroke: true, color: "#3388ff", weight: 4, opacity: 0.5, fill: false, clickable: true }, metric: true, feet: true, nautic: false, showLength: true, zIndexOffset: 2e3, factor: 1, maxPoints: 0 }, initialize: function(t2, e2) {
    L.Browser.touch && (this.options.icon = this.options.touchIcon), this.options.drawError.message = L.drawLocal.draw.handlers.polyline.error, e2 && e2.drawError && (e2.drawError = L.Util.extend({}, this.options.drawError, e2.drawError)), this.type = L.Draw.Polyline.TYPE, L.Draw.Feature.prototype.initialize.call(this, t2, e2);
  }, addHooks: function() {
    L.Draw.Feature.prototype.addHooks.call(this), this._map && (this._markers = [], this._markerGroup = new L.LayerGroup(), this._map.addLayer(this._markerGroup), this._poly = new L.Polyline([], this.options.shapeOptions), this._tooltip.updateContent(this._getTooltipText()), this._mouseMarker || (this._mouseMarker = L.marker(this._map.getCenter(), { icon: L.divIcon({ className: "leaflet-mouse-marker", iconAnchor: [20, 20], iconSize: [40, 40] }), opacity: 0, zIndexOffset: this.options.zIndexOffset })), this._mouseMarker.on("mouseout", this._onMouseOut, this).on("mousemove", this._onMouseMove, this).on("mousedown", this._onMouseDown, this).on("mouseup", this._onMouseUp, this).addTo(this._map), this._map.on("mouseup", this._onMouseUp, this).on("mousemove", this._onMouseMove, this).on("zoomlevelschange", this._onZoomEnd, this).on("touchstart", this._onTouch, this).on("zoomend", this._onZoomEnd, this));
  }, removeHooks: function() {
    L.Draw.Feature.prototype.removeHooks.call(this), this._clearHideErrorTimeout(), this._cleanUpShape(), this._map.removeLayer(this._markerGroup), delete this._markerGroup, delete this._markers, this._map.removeLayer(this._poly), delete this._poly, this._mouseMarker.off("mousedown", this._onMouseDown, this).off("mouseout", this._onMouseOut, this).off("mouseup", this._onMouseUp, this).off("mousemove", this._onMouseMove, this), this._map.removeLayer(this._mouseMarker), delete this._mouseMarker, this._clearGuides(), this._map.off("mouseup", this._onMouseUp, this).off("mousemove", this._onMouseMove, this).off("zoomlevelschange", this._onZoomEnd, this).off("zoomend", this._onZoomEnd, this).off("touchstart", this._onTouch, this).off("click", this._onTouch, this);
  }, deleteLastVertex: function() {
    if (!(this._markers.length <= 1)) {
      var t2 = this._markers.pop(), e2 = this._poly, i2 = e2.getLatLngs(), o2 = i2.splice(-1, 1)[0];
      this._poly.setLatLngs(i2), this._markerGroup.removeLayer(t2), e2.getLatLngs().length < 2 && this._map.removeLayer(e2), this._vertexChanged(o2, false);
    }
  }, addVertex: function(t2) {
    if (this._markers.length >= 2 && !this.options.allowIntersection && this._poly.newLatLngIntersects(t2)) return void this._showErrorTooltip();
    this._errorShown && this._hideErrorTooltip(), this._markers.push(this._createMarker(t2)), this._poly.addLatLng(t2), 2 === this._poly.getLatLngs().length && this._map.addLayer(this._poly), this._vertexChanged(t2, true);
  }, completeShape: function() {
    this._markers.length <= 1 || !this._shapeIsValid() || (this._fireCreatedEvent(), this.disable(), this.options.repeatMode && this.enable());
  }, _finishShape: function() {
    var t2 = this._poly._defaultShape ? this._poly._defaultShape() : this._poly.getLatLngs(), e2 = this._poly.newLatLngIntersects(t2[t2.length - 1]);
    if (!this.options.allowIntersection && e2 || !this._shapeIsValid()) return void this._showErrorTooltip();
    this._fireCreatedEvent(), this.disable(), this.options.repeatMode && this.enable();
  }, _shapeIsValid: function() {
    return true;
  }, _onZoomEnd: function() {
    null !== this._markers && this._updateGuide();
  }, _onMouseMove: function(t2) {
    var e2 = this._map.mouseEventToLayerPoint(t2.originalEvent), i2 = this._map.layerPointToLatLng(e2);
    this._currentLatLng = i2, this._updateTooltip(i2), this._updateGuide(e2), this._mouseMarker.setLatLng(i2), L.DomEvent.preventDefault(t2.originalEvent);
  }, _vertexChanged: function(t2, e2) {
    this._map.fire(L.Draw.Event.DRAWVERTEX, { layers: this._markerGroup }), this._updateFinishHandler(), this._updateRunningMeasure(t2, e2), this._clearGuides(), this._updateTooltip();
  }, _onMouseDown: function(t2) {
    if (!this._clickHandled && !this._touchHandled && !this._disableMarkers) {
      this._onMouseMove(t2), this._clickHandled = true, this._disableNewMarkers();
      var e2 = t2.originalEvent, i2 = e2.clientX, o2 = e2.clientY;
      this._startPoint.call(this, i2, o2);
    }
  }, _startPoint: function(t2, e2) {
    this._mouseDownOrigin = L.point(t2, e2);
  }, _onMouseUp: function(t2) {
    var e2 = t2.originalEvent, i2 = e2.clientX, o2 = e2.clientY;
    this._endPoint.call(this, i2, o2, t2), this._clickHandled = null;
  }, _endPoint: function(e2, i2, o2) {
    if (this._mouseDownOrigin) {
      var a = L.point(e2, i2).distanceTo(this._mouseDownOrigin), n = this._calculateFinishDistance(o2.latlng);
      this.options.maxPoints > 1 && this.options.maxPoints == this._markers.length + 1 ? (this.addVertex(o2.latlng), this._finishShape()) : n < 10 && L.Browser.touch ? this._finishShape() : Math.abs(a) < 9 * (t.devicePixelRatio || 1) && this.addVertex(o2.latlng), this._enableNewMarkers();
    }
    this._mouseDownOrigin = null;
  }, _onTouch: function(t2) {
    var e2, i2, o2 = t2.originalEvent;
    !o2.touches || !o2.touches[0] || this._clickHandled || this._touchHandled || this._disableMarkers || (e2 = o2.touches[0].clientX, i2 = o2.touches[0].clientY, this._disableNewMarkers(), this._touchHandled = true, this._startPoint.call(this, e2, i2), this._endPoint.call(this, e2, i2, t2), this._touchHandled = null), this._clickHandled = null;
  }, _onMouseOut: function() {
    this._tooltip && this._tooltip._onMouseOut.call(this._tooltip);
  }, _calculateFinishDistance: function(t2) {
    var e2;
    if (this._markers.length > 0) {
      var i2;
      if (this.type === L.Draw.Polyline.TYPE) i2 = this._markers[this._markers.length - 1];
      else {
        if (this.type !== L.Draw.Polygon.TYPE) return 1 / 0;
        i2 = this._markers[0];
      }
      var o2 = this._map.latLngToContainerPoint(i2.getLatLng()), a = new L.Marker(t2, { icon: this.options.icon, zIndexOffset: 2 * this.options.zIndexOffset }), n = this._map.latLngToContainerPoint(a.getLatLng());
      e2 = o2.distanceTo(n);
    } else e2 = 1 / 0;
    return e2;
  }, _updateFinishHandler: function() {
    var t2 = this._markers.length;
    t2 > 1 && this._markers[t2 - 1].on("click", this._finishShape, this), t2 > 2 && this._markers[t2 - 2].off("click", this._finishShape, this);
  }, _createMarker: function(t2) {
    var e2 = new L.Marker(t2, { icon: this.options.icon, zIndexOffset: 2 * this.options.zIndexOffset });
    return this._markerGroup.addLayer(e2), e2;
  }, _updateGuide: function(t2) {
    var e2 = this._markers ? this._markers.length : 0;
    e2 > 0 && (t2 = t2 || this._map.latLngToLayerPoint(this._currentLatLng), this._clearGuides(), this._drawGuide(this._map.latLngToLayerPoint(this._markers[e2 - 1].getLatLng()), t2));
  }, _updateTooltip: function(t2) {
    var e2 = this._getTooltipText();
    t2 && this._tooltip.updatePosition(t2), this._errorShown || this._tooltip.updateContent(e2);
  }, _drawGuide: function(t2, e2) {
    var i2, o2, a, n = Math.floor(Math.sqrt(Math.pow(e2.x - t2.x, 2) + Math.pow(e2.y - t2.y, 2))), s = this.options.guidelineDistance, r = this.options.maxGuideLineLength, l = n > r ? n - r : s;
    for (this._guidesContainer || (this._guidesContainer = L.DomUtil.create("div", "leaflet-draw-guides", this._overlayPane)); l < n; l += this.options.guidelineDistance) i2 = l / n, o2 = { x: Math.floor(t2.x * (1 - i2) + i2 * e2.x), y: Math.floor(t2.y * (1 - i2) + i2 * e2.y) }, a = L.DomUtil.create("div", "leaflet-draw-guide-dash", this._guidesContainer), a.style.backgroundColor = this._errorShown ? this.options.drawError.color : this.options.shapeOptions.color, L.DomUtil.setPosition(a, o2);
  }, _updateGuideColor: function(t2) {
    if (this._guidesContainer) for (var e2 = 0, i2 = this._guidesContainer.childNodes.length; e2 < i2; e2++) this._guidesContainer.childNodes[e2].style.backgroundColor = t2;
  }, _clearGuides: function() {
    if (this._guidesContainer) for (; this._guidesContainer.firstChild; ) this._guidesContainer.removeChild(this._guidesContainer.firstChild);
  }, _getTooltipText: function() {
    var t2, e2, i2 = this.options.showLength;
    return 0 === this._markers.length ? t2 = { text: L.drawLocal.draw.handlers.polyline.tooltip.start } : (e2 = i2 ? this._getMeasurementString() : "", t2 = 1 === this._markers.length ? { text: L.drawLocal.draw.handlers.polyline.tooltip.cont, subtext: e2 } : { text: L.drawLocal.draw.handlers.polyline.tooltip.end, subtext: e2 }), t2;
  }, _updateRunningMeasure: function(t2, e2) {
    var i2, o2, a = this._markers.length;
    1 === this._markers.length ? this._measurementRunningTotal = 0 : (i2 = a - (e2 ? 2 : 1), o2 = L.GeometryUtil.isVersion07x() ? t2.distanceTo(this._markers[i2].getLatLng()) * (this.options.factor || 1) : this._map.distance(t2, this._markers[i2].getLatLng()) * (this.options.factor || 1), this._measurementRunningTotal += o2 * (e2 ? 1 : -1));
  }, _getMeasurementString: function() {
    var t2, e2 = this._currentLatLng, i2 = this._markers[this._markers.length - 1].getLatLng();
    return t2 = L.GeometryUtil.isVersion07x() ? i2 && e2 && e2.distanceTo ? this._measurementRunningTotal + e2.distanceTo(i2) * (this.options.factor || 1) : this._measurementRunningTotal || 0 : i2 && e2 ? this._measurementRunningTotal + this._map.distance(e2, i2) * (this.options.factor || 1) : this._measurementRunningTotal || 0, L.GeometryUtil.readableDistance(t2, this.options.metric, this.options.feet, this.options.nautic, this.options.precision);
  }, _showErrorTooltip: function() {
    this._errorShown = true, this._tooltip.showAsError().updateContent({ text: this.options.drawError.message }), this._updateGuideColor(this.options.drawError.color), this._poly.setStyle({ color: this.options.drawError.color }), this._clearHideErrorTimeout(), this._hideErrorTimeout = setTimeout(L.Util.bind(this._hideErrorTooltip, this), this.options.drawError.timeout);
  }, _hideErrorTooltip: function() {
    this._errorShown = false, this._clearHideErrorTimeout(), this._tooltip.removeError().updateContent(this._getTooltipText()), this._updateGuideColor(this.options.shapeOptions.color), this._poly.setStyle({ color: this.options.shapeOptions.color });
  }, _clearHideErrorTimeout: function() {
    this._hideErrorTimeout && (clearTimeout(this._hideErrorTimeout), this._hideErrorTimeout = null);
  }, _disableNewMarkers: function() {
    this._disableMarkers = true;
  }, _enableNewMarkers: function() {
    setTimeout((function() {
      this._disableMarkers = false;
    }).bind(this), 50);
  }, _cleanUpShape: function() {
    this._markers.length > 1 && this._markers[this._markers.length - 1].off("click", this._finishShape, this);
  }, _fireCreatedEvent: function() {
    var t2 = new this.Poly(this._poly.getLatLngs(), this.options.shapeOptions);
    L.Draw.Feature.prototype._fireCreatedEvent.call(this, t2);
  } }), L.Draw.Polygon = L.Draw.Polyline.extend({ statics: { TYPE: "polygon" }, Poly: L.Polygon, options: { showArea: false, showLength: false, shapeOptions: { stroke: true, color: "#3388ff", weight: 4, opacity: 0.5, fill: true, fillColor: null, fillOpacity: 0.2, clickable: true }, metric: true, feet: true, nautic: false, precision: {} }, initialize: function(t2, e2) {
    L.Draw.Polyline.prototype.initialize.call(this, t2, e2), this.type = L.Draw.Polygon.TYPE;
  }, _updateFinishHandler: function() {
    var t2 = this._markers.length;
    1 === t2 && this._markers[0].on("click", this._finishShape, this), t2 > 2 && (this._markers[t2 - 1].on("dblclick", this._finishShape, this), t2 > 3 && this._markers[t2 - 2].off("dblclick", this._finishShape, this));
  }, _getTooltipText: function() {
    var t2, e2;
    return 0 === this._markers.length ? t2 = L.drawLocal.draw.handlers.polygon.tooltip.start : this._markers.length < 3 ? (t2 = L.drawLocal.draw.handlers.polygon.tooltip.cont, e2 = this._getMeasurementString()) : (t2 = L.drawLocal.draw.handlers.polygon.tooltip.end, e2 = this._getMeasurementString()), { text: t2, subtext: e2 };
  }, _getMeasurementString: function() {
    var t2 = this._area, e2 = "";
    return t2 || this.options.showLength ? (this.options.showLength && (e2 = L.Draw.Polyline.prototype._getMeasurementString.call(this)), t2 && (e2 += "<br>" + L.GeometryUtil.readableArea(t2, this.options.metric, this.options.precision)), e2) : null;
  }, _shapeIsValid: function() {
    return this._markers.length >= 3;
  }, _vertexChanged: function(t2, e2) {
    var i2;
    !this.options.allowIntersection && this.options.showArea && (i2 = this._poly.getLatLngs(), this._area = L.GeometryUtil.geodesicArea(i2)), L.Draw.Polyline.prototype._vertexChanged.call(this, t2, e2);
  }, _cleanUpShape: function() {
    var t2 = this._markers.length;
    t2 > 0 && (this._markers[0].off("click", this._finishShape, this), t2 > 2 && this._markers[t2 - 1].off("dblclick", this._finishShape, this));
  } }), L.SimpleShape = {}, L.Draw.SimpleShape = L.Draw.Feature.extend({ options: { repeatMode: false }, initialize: function(t2, e2) {
    this._endLabelText = L.drawLocal.draw.handlers.simpleshape.tooltip.end, L.Draw.Feature.prototype.initialize.call(this, t2, e2);
  }, addHooks: function() {
    L.Draw.Feature.prototype.addHooks.call(this), this._map && (this._mapDraggable = this._map.dragging.enabled(), this._mapDraggable && this._map.dragging.disable(), this._container.style.cursor = "crosshair", this._tooltip.updateContent({ text: this._initialLabelText }), this._map.on("mousedown", this._onMouseDown, this).on("mousemove", this._onMouseMove, this).on("touchstart", this._onMouseDown, this).on("touchmove", this._onMouseMove, this), e.addEventListener("touchstart", L.DomEvent.preventDefault, { passive: false }));
  }, removeHooks: function() {
    L.Draw.Feature.prototype.removeHooks.call(this), this._map && (this._mapDraggable && this._map.dragging.enable(), this._container.style.cursor = "", this._map.off("mousedown", this._onMouseDown, this).off("mousemove", this._onMouseMove, this).off("touchstart", this._onMouseDown, this).off("touchmove", this._onMouseMove, this), L.DomEvent.off(e, "mouseup", this._onMouseUp, this), L.DomEvent.off(e, "touchend", this._onMouseUp, this), e.removeEventListener("touchstart", L.DomEvent.preventDefault), this._shape && (this._map.removeLayer(this._shape), delete this._shape)), this._isDrawing = false;
  }, _getTooltipText: function() {
    return { text: this._endLabelText };
  }, _onMouseDown: function(t2) {
    this._isDrawing = true, this._startLatLng = t2.latlng, L.DomEvent.on(e, "mouseup", this._onMouseUp, this).on(e, "touchend", this._onMouseUp, this).preventDefault(t2.originalEvent);
  }, _onMouseMove: function(t2) {
    var e2 = t2.latlng;
    this._tooltip.updatePosition(e2), this._isDrawing && (this._tooltip.updateContent(this._getTooltipText()), this._drawShape(e2));
  }, _onMouseUp: function() {
    this._shape && this._fireCreatedEvent(), this.disable(), this.options.repeatMode && this.enable();
  } }), L.Draw.Rectangle = L.Draw.SimpleShape.extend({ statics: { TYPE: "rectangle" }, options: { shapeOptions: { stroke: true, color: "#3388ff", weight: 4, opacity: 0.5, fill: true, fillColor: null, fillOpacity: 0.2, clickable: true }, showArea: true, metric: true }, initialize: function(t2, e2) {
    this.type = L.Draw.Rectangle.TYPE, this._initialLabelText = L.drawLocal.draw.handlers.rectangle.tooltip.start, L.Draw.SimpleShape.prototype.initialize.call(this, t2, e2);
  }, disable: function() {
    this._enabled && (this._isCurrentlyTwoClickDrawing = false, L.Draw.SimpleShape.prototype.disable.call(this));
  }, _onMouseUp: function(t2) {
    if (!this._shape && !this._isCurrentlyTwoClickDrawing) return void (this._isCurrentlyTwoClickDrawing = true);
    this._isCurrentlyTwoClickDrawing && !o(t2.target, "leaflet-pane") || L.Draw.SimpleShape.prototype._onMouseUp.call(this);
  }, _drawShape: function(t2) {
    this._shape ? this._shape.setBounds(new L.LatLngBounds(this._startLatLng, t2)) : (this._shape = new L.Rectangle(new L.LatLngBounds(this._startLatLng, t2), this.options.shapeOptions), this._map.addLayer(this._shape));
  }, _fireCreatedEvent: function() {
    var t2 = new L.Rectangle(this._shape.getBounds(), this.options.shapeOptions);
    L.Draw.SimpleShape.prototype._fireCreatedEvent.call(this, t2);
  }, _getTooltipText: function() {
    var t2, e2, i2, o2 = L.Draw.SimpleShape.prototype._getTooltipText.call(this), a = this._shape, n = this.options.showArea;
    return a && (t2 = this._shape._defaultShape ? this._shape._defaultShape() : this._shape.getLatLngs(), e2 = L.GeometryUtil.geodesicArea(t2), i2 = n ? L.GeometryUtil.readableArea(e2, this.options.metric) : ""), { text: o2.text, subtext: i2 };
  } }), L.Draw.Marker = L.Draw.Feature.extend({ statics: { TYPE: "marker" }, options: { icon: new L.Icon.Default(), repeatMode: false, zIndexOffset: 2e3 }, initialize: function(t2, e2) {
    this.type = L.Draw.Marker.TYPE, this._initialLabelText = L.drawLocal.draw.handlers.marker.tooltip.start, L.Draw.Feature.prototype.initialize.call(this, t2, e2);
  }, addHooks: function() {
    L.Draw.Feature.prototype.addHooks.call(this), this._map && (this._tooltip.updateContent({ text: this._initialLabelText }), this._mouseMarker || (this._mouseMarker = L.marker(this._map.getCenter(), { icon: L.divIcon({ className: "leaflet-mouse-marker", iconAnchor: [20, 20], iconSize: [40, 40] }), opacity: 0, zIndexOffset: this.options.zIndexOffset })), this._mouseMarker.on("click", this._onClick, this).addTo(this._map), this._map.on("mousemove", this._onMouseMove, this), this._map.on("click", this._onTouch, this));
  }, removeHooks: function() {
    L.Draw.Feature.prototype.removeHooks.call(this), this._map && (this._map.off("click", this._onClick, this).off("click", this._onTouch, this), this._marker && (this._marker.off("click", this._onClick, this), this._map.removeLayer(this._marker), delete this._marker), this._mouseMarker.off("click", this._onClick, this), this._map.removeLayer(this._mouseMarker), delete this._mouseMarker, this._map.off("mousemove", this._onMouseMove, this));
  }, _onMouseMove: function(t2) {
    var e2 = t2.latlng;
    this._tooltip.updatePosition(e2), this._mouseMarker.setLatLng(e2), this._marker ? (e2 = this._mouseMarker.getLatLng(), this._marker.setLatLng(e2)) : (this._marker = this._createMarker(e2), this._marker.on("click", this._onClick, this), this._map.on("click", this._onClick, this).addLayer(this._marker));
  }, _createMarker: function(t2) {
    return new L.Marker(t2, { icon: this.options.icon, zIndexOffset: this.options.zIndexOffset });
  }, _onClick: function() {
    this._fireCreatedEvent(), this.disable(), this.options.repeatMode && this.enable();
  }, _onTouch: function(t2) {
    this._onMouseMove(t2), this._onClick();
  }, _fireCreatedEvent: function() {
    var t2 = new L.Marker.Touch(this._marker.getLatLng(), { icon: this.options.icon });
    L.Draw.Feature.prototype._fireCreatedEvent.call(this, t2);
  } }), L.Draw.CircleMarker = L.Draw.Marker.extend({ statics: { TYPE: "circlemarker" }, options: { stroke: true, color: "#3388ff", weight: 4, opacity: 0.5, fill: true, fillColor: null, fillOpacity: 0.2, clickable: true, zIndexOffset: 2e3 }, initialize: function(t2, e2) {
    this.type = L.Draw.CircleMarker.TYPE, this._initialLabelText = L.drawLocal.draw.handlers.circlemarker.tooltip.start, L.Draw.Feature.prototype.initialize.call(this, t2, e2);
  }, _fireCreatedEvent: function() {
    var t2 = new L.CircleMarker(this._marker.getLatLng(), this.options);
    L.Draw.Feature.prototype._fireCreatedEvent.call(this, t2);
  }, _createMarker: function(t2) {
    return new L.CircleMarker(t2, this.options);
  } }), L.Draw.Circle = L.Draw.SimpleShape.extend({ statics: { TYPE: "circle" }, options: { shapeOptions: { stroke: true, color: "#3388ff", weight: 4, opacity: 0.5, fill: true, fillColor: null, fillOpacity: 0.2, clickable: true }, showRadius: true, metric: true, feet: true, nautic: false }, initialize: function(t2, e2) {
    this.type = L.Draw.Circle.TYPE, this._initialLabelText = L.drawLocal.draw.handlers.circle.tooltip.start, L.Draw.SimpleShape.prototype.initialize.call(this, t2, e2);
  }, _drawShape: function(t2) {
    if (L.GeometryUtil.isVersion07x()) var e2 = this._startLatLng.distanceTo(t2);
    else var e2 = this._map.distance(this._startLatLng, t2);
    this._shape ? this._shape.setRadius(e2) : (this._shape = new L.Circle(this._startLatLng, e2, this.options.shapeOptions), this._map.addLayer(this._shape));
  }, _fireCreatedEvent: function() {
    var t2 = new L.Circle(this._startLatLng, this._shape.getRadius(), this.options.shapeOptions);
    L.Draw.SimpleShape.prototype._fireCreatedEvent.call(this, t2);
  }, _onMouseMove: function(t2) {
    var e2, i2 = t2.latlng, o2 = this.options.showRadius, a = this.options.metric;
    if (this._tooltip.updatePosition(i2), this._isDrawing) {
      this._drawShape(i2), e2 = this._shape.getRadius().toFixed(1);
      var n = "";
      o2 && (n = L.drawLocal.draw.handlers.circle.radius + ": " + L.GeometryUtil.readableDistance(e2, a, this.options.feet, this.options.nautic)), this._tooltip.updateContent({ text: this._endLabelText, subtext: n });
    }
  } }), L.Edit = L.Edit || {}, L.Edit.Marker = L.Handler.extend({ initialize: function(t2, e2) {
    this._marker = t2, L.setOptions(this, e2);
  }, addHooks: function() {
    var t2 = this._marker;
    t2.dragging.enable(), t2.on("dragend", this._onDragEnd, t2), this._toggleMarkerHighlight();
  }, removeHooks: function() {
    var t2 = this._marker;
    t2.dragging.disable(), t2.off("dragend", this._onDragEnd, t2), this._toggleMarkerHighlight();
  }, _onDragEnd: function(t2) {
    var e2 = t2.target;
    e2.edited = true, this._map.fire(L.Draw.Event.EDITMOVE, { layer: e2 });
  }, _toggleMarkerHighlight: function() {
    var t2 = this._marker._icon;
    t2 && (t2.style.display = "none", L.DomUtil.hasClass(t2, "leaflet-edit-marker-selected") ? (L.DomUtil.removeClass(t2, "leaflet-edit-marker-selected"), this._offsetMarker(t2, -4)) : (L.DomUtil.addClass(t2, "leaflet-edit-marker-selected"), this._offsetMarker(t2, 4)), t2.style.display = "");
  }, _offsetMarker: function(t2, e2) {
    var i2 = parseInt(t2.style.marginTop, 10) - e2, o2 = parseInt(t2.style.marginLeft, 10) - e2;
    t2.style.marginTop = i2 + "px", t2.style.marginLeft = o2 + "px";
  } }), L.Marker.addInitHook(function() {
    L.Edit.Marker && (this.editing = new L.Edit.Marker(this), this.options.editable && this.editing.enable());
  }), L.Edit = L.Edit || {}, L.Edit.Poly = L.Handler.extend({ initialize: function(t2) {
    this.latlngs = [t2._latlngs], t2._holes && (this.latlngs = this.latlngs.concat(t2._holes)), this._poly = t2, this._poly.on("revert-edited", this._updateLatLngs, this);
  }, _defaultShape: function() {
    return L.Polyline._flat ? L.Polyline._flat(this._poly._latlngs) ? this._poly._latlngs : this._poly._latlngs[0] : this._poly._latlngs;
  }, _eachVertexHandler: function(t2) {
    for (var e2 = 0; e2 < this._verticesHandlers.length; e2++) t2(this._verticesHandlers[e2]);
  }, addHooks: function() {
    this._initHandlers(), this._eachVertexHandler(function(t2) {
      t2.addHooks();
    });
  }, removeHooks: function() {
    this._eachVertexHandler(function(t2) {
      t2.removeHooks();
    });
  }, updateMarkers: function() {
    this._eachVertexHandler(function(t2) {
      t2.updateMarkers();
    });
  }, _initHandlers: function() {
    this._verticesHandlers = [];
    for (var t2 = 0; t2 < this.latlngs.length; t2++) this._verticesHandlers.push(new L.Edit.PolyVerticesEdit(this._poly, this.latlngs[t2], this._poly.options.poly));
  }, _updateLatLngs: function(t2) {
    this.latlngs = [t2.layer._latlngs], t2.layer._holes && (this.latlngs = this.latlngs.concat(t2.layer._holes));
  } }), L.Edit.PolyVerticesEdit = L.Handler.extend({ options: { icon: new L.DivIcon({ iconSize: new L.Point(8, 8), className: "leaflet-div-icon leaflet-editing-icon" }), touchIcon: new L.DivIcon({ iconSize: new L.Point(20, 20), className: "leaflet-div-icon leaflet-editing-icon leaflet-touch-icon" }), drawError: { color: "#b00b00", timeout: 1e3 } }, initialize: function(t2, e2, i2) {
    L.Browser.touch && (this.options.icon = this.options.touchIcon), this._poly = t2, i2 && i2.drawError && (i2.drawError = L.Util.extend({}, this.options.drawError, i2.drawError)), this._latlngs = e2, L.setOptions(this, i2);
  }, _defaultShape: function() {
    return L.Polyline._flat ? L.Polyline._flat(this._latlngs) ? this._latlngs : this._latlngs[0] : this._latlngs;
  }, addHooks: function() {
    var t2 = this._poly, e2 = t2._path;
    t2 instanceof L.Polygon || (t2.options.fill = false, t2.options.editing && (t2.options.editing.fill = false)), e2 && t2.options.editing && t2.options.editing.className && (t2.options.original.className && t2.options.original.className.split(" ").forEach(function(t3) {
      L.DomUtil.removeClass(e2, t3);
    }), t2.options.editing.className.split(" ").forEach(function(t3) {
      L.DomUtil.addClass(e2, t3);
    })), t2.setStyle(t2.options.editing), this._poly._map && (this._map = this._poly._map, this._markerGroup || this._initMarkers(), this._poly._map.addLayer(this._markerGroup));
  }, removeHooks: function() {
    var t2 = this._poly, e2 = t2._path;
    e2 && t2.options.editing && t2.options.editing.className && (t2.options.editing.className.split(" ").forEach(function(t3) {
      L.DomUtil.removeClass(e2, t3);
    }), t2.options.original.className && t2.options.original.className.split(" ").forEach(function(t3) {
      L.DomUtil.addClass(e2, t3);
    })), t2.setStyle(t2.options.original), t2._map && (t2._map.removeLayer(this._markerGroup), delete this._markerGroup, delete this._markers);
  }, updateMarkers: function() {
    this._markerGroup.clearLayers(), this._initMarkers();
  }, _initMarkers: function() {
    this._markerGroup || (this._markerGroup = new L.LayerGroup()), this._markers = [];
    var t2, e2, i2, o2, a = this._defaultShape();
    for (t2 = 0, i2 = a.length; t2 < i2; t2++) o2 = this._createMarker(a[t2], t2), o2.on("click", this._onMarkerClick, this), o2.on("contextmenu", this._onContextMenu, this), this._markers.push(o2);
    var n, s;
    for (t2 = 0, e2 = i2 - 1; t2 < i2; e2 = t2++) (0 !== t2 || L.Polygon && this._poly instanceof L.Polygon) && (n = this._markers[e2], s = this._markers[t2], this._createMiddleMarker(n, s), this._updatePrevNext(n, s));
  }, _createMarker: function(t2, e2) {
    var i2 = new L.Marker.Touch(t2, { draggable: true, icon: this.options.icon });
    return i2._origLatLng = t2, i2._index = e2, i2.on("dragstart", this._onMarkerDragStart, this).on("drag", this._onMarkerDrag, this).on("dragend", this._fireEdit, this).on("touchmove", this._onTouchMove, this).on("touchend", this._fireEdit, this).on("MSPointerMove", this._onTouchMove, this).on("MSPointerUp", this._fireEdit, this), this._markerGroup.addLayer(i2), i2;
  }, _onMarkerDragStart: function() {
    this._poly.fire("editstart");
  }, _spliceLatLngs: function() {
    var t2 = this._defaultShape(), e2 = [].splice.apply(t2, arguments);
    return this._poly._convertLatLngs(t2, true), this._poly.redraw(), e2;
  }, _removeMarker: function(t2) {
    var e2 = t2._index;
    this._markerGroup.removeLayer(t2), this._markers.splice(e2, 1), this._spliceLatLngs(e2, 1), this._updateIndexes(e2, -1), t2.off("dragstart", this._onMarkerDragStart, this).off("drag", this._onMarkerDrag, this).off("dragend", this._fireEdit, this).off("touchmove", this._onMarkerDrag, this).off("touchend", this._fireEdit, this).off("click", this._onMarkerClick, this).off("MSPointerMove", this._onTouchMove, this).off("MSPointerUp", this._fireEdit, this);
  }, _fireEdit: function() {
    this._poly.edited = true, this._poly.fire("edit"), this._poly._map.fire(L.Draw.Event.EDITVERTEX, { layers: this._markerGroup, poly: this._poly });
  }, _onMarkerDrag: function(t2) {
    var e2 = t2.target, i2 = this._poly, o2 = L.LatLngUtil.cloneLatLng(e2._origLatLng);
    if (L.extend(e2._origLatLng, e2._latlng), i2.options.poly) {
      var a = i2._map._editTooltip;
      if (!i2.options.poly.allowIntersection && i2.intersects()) {
        L.extend(e2._origLatLng, o2), e2.setLatLng(o2);
        var n = i2.options.color;
        i2.setStyle({ color: this.options.drawError.color }), a && a.updateContent({ text: L.drawLocal.draw.handlers.polyline.error }), setTimeout(function() {
          i2.setStyle({ color: n }), a && a.updateContent({ text: L.drawLocal.edit.handlers.edit.tooltip.text, subtext: L.drawLocal.edit.handlers.edit.tooltip.subtext });
        }, 1e3);
      }
    }
    e2._middleLeft && e2._middleLeft.setLatLng(this._getMiddleLatLng(e2._prev, e2)), e2._middleRight && e2._middleRight.setLatLng(this._getMiddleLatLng(e2, e2._next)), this._poly._bounds._southWest = L.latLng(1 / 0, 1 / 0), this._poly._bounds._northEast = L.latLng(-1 / 0, -1 / 0);
    var s = this._poly.getLatLngs();
    this._poly._convertLatLngs(s, true), this._poly.redraw(), this._poly.fire("editdrag");
  }, _onMarkerClick: function(t2) {
    var e2 = L.Polygon && this._poly instanceof L.Polygon ? 4 : 3, i2 = t2.target;
    this._defaultShape().length < e2 || (this._removeMarker(i2), this._updatePrevNext(i2._prev, i2._next), i2._middleLeft && this._markerGroup.removeLayer(i2._middleLeft), i2._middleRight && this._markerGroup.removeLayer(i2._middleRight), i2._prev && i2._next ? this._createMiddleMarker(i2._prev, i2._next) : i2._prev ? i2._next || (i2._prev._middleRight = null) : i2._next._middleLeft = null, this._fireEdit());
  }, _onContextMenu: function(t2) {
    var e2 = t2.target;
    this._poly;
    this._poly._map.fire(L.Draw.Event.MARKERCONTEXT, { marker: e2, layers: this._markerGroup, poly: this._poly }), L.DomEvent.stopPropagation;
  }, _onTouchMove: function(t2) {
    var e2 = this._map.mouseEventToLayerPoint(t2.originalEvent.touches[0]), i2 = this._map.layerPointToLatLng(e2), o2 = t2.target;
    L.extend(o2._origLatLng, i2), o2._middleLeft && o2._middleLeft.setLatLng(this._getMiddleLatLng(o2._prev, o2)), o2._middleRight && o2._middleRight.setLatLng(this._getMiddleLatLng(o2, o2._next)), this._poly.redraw(), this.updateMarkers();
  }, _updateIndexes: function(t2, e2) {
    this._markerGroup.eachLayer(function(i2) {
      i2._index > t2 && (i2._index += e2);
    });
  }, _createMiddleMarker: function(t2, e2) {
    var i2, o2, a, n = this._getMiddleLatLng(t2, e2), s = this._createMarker(n);
    s.setOpacity(0.6), t2._middleRight = e2._middleLeft = s, o2 = function() {
      s.off("touchmove", o2, this);
      var a2 = e2._index;
      s._index = a2, s.off("click", i2, this).on("click", this._onMarkerClick, this), n.lat = s.getLatLng().lat, n.lng = s.getLatLng().lng, this._spliceLatLngs(a2, 0, n), this._markers.splice(a2, 0, s), s.setOpacity(1), this._updateIndexes(a2, 1), e2._index++, this._updatePrevNext(t2, s), this._updatePrevNext(s, e2), this._poly.fire("editstart");
    }, a = function() {
      s.off("dragstart", o2, this), s.off("dragend", a, this), s.off("touchmove", o2, this), this._createMiddleMarker(t2, s), this._createMiddleMarker(s, e2);
    }, i2 = function() {
      o2.call(this), a.call(this), this._fireEdit();
    }, s.on("click", i2, this).on("dragstart", o2, this).on("dragend", a, this).on("touchmove", o2, this), this._markerGroup.addLayer(s);
  }, _updatePrevNext: function(t2, e2) {
    t2 && (t2._next = e2), e2 && (e2._prev = t2);
  }, _getMiddleLatLng: function(t2, e2) {
    var i2 = this._poly._map, o2 = i2.project(t2.getLatLng()), a = i2.project(e2.getLatLng());
    return i2.unproject(o2._add(a)._divideBy(2));
  } }), L.Polyline.addInitHook(function() {
    this.editing || (L.Edit.Poly && (this.editing = new L.Edit.Poly(this), this.options.editable && this.editing.enable()), this.on("add", function() {
      this.editing && this.editing.enabled() && this.editing.addHooks();
    }), this.on("remove", function() {
      this.editing && this.editing.enabled() && this.editing.removeHooks();
    }));
  }), L.Edit = L.Edit || {}, L.Edit.SimpleShape = L.Handler.extend({ options: { moveIcon: new L.DivIcon({ iconSize: new L.Point(8, 8), className: "leaflet-div-icon leaflet-editing-icon leaflet-edit-move" }), resizeIcon: new L.DivIcon({
    iconSize: new L.Point(8, 8),
    className: "leaflet-div-icon leaflet-editing-icon leaflet-edit-resize"
  }), touchMoveIcon: new L.DivIcon({ iconSize: new L.Point(20, 20), className: "leaflet-div-icon leaflet-editing-icon leaflet-edit-move leaflet-touch-icon" }), touchResizeIcon: new L.DivIcon({ iconSize: new L.Point(20, 20), className: "leaflet-div-icon leaflet-editing-icon leaflet-edit-resize leaflet-touch-icon" }) }, initialize: function(t2, e2) {
    L.Browser.touch && (this.options.moveIcon = this.options.touchMoveIcon, this.options.resizeIcon = this.options.touchResizeIcon), this._shape = t2, L.Util.setOptions(this, e2);
  }, addHooks: function() {
    var t2 = this._shape;
    this._shape._map && (this._map = this._shape._map, t2.setStyle(t2.options.editing), t2._map && (this._map = t2._map, this._markerGroup || this._initMarkers(), this._map.addLayer(this._markerGroup)));
  }, removeHooks: function() {
    var t2 = this._shape;
    if (t2.setStyle(t2.options.original), t2._map) {
      this._unbindMarker(this._moveMarker);
      for (var e2 = 0, i2 = this._resizeMarkers.length; e2 < i2; e2++) this._unbindMarker(this._resizeMarkers[e2]);
      this._resizeMarkers = null, this._map.removeLayer(this._markerGroup), delete this._markerGroup;
    }
    this._map = null;
  }, updateMarkers: function() {
    this._markerGroup.clearLayers(), this._initMarkers();
  }, _initMarkers: function() {
    this._markerGroup || (this._markerGroup = new L.LayerGroup()), this._createMoveMarker(), this._createResizeMarker();
  }, _createMoveMarker: function() {
  }, _createResizeMarker: function() {
  }, _createMarker: function(t2, e2) {
    var i2 = new L.Marker.Touch(t2, { draggable: true, icon: e2, zIndexOffset: 10 });
    return this._bindMarker(i2), this._markerGroup.addLayer(i2), i2;
  }, _bindMarker: function(t2) {
    t2.on("dragstart", this._onMarkerDragStart, this).on("drag", this._onMarkerDrag, this).on("dragend", this._onMarkerDragEnd, this).on("touchstart", this._onTouchStart, this).on("touchmove", this._onTouchMove, this).on("MSPointerMove", this._onTouchMove, this).on("touchend", this._onTouchEnd, this).on("MSPointerUp", this._onTouchEnd, this);
  }, _unbindMarker: function(t2) {
    t2.off("dragstart", this._onMarkerDragStart, this).off("drag", this._onMarkerDrag, this).off("dragend", this._onMarkerDragEnd, this).off("touchstart", this._onTouchStart, this).off("touchmove", this._onTouchMove, this).off("MSPointerMove", this._onTouchMove, this).off("touchend", this._onTouchEnd, this).off("MSPointerUp", this._onTouchEnd, this);
  }, _onMarkerDragStart: function(t2) {
    t2.target.setOpacity(0), this._shape.fire("editstart");
  }, _fireEdit: function() {
    this._shape.edited = true, this._shape.fire("edit");
  }, _onMarkerDrag: function(t2) {
    var e2 = t2.target, i2 = e2.getLatLng();
    e2 === this._moveMarker ? this._move(i2) : this._resize(i2), this._shape.redraw(), this._shape.fire("editdrag");
  }, _onMarkerDragEnd: function(t2) {
    t2.target.setOpacity(1), this._fireEdit();
  }, _onTouchStart: function(t2) {
    if (L.Edit.SimpleShape.prototype._onMarkerDragStart.call(this, t2), "function" == typeof this._getCorners) {
      var e2 = this._getCorners(), i2 = t2.target, o2 = i2._cornerIndex;
      i2.setOpacity(0), this._oppositeCorner = e2[(o2 + 2) % 4], this._toggleCornerMarkers(0, o2);
    }
    this._shape.fire("editstart");
  }, _onTouchMove: function(t2) {
    var e2 = this._map.mouseEventToLayerPoint(t2.originalEvent.touches[0]), i2 = this._map.layerPointToLatLng(e2);
    return t2.target === this._moveMarker ? this._move(i2) : this._resize(i2), this._shape.redraw(), false;
  }, _onTouchEnd: function(t2) {
    t2.target.setOpacity(1), this.updateMarkers(), this._fireEdit();
  }, _move: function() {
  }, _resize: function() {
  } }), L.Edit = L.Edit || {}, L.Edit.Rectangle = L.Edit.SimpleShape.extend({ _createMoveMarker: function() {
    var t2 = this._shape.getBounds(), e2 = t2.getCenter();
    this._moveMarker = this._createMarker(e2, this.options.moveIcon);
  }, _createResizeMarker: function() {
    var t2 = this._getCorners();
    this._resizeMarkers = [];
    for (var e2 = 0, i2 = t2.length; e2 < i2; e2++) this._resizeMarkers.push(this._createMarker(t2[e2], this.options.resizeIcon)), this._resizeMarkers[e2]._cornerIndex = e2;
  }, _onMarkerDragStart: function(t2) {
    L.Edit.SimpleShape.prototype._onMarkerDragStart.call(this, t2);
    var e2 = this._getCorners(), i2 = t2.target, o2 = i2._cornerIndex;
    this._oppositeCorner = e2[(o2 + 2) % 4], this._toggleCornerMarkers(0, o2);
  }, _onMarkerDragEnd: function(t2) {
    var e2, i2, o2 = t2.target;
    o2 === this._moveMarker && (e2 = this._shape.getBounds(), i2 = e2.getCenter(), o2.setLatLng(i2)), this._toggleCornerMarkers(1), this._repositionCornerMarkers(), L.Edit.SimpleShape.prototype._onMarkerDragEnd.call(this, t2);
  }, _move: function(t2) {
    for (var e2, i2 = this._shape._defaultShape ? this._shape._defaultShape() : this._shape.getLatLngs(), o2 = this._shape.getBounds(), a = o2.getCenter(), n = [], s = 0, r = i2.length; s < r; s++) e2 = [i2[s].lat - a.lat, i2[s].lng - a.lng], n.push([t2.lat + e2[0], t2.lng + e2[1]]);
    this._shape.setLatLngs(n), this._repositionCornerMarkers(), this._map.fire(L.Draw.Event.EDITMOVE, { layer: this._shape });
  }, _resize: function(t2) {
    var e2;
    this._shape.setBounds(L.latLngBounds(t2, this._oppositeCorner)), e2 = this._shape.getBounds(), this._moveMarker.setLatLng(e2.getCenter()), this._map.fire(L.Draw.Event.EDITRESIZE, { layer: this._shape });
  }, _getCorners: function() {
    var t2 = this._shape.getBounds();
    return [t2.getNorthWest(), t2.getNorthEast(), t2.getSouthEast(), t2.getSouthWest()];
  }, _toggleCornerMarkers: function(t2) {
    for (var e2 = 0, i2 = this._resizeMarkers.length; e2 < i2; e2++) this._resizeMarkers[e2].setOpacity(t2);
  }, _repositionCornerMarkers: function() {
    for (var t2 = this._getCorners(), e2 = 0, i2 = this._resizeMarkers.length; e2 < i2; e2++) this._resizeMarkers[e2].setLatLng(t2[e2]);
  } }), L.Rectangle.addInitHook(function() {
    L.Edit.Rectangle && (this.editing = new L.Edit.Rectangle(this), this.options.editable && this.editing.enable());
  }), L.Edit = L.Edit || {}, L.Edit.CircleMarker = L.Edit.SimpleShape.extend({ _createMoveMarker: function() {
    var t2 = this._shape.getLatLng();
    this._moveMarker = this._createMarker(t2, this.options.moveIcon);
  }, _createResizeMarker: function() {
    this._resizeMarkers = [];
  }, _move: function(t2) {
    if (this._resizeMarkers.length) {
      var e2 = this._getResizeMarkerPoint(t2);
      this._resizeMarkers[0].setLatLng(e2);
    }
    this._shape.setLatLng(t2), this._map.fire(L.Draw.Event.EDITMOVE, { layer: this._shape });
  } }), L.CircleMarker.addInitHook(function() {
    L.Edit.CircleMarker && (this.editing = new L.Edit.CircleMarker(this), this.options.editable && this.editing.enable()), this.on("add", function() {
      this.editing && this.editing.enabled() && this.editing.addHooks();
    }), this.on("remove", function() {
      this.editing && this.editing.enabled() && this.editing.removeHooks();
    });
  }), L.Edit = L.Edit || {}, L.Edit.Circle = L.Edit.CircleMarker.extend({ _createResizeMarker: function() {
    var t2 = this._shape.getLatLng(), e2 = this._getResizeMarkerPoint(t2);
    this._resizeMarkers = [], this._resizeMarkers.push(this._createMarker(e2, this.options.resizeIcon));
  }, _getResizeMarkerPoint: function(t2) {
    var e2 = this._shape._radius * Math.cos(Math.PI / 4), i2 = this._map.project(t2);
    return this._map.unproject([i2.x + e2, i2.y - e2]);
  }, _resize: function(t2) {
    var e2 = this._moveMarker.getLatLng();
    L.GeometryUtil.isVersion07x() ? radius = e2.distanceTo(t2) : radius = this._map.distance(e2, t2), this._shape.setRadius(radius), this._map.editTooltip && this._map._editTooltip.updateContent({ text: L.drawLocal.edit.handlers.edit.tooltip.subtext + "<br />" + L.drawLocal.edit.handlers.edit.tooltip.text, subtext: L.drawLocal.draw.handlers.circle.radius + ": " + L.GeometryUtil.readableDistance(radius, true, this.options.feet, this.options.nautic) }), this._shape.setRadius(radius), this._map.fire(L.Draw.Event.EDITRESIZE, { layer: this._shape });
  } }), L.Circle.addInitHook(function() {
    L.Edit.Circle && (this.editing = new L.Edit.Circle(this), this.options.editable && this.editing.enable());
  }), L.Map.mergeOptions({ touchExtend: true }), L.Map.TouchExtend = L.Handler.extend({ initialize: function(t2) {
    this._map = t2, this._container = t2._container, this._pane = t2._panes.overlayPane;
  }, addHooks: function() {
    L.DomEvent.on(this._container, "touchstart", this._onTouchStart, this), L.DomEvent.on(this._container, "touchend", this._onTouchEnd, this), L.DomEvent.on(this._container, "touchmove", this._onTouchMove, this), this._detectIE() ? (L.DomEvent.on(this._container, "MSPointerDown", this._onTouchStart, this), L.DomEvent.on(this._container, "MSPointerUp", this._onTouchEnd, this), L.DomEvent.on(this._container, "MSPointerMove", this._onTouchMove, this), L.DomEvent.on(this._container, "MSPointerCancel", this._onTouchCancel, this)) : (L.DomEvent.on(this._container, "touchcancel", this._onTouchCancel, this), L.DomEvent.on(this._container, "touchleave", this._onTouchLeave, this));
  }, removeHooks: function() {
    L.DomEvent.off(this._container, "touchstart", this._onTouchStart, this), L.DomEvent.off(this._container, "touchend", this._onTouchEnd, this), L.DomEvent.off(this._container, "touchmove", this._onTouchMove, this), this._detectIE() ? (L.DomEvent.off(this._container, "MSPointerDown", this._onTouchStart, this), L.DomEvent.off(this._container, "MSPointerUp", this._onTouchEnd, this), L.DomEvent.off(this._container, "MSPointerMove", this._onTouchMove, this), L.DomEvent.off(this._container, "MSPointerCancel", this._onTouchCancel, this)) : (L.DomEvent.off(this._container, "touchcancel", this._onTouchCancel, this), L.DomEvent.off(this._container, "touchleave", this._onTouchLeave, this));
  }, _touchEvent: function(t2, e2) {
    var i2 = {};
    if (void 0 !== t2.touches) {
      if (!t2.touches.length) return;
      i2 = t2.touches[0];
    } else {
      if ("touch" !== t2.pointerType) return;
      if (i2 = t2, !this._filterClick(t2)) return;
    }
    var o2 = this._map.mouseEventToContainerPoint(i2), a = this._map.mouseEventToLayerPoint(i2), n = this._map.layerPointToLatLng(a);
    this._map.fire(e2, { latlng: n, layerPoint: a, containerPoint: o2, pageX: i2.pageX, pageY: i2.pageY, originalEvent: t2 });
  }, _filterClick: function(t2) {
    var e2 = t2.timeStamp || t2.originalEvent.timeStamp, i2 = L.DomEvent._lastClick && e2 - L.DomEvent._lastClick;
    return i2 && i2 > 100 && i2 < 500 || t2.target._simulatedClick && !t2._simulated ? (L.DomEvent.stop(t2), false) : (L.DomEvent._lastClick = e2, true);
  }, _onTouchStart: function(t2) {
    if (this._map._loaded) {
      this._touchEvent(t2, "touchstart");
    }
  }, _onTouchEnd: function(t2) {
    if (this._map._loaded) {
      this._touchEvent(t2, "touchend");
    }
  }, _onTouchCancel: function(t2) {
    if (this._map._loaded) {
      var e2 = "touchcancel";
      this._detectIE() && (e2 = "pointercancel"), this._touchEvent(t2, e2);
    }
  }, _onTouchLeave: function(t2) {
    if (this._map._loaded) {
      this._touchEvent(t2, "touchleave");
    }
  }, _onTouchMove: function(t2) {
    if (this._map._loaded) {
      this._touchEvent(t2, "touchmove");
    }
  }, _detectIE: function() {
    var e2 = t.navigator.userAgent, i2 = e2.indexOf("MSIE ");
    if (i2 > 0) return parseInt(e2.substring(i2 + 5, e2.indexOf(".", i2)), 10);
    if (e2.indexOf("Trident/") > 0) {
      var o2 = e2.indexOf("rv:");
      return parseInt(e2.substring(o2 + 3, e2.indexOf(".", o2)), 10);
    }
    var a = e2.indexOf("Edge/");
    return a > 0 && parseInt(e2.substring(a + 5, e2.indexOf(".", a)), 10);
  } }), L.Map.addInitHook("addHandler", "touchExtend", L.Map.TouchExtend), L.Marker.Touch = L.Marker.extend({ _initInteraction: function() {
    return this.addInteractiveTarget ? L.Marker.prototype._initInteraction.apply(this) : this._initInteractionLegacy();
  }, _initInteractionLegacy: function() {
    if (this.options.clickable) {
      var t2 = this._icon, e2 = ["dblclick", "mousedown", "mouseover", "mouseout", "contextmenu", "touchstart", "touchend", "touchmove"];
      this._detectIE ? e2.concat(["MSPointerDown", "MSPointerUp", "MSPointerMove", "MSPointerCancel"]) : e2.concat(["touchcancel"]), L.DomUtil.addClass(t2, "leaflet-clickable"), L.DomEvent.on(t2, "click", this._onMouseClick, this), L.DomEvent.on(t2, "keypress", this._onKeyPress, this);
      for (var i2 = 0; i2 < e2.length; i2++) L.DomEvent.on(t2, e2[i2], this._fireMouseEvent, this);
      L.Handler.MarkerDrag && (this.dragging = new L.Handler.MarkerDrag(this), this.options.draggable && this.dragging.enable());
    }
  }, _detectIE: function() {
    var e2 = t.navigator.userAgent, i2 = e2.indexOf("MSIE ");
    if (i2 > 0) return parseInt(e2.substring(i2 + 5, e2.indexOf(".", i2)), 10);
    if (e2.indexOf("Trident/") > 0) {
      var o2 = e2.indexOf("rv:");
      return parseInt(e2.substring(o2 + 3, e2.indexOf(".", o2)), 10);
    }
    var a = e2.indexOf("Edge/");
    return a > 0 && parseInt(e2.substring(a + 5, e2.indexOf(".", a)), 10);
  } }), L.LatLngUtil = { cloneLatLngs: function(t2) {
    for (var e2 = [], i2 = 0, o2 = t2.length; i2 < o2; i2++) Array.isArray(t2[i2]) ? e2.push(L.LatLngUtil.cloneLatLngs(t2[i2])) : e2.push(this.cloneLatLng(t2[i2]));
    return e2;
  }, cloneLatLng: function(t2) {
    return L.latLng(t2.lat, t2.lng);
  } }, function() {
    var t2 = { km: 2, ha: 2, m: 0, mi: 2, ac: 2, yd: 0, ft: 0, nm: 2 };
    L.GeometryUtil = L.extend(L.GeometryUtil || {}, { geodesicArea: function(t3) {
      var e2, i2, o2 = t3.length, a = 0, n = Math.PI / 180;
      if (o2 > 2) {
        for (var s = 0; s < o2; s++) e2 = t3[s], i2 = t3[(s + 1) % o2], a += (i2.lng - e2.lng) * n * (2 + Math.sin(e2.lat * n) + Math.sin(i2.lat * n));
        a = 6378137 * a * 6378137 / 2;
      }
      return Math.abs(a);
    }, formattedNumber: function(t3, e2) {
      var i2 = parseFloat(t3).toFixed(e2), o2 = L.drawLocal.format && L.drawLocal.format.numeric, a = o2 && o2.delimiters, n = a && a.thousands, s = a && a.decimal;
      if (n || s) {
        var r = i2.split(".");
        i2 = n ? r[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, "$1" + n) : r[0], s = s || ".", r.length > 1 && (i2 = i2 + s + r[1]);
      }
      return i2;
    }, readableArea: function(e2, i2, o2) {
      var a, n, o2 = L.Util.extend({}, t2, o2);
      return i2 ? (n = ["ha", "m"], type = typeof i2, "string" === type ? n = [i2] : "boolean" !== type && (n = i2), a = e2 >= 1e6 && -1 !== n.indexOf("km") ? L.GeometryUtil.formattedNumber(1e-6 * e2, o2.km) + " km²" : e2 >= 1e4 && -1 !== n.indexOf("ha") ? L.GeometryUtil.formattedNumber(1e-4 * e2, o2.ha) + " ha" : L.GeometryUtil.formattedNumber(e2, o2.m) + " m²") : (e2 /= 0.836127, a = e2 >= 3097600 ? L.GeometryUtil.formattedNumber(e2 / 3097600, o2.mi) + " mi²" : e2 >= 4840 ? L.GeometryUtil.formattedNumber(e2 / 4840, o2.ac) + " acres" : L.GeometryUtil.formattedNumber(e2, o2.yd) + " yd²"), a;
    }, readableDistance: function(e2, i2, o2, a, n) {
      var s, n = L.Util.extend({}, t2, n);
      switch (i2 ? "string" == typeof i2 ? i2 : "metric" : o2 ? "feet" : a ? "nauticalMile" : "yards") {
        case "metric":
          s = e2 > 1e3 ? L.GeometryUtil.formattedNumber(e2 / 1e3, n.km) + " km" : L.GeometryUtil.formattedNumber(e2, n.m) + " m";
          break;
        case "feet":
          e2 *= 3.28083, s = L.GeometryUtil.formattedNumber(e2, n.ft) + " ft";
          break;
        case "nauticalMile":
          e2 *= 0.53996, s = L.GeometryUtil.formattedNumber(e2 / 1e3, n.nm) + " nm";
          break;
        case "yards":
        default:
          e2 *= 1.09361, s = e2 > 1760 ? L.GeometryUtil.formattedNumber(e2 / 1760, n.mi) + " miles" : L.GeometryUtil.formattedNumber(e2, n.yd) + " yd";
      }
      return s;
    }, isVersion07x: function() {
      var t3 = L.version.split(".");
      return 0 === parseInt(t3[0], 10) && 7 === parseInt(t3[1], 10);
    } });
  }(), L.Util.extend(L.LineUtil, { segmentsIntersect: function(t2, e2, i2, o2) {
    return this._checkCounterclockwise(t2, i2, o2) !== this._checkCounterclockwise(e2, i2, o2) && this._checkCounterclockwise(t2, e2, i2) !== this._checkCounterclockwise(t2, e2, o2);
  }, _checkCounterclockwise: function(t2, e2, i2) {
    return (i2.y - t2.y) * (e2.x - t2.x) > (e2.y - t2.y) * (i2.x - t2.x);
  } }), L.Polyline.include({ intersects: function() {
    var t2, e2, i2, o2 = this._getProjectedPoints(), a = o2 ? o2.length : 0;
    if (this._tooFewPointsForIntersection()) return false;
    for (t2 = a - 1; t2 >= 3; t2--) if (e2 = o2[t2 - 1], i2 = o2[t2], this._lineSegmentsIntersectsRange(e2, i2, t2 - 2)) return true;
    return false;
  }, newLatLngIntersects: function(t2, e2) {
    return !!this._map && this.newPointIntersects(this._map.latLngToLayerPoint(t2), e2);
  }, newPointIntersects: function(t2, e2) {
    var i2 = this._getProjectedPoints(), o2 = i2 ? i2.length : 0, a = i2 ? i2[o2 - 1] : null, n = o2 - 2;
    return !this._tooFewPointsForIntersection(1) && this._lineSegmentsIntersectsRange(a, t2, n, e2 ? 1 : 0);
  }, _tooFewPointsForIntersection: function(t2) {
    var e2 = this._getProjectedPoints(), i2 = e2 ? e2.length : 0;
    return i2 += t2 || 0, !e2 || i2 <= 3;
  }, _lineSegmentsIntersectsRange: function(t2, e2, i2, o2) {
    var a, n, s = this._getProjectedPoints();
    o2 = o2 || 0;
    for (var r = i2; r > o2; r--) if (a = s[r - 1], n = s[r], L.LineUtil.segmentsIntersect(t2, e2, a, n)) return true;
    return false;
  }, _getProjectedPoints: function() {
    if (!this._defaultShape) return this._originalPoints;
    for (var t2 = [], e2 = this._defaultShape(), i2 = 0; i2 < e2.length; i2++) t2.push(this._map.latLngToLayerPoint(e2[i2]));
    return t2;
  } }), L.Polygon.include({ intersects: function() {
    var t2, e2, i2, o2, a = this._getProjectedPoints();
    return !this._tooFewPointsForIntersection() && (!!L.Polyline.prototype.intersects.call(this) || (t2 = a.length, e2 = a[0], i2 = a[t2 - 1], o2 = t2 - 2, this._lineSegmentsIntersectsRange(i2, e2, o2, 1)));
  } }), L.Control.Draw = L.Control.extend({ options: { position: "topleft", draw: {}, edit: false }, initialize: function(t2) {
    if (L.version < "0.7") throw new Error("Leaflet.draw 0.2.3+ requires Leaflet 0.7.0+. Download latest from https://github.com/Leaflet/Leaflet/");
    L.Control.prototype.initialize.call(this, t2);
    var e2;
    this._toolbars = {}, L.DrawToolbar && this.options.draw && (e2 = new L.DrawToolbar(this.options.draw), this._toolbars[L.DrawToolbar.TYPE] = e2, this._toolbars[L.DrawToolbar.TYPE].on("enable", this._toolbarEnabled, this)), L.EditToolbar && this.options.edit && (e2 = new L.EditToolbar(this.options.edit), this._toolbars[L.EditToolbar.TYPE] = e2, this._toolbars[L.EditToolbar.TYPE].on("enable", this._toolbarEnabled, this)), L.toolbar = this;
  }, onAdd: function(t2) {
    var e2, i2 = L.DomUtil.create("div", "leaflet-draw"), o2 = false;
    for (var a in this._toolbars) this._toolbars.hasOwnProperty(a) && (e2 = this._toolbars[a].addToolbar(t2)) && (o2 || (L.DomUtil.hasClass(e2, "leaflet-draw-toolbar-top") || L.DomUtil.addClass(e2.childNodes[0], "leaflet-draw-toolbar-top"), o2 = true), i2.appendChild(e2));
    return i2;
  }, onRemove: function() {
    for (var t2 in this._toolbars) this._toolbars.hasOwnProperty(t2) && this._toolbars[t2].removeToolbar();
  }, setDrawingOptions: function(t2) {
    for (var e2 in this._toolbars) this._toolbars[e2] instanceof L.DrawToolbar && this._toolbars[e2].setOptions(t2);
  }, _toolbarEnabled: function(t2) {
    var e2 = t2.target;
    for (var i2 in this._toolbars) this._toolbars[i2] !== e2 && this._toolbars[i2].disable();
  } }), L.Map.mergeOptions({ drawControlTooltips: true, drawControl: false }), L.Map.addInitHook(function() {
    this.options.drawControl && (this.drawControl = new L.Control.Draw(), this.addControl(this.drawControl));
  }), L.Toolbar = L.Class.extend({ initialize: function(t2) {
    L.setOptions(this, t2), this._modes = {}, this._actionButtons = [], this._activeMode = null;
    var e2 = L.version.split(".");
    1 === parseInt(e2[0], 10) && parseInt(e2[1], 10) >= 2 ? L.Toolbar.include(L.Evented.prototype) : L.Toolbar.include(L.Mixin.Events);
  }, enabled: function() {
    return null !== this._activeMode;
  }, disable: function() {
    this.enabled() && this._activeMode.handler.disable();
  }, addToolbar: function(t2) {
    var e2, i2 = L.DomUtil.create("div", "leaflet-draw-section"), o2 = 0, a = this._toolbarClass || "", n = this.getModeHandlers(t2);
    for (this._toolbarContainer = L.DomUtil.create("div", "leaflet-draw-toolbar leaflet-bar"), this._map = t2, e2 = 0; e2 < n.length; e2++) n[e2].enabled && this._initModeHandler(n[e2].handler, this._toolbarContainer, o2++, a, n[e2].title);
    if (o2) return this._lastButtonIndex = --o2, this._actionsContainer = L.DomUtil.create("ul", "leaflet-draw-actions"), i2.appendChild(this._toolbarContainer), i2.appendChild(this._actionsContainer), i2;
  }, removeToolbar: function() {
    for (var t2 in this._modes) this._modes.hasOwnProperty(t2) && (this._disposeButton(this._modes[t2].button, this._modes[t2].handler.enable, this._modes[t2].handler), this._modes[t2].handler.disable(), this._modes[t2].handler.off("enabled", this._handlerActivated, this).off("disabled", this._handlerDeactivated, this));
    this._modes = {};
    for (var e2 = 0, i2 = this._actionButtons.length; e2 < i2; e2++) this._disposeButton(this._actionButtons[e2].button, this._actionButtons[e2].callback, this);
    this._actionButtons = [], this._actionsContainer = null;
  }, _initModeHandler: function(t2, e2, i2, o2, a) {
    var n = t2.type;
    this._modes[n] = {}, this._modes[n].handler = t2, this._modes[n].button = this._createButton({ type: n, title: a, className: o2 + "-" + n, container: e2, callback: this._modes[n].handler.enable, context: this._modes[n].handler }), this._modes[n].buttonIndex = i2, this._modes[n].handler.on("enabled", this._handlerActivated, this).on("disabled", this._handlerDeactivated, this);
  }, _detectIOS: function() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !t.MSStream;
  }, _createButton: function(t2) {
    var e2 = L.DomUtil.create("a", t2.className || "", t2.container), i2 = L.DomUtil.create("span", "sr-only", t2.container);
    e2.href = "#", e2.appendChild(i2), t2.title && (e2.title = t2.title, i2.innerHTML = t2.title), t2.text && (e2.innerHTML = t2.text, i2.innerHTML = t2.text);
    var o2 = this._detectIOS() ? "touchstart" : "click";
    return L.DomEvent.on(e2, "click", L.DomEvent.stopPropagation).on(e2, "mousedown", L.DomEvent.stopPropagation).on(e2, "dblclick", L.DomEvent.stopPropagation).on(e2, "touchstart", L.DomEvent.stopPropagation).on(e2, "click", L.DomEvent.preventDefault).on(e2, o2, t2.callback, t2.context), e2;
  }, _disposeButton: function(t2, e2) {
    var i2 = this._detectIOS() ? "touchstart" : "click";
    L.DomEvent.off(t2, "click", L.DomEvent.stopPropagation).off(t2, "mousedown", L.DomEvent.stopPropagation).off(t2, "dblclick", L.DomEvent.stopPropagation).off(t2, "touchstart", L.DomEvent.stopPropagation).off(t2, "click", L.DomEvent.preventDefault).off(t2, i2, e2);
  }, _handlerActivated: function(t2) {
    this.disable(), this._activeMode = this._modes[t2.handler], L.DomUtil.addClass(this._activeMode.button, "leaflet-draw-toolbar-button-enabled"), this._showActionsToolbar(), this.fire("enable");
  }, _handlerDeactivated: function() {
    this._hideActionsToolbar(), L.DomUtil.removeClass(this._activeMode.button, "leaflet-draw-toolbar-button-enabled"), this._activeMode = null, this.fire("disable");
  }, _createActions: function(t2) {
    var e2, i2, o2, a, n = this._actionsContainer, s = this.getActions(t2), r = s.length;
    for (i2 = 0, o2 = this._actionButtons.length; i2 < o2; i2++) this._disposeButton(this._actionButtons[i2].button, this._actionButtons[i2].callback);
    for (this._actionButtons = []; n.firstChild; ) n.removeChild(n.firstChild);
    for (var l = 0; l < r; l++) "enabled" in s[l] && !s[l].enabled || (e2 = L.DomUtil.create("li", "", n), a = this._createButton({ title: s[l].title, text: s[l].text, container: e2, callback: s[l].callback, context: s[l].context }), this._actionButtons.push({ button: a, callback: s[l].callback }));
  }, _showActionsToolbar: function() {
    var t2 = this._activeMode.buttonIndex, e2 = this._lastButtonIndex, i2 = this._activeMode.button.offsetTop - 1;
    this._createActions(this._activeMode.handler), this._actionsContainer.style.top = i2 + "px", 0 === t2 && (L.DomUtil.addClass(this._toolbarContainer, "leaflet-draw-toolbar-notop"), L.DomUtil.addClass(this._actionsContainer, "leaflet-draw-actions-top")), t2 === e2 && (L.DomUtil.addClass(this._toolbarContainer, "leaflet-draw-toolbar-nobottom"), L.DomUtil.addClass(this._actionsContainer, "leaflet-draw-actions-bottom")), this._actionsContainer.style.display = "block", this._map.fire(L.Draw.Event.TOOLBAROPENED);
  }, _hideActionsToolbar: function() {
    this._actionsContainer.style.display = "none", L.DomUtil.removeClass(this._toolbarContainer, "leaflet-draw-toolbar-notop"), L.DomUtil.removeClass(this._toolbarContainer, "leaflet-draw-toolbar-nobottom"), L.DomUtil.removeClass(this._actionsContainer, "leaflet-draw-actions-top"), L.DomUtil.removeClass(this._actionsContainer, "leaflet-draw-actions-bottom"), this._map.fire(L.Draw.Event.TOOLBARCLOSED);
  } }), L.Draw = L.Draw || {}, L.Draw.Tooltip = L.Class.extend({ initialize: function(t2) {
    this._map = t2, this._popupPane = t2._panes.popupPane, this._visible = false, this._container = t2.options.drawControlTooltips ? L.DomUtil.create("div", "leaflet-draw-tooltip", this._popupPane) : null, this._singleLineLabel = false, this._map.on("mouseout", this._onMouseOut, this);
  }, dispose: function() {
    this._map.off("mouseout", this._onMouseOut, this), this._container && (this._popupPane.removeChild(this._container), this._container = null);
  }, updateContent: function(t2) {
    return this._container ? (t2.subtext = t2.subtext || "", 0 !== t2.subtext.length || this._singleLineLabel ? t2.subtext.length > 0 && this._singleLineLabel && (L.DomUtil.removeClass(this._container, "leaflet-draw-tooltip-single"), this._singleLineLabel = false) : (L.DomUtil.addClass(this._container, "leaflet-draw-tooltip-single"), this._singleLineLabel = true), this._container.innerHTML = (t2.subtext.length > 0 ? '<span class="leaflet-draw-tooltip-subtext">' + t2.subtext + "</span><br />" : "") + "<span>" + t2.text + "</span>", t2.text || t2.subtext ? (this._visible = true, this._container.style.visibility = "inherit") : (this._visible = false, this._container.style.visibility = "hidden"), this) : this;
  }, updatePosition: function(t2) {
    var e2 = this._map.latLngToLayerPoint(t2), i2 = this._container;
    return this._container && (this._visible && (i2.style.visibility = "inherit"), L.DomUtil.setPosition(i2, e2)), this;
  }, showAsError: function() {
    return this._container && L.DomUtil.addClass(this._container, "leaflet-error-draw-tooltip"), this;
  }, removeError: function() {
    return this._container && L.DomUtil.removeClass(this._container, "leaflet-error-draw-tooltip"), this;
  }, _onMouseOut: function() {
    this._container && (this._container.style.visibility = "hidden");
  } }), L.DrawToolbar = L.Toolbar.extend({ statics: { TYPE: "draw" }, options: { polyline: {}, polygon: {}, rectangle: {}, circle: {}, marker: {}, circlemarker: {} }, initialize: function(t2) {
    for (var e2 in this.options) this.options.hasOwnProperty(e2) && t2[e2] && (t2[e2] = L.extend({}, this.options[e2], t2[e2]));
    this._toolbarClass = "leaflet-draw-draw", L.Toolbar.prototype.initialize.call(this, t2);
  }, getModeHandlers: function(t2) {
    return [{ enabled: this.options.polyline, handler: new L.Draw.Polyline(t2, this.options.polyline), title: L.drawLocal.draw.toolbar.buttons.polyline }, { enabled: this.options.polygon, handler: new L.Draw.Polygon(t2, this.options.polygon), title: L.drawLocal.draw.toolbar.buttons.polygon }, { enabled: this.options.rectangle, handler: new L.Draw.Rectangle(t2, this.options.rectangle), title: L.drawLocal.draw.toolbar.buttons.rectangle }, { enabled: this.options.circle, handler: new L.Draw.Circle(t2, this.options.circle), title: L.drawLocal.draw.toolbar.buttons.circle }, { enabled: this.options.marker, handler: new L.Draw.Marker(t2, this.options.marker), title: L.drawLocal.draw.toolbar.buttons.marker }, { enabled: this.options.circlemarker, handler: new L.Draw.CircleMarker(t2, this.options.circlemarker), title: L.drawLocal.draw.toolbar.buttons.circlemarker }];
  }, getActions: function(t2) {
    return [{ enabled: t2.completeShape, title: L.drawLocal.draw.toolbar.finish.title, text: L.drawLocal.draw.toolbar.finish.text, callback: t2.completeShape, context: t2 }, { enabled: t2.deleteLastVertex, title: L.drawLocal.draw.toolbar.undo.title, text: L.drawLocal.draw.toolbar.undo.text, callback: t2.deleteLastVertex, context: t2 }, { title: L.drawLocal.draw.toolbar.actions.title, text: L.drawLocal.draw.toolbar.actions.text, callback: this.disable, context: this }];
  }, setOptions: function(t2) {
    L.setOptions(this, t2);
    for (var e2 in this._modes) this._modes.hasOwnProperty(e2) && t2.hasOwnProperty(e2) && this._modes[e2].handler.setOptions(t2[e2]);
  } }), L.EditToolbar = L.Toolbar.extend({ statics: { TYPE: "edit" }, options: { edit: { selectedPathOptions: { dashArray: "10, 10", fill: true, fillColor: "#fe57a1", fillOpacity: 0.1, maintainColor: false } }, remove: {}, poly: null, featureGroup: null }, initialize: function(t2) {
    t2.edit && (void 0 === t2.edit.selectedPathOptions && (t2.edit.selectedPathOptions = this.options.edit.selectedPathOptions), t2.edit.selectedPathOptions = L.extend({}, this.options.edit.selectedPathOptions, t2.edit.selectedPathOptions)), t2.remove && (t2.remove = L.extend({}, this.options.remove, t2.remove)), t2.poly && (t2.poly = L.extend({}, this.options.poly, t2.poly)), this._toolbarClass = "leaflet-draw-edit", L.Toolbar.prototype.initialize.call(this, t2), this._selectedFeatureCount = 0;
  }, getModeHandlers: function(t2) {
    var e2 = this.options.featureGroup;
    return [{ enabled: this.options.edit, handler: new L.EditToolbar.Edit(t2, { featureGroup: e2, selectedPathOptions: this.options.edit.selectedPathOptions, poly: this.options.poly }), title: L.drawLocal.edit.toolbar.buttons.edit }, { enabled: this.options.remove, handler: new L.EditToolbar.Delete(t2, { featureGroup: e2 }), title: L.drawLocal.edit.toolbar.buttons.remove }];
  }, getActions: function(t2) {
    var e2 = [{ title: L.drawLocal.edit.toolbar.actions.save.title, text: L.drawLocal.edit.toolbar.actions.save.text, callback: this._save, context: this }, { title: L.drawLocal.edit.toolbar.actions.cancel.title, text: L.drawLocal.edit.toolbar.actions.cancel.text, callback: this.disable, context: this }];
    return t2.removeAllLayers && e2.push({ title: L.drawLocal.edit.toolbar.actions.clearAll.title, text: L.drawLocal.edit.toolbar.actions.clearAll.text, callback: this._clearAllLayers, context: this }), e2;
  }, addToolbar: function(t2) {
    var e2 = L.Toolbar.prototype.addToolbar.call(this, t2);
    return this._checkDisabled(), this.options.featureGroup.on("layeradd layerremove", this._checkDisabled, this), e2;
  }, removeToolbar: function() {
    this.options.featureGroup.off("layeradd layerremove", this._checkDisabled, this), L.Toolbar.prototype.removeToolbar.call(this);
  }, disable: function() {
    this.enabled() && (this._activeMode.handler.revertLayers(), L.Toolbar.prototype.disable.call(this));
  }, _save: function() {
    this._activeMode.handler.save(), this._activeMode && this._activeMode.handler.disable();
  }, _clearAllLayers: function() {
    this._activeMode.handler.removeAllLayers(), this._activeMode && this._activeMode.handler.disable();
  }, _checkDisabled: function() {
    var t2, e2 = this.options.featureGroup, i2 = 0 !== e2.getLayers().length;
    this.options.edit && (t2 = this._modes[L.EditToolbar.Edit.TYPE].button, i2 ? L.DomUtil.removeClass(t2, "leaflet-disabled") : L.DomUtil.addClass(t2, "leaflet-disabled"), t2.setAttribute("title", i2 ? L.drawLocal.edit.toolbar.buttons.edit : L.drawLocal.edit.toolbar.buttons.editDisabled)), this.options.remove && (t2 = this._modes[L.EditToolbar.Delete.TYPE].button, i2 ? L.DomUtil.removeClass(t2, "leaflet-disabled") : L.DomUtil.addClass(t2, "leaflet-disabled"), t2.setAttribute("title", i2 ? L.drawLocal.edit.toolbar.buttons.remove : L.drawLocal.edit.toolbar.buttons.removeDisabled));
  } }), L.EditToolbar.Edit = L.Handler.extend({ statics: { TYPE: "edit" }, initialize: function(t2, e2) {
    if (L.Handler.prototype.initialize.call(this, t2), L.setOptions(this, e2), this._featureGroup = e2.featureGroup, !(this._featureGroup instanceof L.FeatureGroup)) throw new Error("options.featureGroup must be a L.FeatureGroup");
    this._uneditedLayerProps = {}, this.type = L.EditToolbar.Edit.TYPE;
    var i2 = L.version.split(".");
    1 === parseInt(i2[0], 10) && parseInt(i2[1], 10) >= 2 ? L.EditToolbar.Edit.include(L.Evented.prototype) : L.EditToolbar.Edit.include(L.Mixin.Events);
  }, enable: function() {
    !this._enabled && this._hasAvailableLayers() && (this.fire("enabled", { handler: this.type }), this._map.fire(L.Draw.Event.EDITSTART, { handler: this.type }), L.Handler.prototype.enable.call(this), this._featureGroup.on("layeradd", this._enableLayerEdit, this).on("layerremove", this._disableLayerEdit, this));
  }, disable: function() {
    this._enabled && (this._featureGroup.off("layeradd", this._enableLayerEdit, this).off("layerremove", this._disableLayerEdit, this), L.Handler.prototype.disable.call(this), this._map.fire(L.Draw.Event.EDITSTOP, { handler: this.type }), this.fire("disabled", { handler: this.type }));
  }, addHooks: function() {
    var t2 = this._map;
    t2 && (t2.getContainer().focus(), this._featureGroup.eachLayer(this._enableLayerEdit, this), this._tooltip = new L.Draw.Tooltip(this._map), this._tooltip.updateContent({ text: L.drawLocal.edit.handlers.edit.tooltip.text, subtext: L.drawLocal.edit.handlers.edit.tooltip.subtext }), t2._editTooltip = this._tooltip, this._updateTooltip(), this._map.on("mousemove", this._onMouseMove, this).on("touchmove", this._onMouseMove, this).on("MSPointerMove", this._onMouseMove, this).on(L.Draw.Event.EDITVERTEX, this._updateTooltip, this));
  }, removeHooks: function() {
    this._map && (this._featureGroup.eachLayer(this._disableLayerEdit, this), this._uneditedLayerProps = {}, this._tooltip.dispose(), this._tooltip = null, this._map.off("mousemove", this._onMouseMove, this).off("touchmove", this._onMouseMove, this).off("MSPointerMove", this._onMouseMove, this).off(L.Draw.Event.EDITVERTEX, this._updateTooltip, this));
  }, revertLayers: function() {
    this._featureGroup.eachLayer(function(t2) {
      this._revertLayer(t2);
    }, this);
  }, save: function() {
    var t2 = new L.LayerGroup();
    this._featureGroup.eachLayer(function(e2) {
      e2.edited && (t2.addLayer(e2), e2.edited = false);
    }), this._map.fire(L.Draw.Event.EDITED, { layers: t2 });
  }, _backupLayer: function(t2) {
    var e2 = L.Util.stamp(t2);
    this._uneditedLayerProps[e2] || (t2 instanceof L.Polyline || t2 instanceof L.Polygon || t2 instanceof L.Rectangle ? this._uneditedLayerProps[e2] = { latlngs: L.LatLngUtil.cloneLatLngs(t2.getLatLngs()) } : t2 instanceof L.Circle ? this._uneditedLayerProps[e2] = { latlng: L.LatLngUtil.cloneLatLng(t2.getLatLng()), radius: t2.getRadius() } : (t2 instanceof L.Marker || t2 instanceof L.CircleMarker) && (this._uneditedLayerProps[e2] = { latlng: L.LatLngUtil.cloneLatLng(t2.getLatLng()) }));
  }, _getTooltipText: function() {
    return { text: L.drawLocal.edit.handlers.edit.tooltip.text, subtext: L.drawLocal.edit.handlers.edit.tooltip.subtext };
  }, _updateTooltip: function() {
    this._tooltip.updateContent(this._getTooltipText());
  }, _revertLayer: function(t2) {
    var e2 = L.Util.stamp(t2);
    t2.edited = false, this._uneditedLayerProps.hasOwnProperty(e2) && (t2 instanceof L.Polyline || t2 instanceof L.Polygon || t2 instanceof L.Rectangle ? t2.setLatLngs(this._uneditedLayerProps[e2].latlngs) : t2 instanceof L.Circle ? (t2.setLatLng(this._uneditedLayerProps[e2].latlng), t2.setRadius(this._uneditedLayerProps[e2].radius)) : (t2 instanceof L.Marker || t2 instanceof L.CircleMarker) && t2.setLatLng(this._uneditedLayerProps[e2].latlng), t2.fire("revert-edited", { layer: t2 }));
  }, _enableLayerEdit: function(t2) {
    var e2, i2, o2 = t2.layer || t2.target || t2;
    this._backupLayer(o2), this.options.poly && (i2 = L.Util.extend({}, this.options.poly), o2.options.poly = i2), this.options.selectedPathOptions && (e2 = L.Util.extend({}, this.options.selectedPathOptions), e2.maintainColor && (e2.color = o2.options.color, e2.fillColor = o2.options.fillColor), o2.options.original = L.extend({}, o2.options), o2.options.editing = e2), o2 instanceof L.Marker ? (o2.editing && o2.editing.enable(), o2.dragging.enable(), o2.on("dragend", this._onMarkerDragEnd).on("touchmove", this._onTouchMove, this).on("MSPointerMove", this._onTouchMove, this).on("touchend", this._onMarkerDragEnd, this).on("MSPointerUp", this._onMarkerDragEnd, this)) : o2.editing.enable();
  }, _disableLayerEdit: function(t2) {
    var e2 = t2.layer || t2.target || t2;
    e2.edited = false, e2.editing && e2.editing.disable(), delete e2.options.editing, delete e2.options.original, this._selectedPathOptions && (e2 instanceof L.Marker ? this._toggleMarkerHighlight(e2) : (e2.setStyle(e2.options.previousOptions), delete e2.options.previousOptions)), e2 instanceof L.Marker ? (e2.dragging.disable(), e2.off("dragend", this._onMarkerDragEnd, this).off("touchmove", this._onTouchMove, this).off("MSPointerMove", this._onTouchMove, this).off("touchend", this._onMarkerDragEnd, this).off("MSPointerUp", this._onMarkerDragEnd, this)) : e2.editing.disable();
  }, _onMouseMove: function(t2) {
    this._tooltip.updatePosition(t2.latlng);
  }, _onMarkerDragEnd: function(t2) {
    var e2 = t2.target;
    e2.edited = true, this._map.fire(L.Draw.Event.EDITMOVE, { layer: e2 });
  }, _onTouchMove: function(t2) {
    var e2 = t2.originalEvent.changedTouches[0], i2 = this._map.mouseEventToLayerPoint(e2), o2 = this._map.layerPointToLatLng(i2);
    t2.target.setLatLng(o2);
  }, _hasAvailableLayers: function() {
    return 0 !== this._featureGroup.getLayers().length;
  } }), L.EditToolbar.Delete = L.Handler.extend({ statics: { TYPE: "remove" }, initialize: function(t2, e2) {
    if (L.Handler.prototype.initialize.call(this, t2), L.Util.setOptions(this, e2), this._deletableLayers = this.options.featureGroup, !(this._deletableLayers instanceof L.FeatureGroup)) throw new Error("options.featureGroup must be a L.FeatureGroup");
    this.type = L.EditToolbar.Delete.TYPE;
    var i2 = L.version.split(".");
    1 === parseInt(i2[0], 10) && parseInt(i2[1], 10) >= 2 ? L.EditToolbar.Delete.include(L.Evented.prototype) : L.EditToolbar.Delete.include(L.Mixin.Events);
  }, enable: function() {
    !this._enabled && this._hasAvailableLayers() && (this.fire("enabled", { handler: this.type }), this._map.fire(L.Draw.Event.DELETESTART, { handler: this.type }), L.Handler.prototype.enable.call(this), this._deletableLayers.on("layeradd", this._enableLayerDelete, this).on("layerremove", this._disableLayerDelete, this));
  }, disable: function() {
    this._enabled && (this._deletableLayers.off("layeradd", this._enableLayerDelete, this).off("layerremove", this._disableLayerDelete, this), L.Handler.prototype.disable.call(this), this._map.fire(L.Draw.Event.DELETESTOP, { handler: this.type }), this.fire("disabled", { handler: this.type }));
  }, addHooks: function() {
    var t2 = this._map;
    t2 && (t2.getContainer().focus(), this._deletableLayers.eachLayer(this._enableLayerDelete, this), this._deletedLayers = new L.LayerGroup(), this._tooltip = new L.Draw.Tooltip(this._map), this._tooltip.updateContent({ text: L.drawLocal.edit.handlers.remove.tooltip.text }), this._map.on("mousemove", this._onMouseMove, this));
  }, removeHooks: function() {
    this._map && (this._deletableLayers.eachLayer(this._disableLayerDelete, this), this._deletedLayers = null, this._tooltip.dispose(), this._tooltip = null, this._map.off("mousemove", this._onMouseMove, this));
  }, revertLayers: function() {
    this._deletedLayers.eachLayer(function(t2) {
      this._deletableLayers.addLayer(t2), t2.fire("revert-deleted", { layer: t2 });
    }, this);
  }, save: function() {
    this._map.fire(L.Draw.Event.DELETED, { layers: this._deletedLayers });
  }, removeAllLayers: function() {
    this._deletableLayers.eachLayer(function(t2) {
      this._removeLayer({ layer: t2 });
    }, this), this.save();
  }, _enableLayerDelete: function(t2) {
    (t2.layer || t2.target || t2).on("click", this._removeLayer, this);
  }, _disableLayerDelete: function(t2) {
    var e2 = t2.layer || t2.target || t2;
    e2.off("click", this._removeLayer, this), this._deletedLayers.removeLayer(e2);
  }, _removeLayer: function(t2) {
    var e2 = t2.layer || t2.target || t2;
    this._deletableLayers.removeLayer(e2), this._deletedLayers.addLayer(e2), e2.fire("deleted");
  }, _onMouseMove: function(t2) {
    this._tooltip.updatePosition(t2.latlng);
  }, _hasAvailableLayers: function() {
    return 0 !== this._deletableLayers.getLayers().length;
  } });
}(window, document);
//# sourceMappingURL=leaflet-draw.js.map
