﻿$(document).ready(function () {

    // reference:
    // http://learn.jquery.com/plugins/basic-plugin-creation/

    (function ($) {

        var mjAutoScrollBar = {

            _init: function (options, el) {

                this.widget_class = "mjAutoScrollBar";

                // TBD
                // more styles
                // cant create both vertical and horizontal scrollbars
                // mousewheel events 
                // disabled not implemented
                // theme not implemented

                // variables for managing state

                this.state = {
                    range: 0,
                    prev_pos: 0,
                    thumb_size: 0,
                    track_element: null,
                    maxscroll: 0,
                    viewport_size: 0,
                    content_size: 0,
                    scrolling: 0,
                    mousestart: 0,
                    start_pos: 0,
                    has_touch_events: false,
                }

                // NOTE: if you change the contents or size of the text widget you need to create the scrollbar

                this.el = el;
                this.$el = $(el);

                this._validateData(options);

                // plugin have been applied previously
                // blow away any existing instance

                this.close();

                this._render();
                this._startListening();

                return this;
            },

            _validateData: function (options) {

                var default_options = {
                    orientation: "vertical",
                    min: 0,
                    max: 1000,
                    value: 0,
                    step_size: 1,               // when user clicks on arrow how to move by
                    show_buttons: true,         // show the arrow buttons
                    style: "normal",            // normal, thin, square
                    auto_hide: true,            // scrollbar overlaps data and hides when lost focus
                    integer_values: true,       // if false valueChanged callback can return floating point numbers

                    // common properties

                    width: 'auto',
                    height: 'auto',
                    disabled: false,
                    theme: null
                };

                this.settings = $.extend({}, default_options, options);

                var s = this.settings;
                var t = this.state;

                s.orientation = mjcore.validateString(s.orientation, ["vertical", "horizontal"], "vertical");
                s.min = mjcore.validateFloat(s.min, 0);
                s.max = mjcore.validateFloat(s.max, 1000);
                s.value = mjcore.validateFloat(s.value, s.min);

                // cant handle max < min yet

                if (s.min > s.max) {
                    var tmp = s.min;
                    s.min = s.max;
                    s.max = tmp;
                }

                if (s.value < s.min)
                    s.value = s.min;

                if (s.value > s.max)
                    s.value = s.max;

                s.step_size = mjcore.validateFloat(s.step_size, 1);
                s.show_buttons = mjcore.validateBool(s.show_buttons, true);
                s.style = mjcore.validateString(s.style, ["normal", "thin", "square"], "normal");
                s.auto_hide = mjcore.validateBool(s.auto_hide, true);
                s.integer_values = mjcore.validateBool(s.integer_values, true);
                s.visible_item_no = mjcore.validateInt(s.visible_item_no, null, null);

                // common properties

                s.disabled = mjcore.validateBool(s.disabled, false);

                t.range = s.max - s.min;

                if (s.step_size > t.range)
                    s.step_size = t.range;

                //var MAX_INT = 4294967295;
                var MAX_INT = 9007199254740992;

                // ES6 introduces Number.MIN_SAFE_INTEGER, not supported in IE and safari

                t.prev_pos = MAX_INT;
            },

            _calcThumbSize: function () {

                var s = this.settings;
                var t = this.state;

                var r = t.viewport_size / t.content_size;
 

                if (s.orientation == "vertical")
                    t.thumb_size = t.track_element.height() * r;
                else
                    t.thumb_size = t.track_element.width() * r;

                var MIN_THUMB_SIZE = 18;

                if (t.thumb_size < MIN_THUMB_SIZE)
                    t.thumb_size = MIN_THUMB_SIZE;
            },

            _calcMaxScroll: function () {

                var s = this.settings;
                var t = this.state;

                // call this when we start the drag

                this._calcThumbSize();

                // recalculate size of scrollbar track just in case scrollbar has been resized

                if (s.orientation == "vertical") {
                    t.maxscroll = t.track_element.height() - t.thumb_size;    // subtract size of thumb
                    t.thumb_element.height(t.thumb_size);
                }
                else {
                    t.maxscroll = t.track_element.width() - t.thumb_size;    // subtract size of thumb
                    t.thumb_element.width(t.thumb_size);
                }
            },

            _render: function () {

                var s = this.settings;
                var t = this.state;

                var orientation = "mj-vertical";

                if (s.orientation == "horizontal")
                    orientation = "mj-horizontal";

                var c = "<div class='mj-widget mj-scrollbar " + orientation + "'>";

                // replace contents of container
                // we do not want to change the css of the container so we copy the contents of the container into a new element
                // we need to set overflow on the element to hidden

                c += "<div class='mj-scrollbar-pane'>" + this.$el.html() + "</div>";

                // slider

                c += "<div class='mj-scrollbar-slider '>";

                if (s.show_buttons) {
                    if (s.orientation == "vertical")
                        c += "<div class='mj-arrow mj-arrow-up'></div>";
                    else
                        c += "<div class='mj-arrow mj-arrow-left'></div>";
                }

                c += " <div class='mj-scrollbar-track'>";                   // track
                c += "  <div class='mj-scrollbar-thumb'></div>";            // thumb
                c += " </div>";

                if (s.show_buttons) {
                    if (s.orientation == "vertical")
                        c += "<div class='mj-arrow mj-arrow-down'></div>";
                    else
                        c += "<div class='mj-arrow mj-arrow-right'></div>";
                }

                c += "</div>";      // end slider

                c += "</div>";      // end widget

                this.$el.html(c);

                //$(c).insertAfter(this.$el);
                //this.$el.parent().find(".mj-scrollbar").css({width: "22px", height: this.$el.height(), display: "inline-block", "vertical-align": "top"});

                this._loadCSS();

                // find viewport_size and content_size

                if (s.orientation == "vertical") {

                    if (!s.show_buttons)
                        this.$el.find(".mj-scrollbar-track").css({ top: 0, bottom: 0 });

                    t.viewport_size = this.$el.height();

                    var e = this.$el.find(".mj-scrollbar-pane");

                    t.content_size = e.height();        // unrestricted height
                    e.height(t.viewport_size).width("100%");
                }
                else {

                    // horizontal

                    if (!s.show_buttons)
                        this.$el.find(".mj-scrollbar-track").css({ left: 0, right: 0 });

                    this.viewport_size = this.$el.width();

                    var e = this.$el.find(".mj-scrollbar-pane");

                    t.content_size = e.width();
                    e.width(t.viewport_size);
                }


                t.thumb_element = this.$el.find(".mj-scrollbar-thumb");
                t.track_element = this.$el.find(".mj-scrollbar-track");

                this.set(s.value);
            },

            _stopListening: function () {
                this.$el.off();
            },

            _startListening: function () {

                var self = this;

                var s = this.settings;
                var t = this.state;

                this.scrolling = false;
                this.mousestart = 0;
                this.maxscroll = 0;
                this.start_pos = 0;

                this.has_touch_events = ("ontouchstart" in document.documentElement);

                this.$el.on("mousedown", ".mj-scrollbar-thumb", function (e) {

                    // start drag

                    e.preventDefault();

                    self._dragstart(e);

                    //self.t = setInterval(function () {self.draw(); }, 50);

                    $(document).bind("mousemove", self, self._drag);
                    $(document).bind("mouseup", self, self._dragend);
                });

                this.$el.on("click", ".mj-arrow", function (e) {

                    // arrow click

                    e.preventDefault();

                    var val = s.value;

                    if (s.orientation == "vertical") {
                        if ($(e.currentTarget).hasClass("mj-arrow-down"))
                            self.set(val + s.step_size);
                        else
                            self.set(val - s.step_size);
                    }
                    else {
                        if ($(e.currentTarget).hasClass("mj-arrow-right"))
                            self.set(val + s.step_size);
                        else
                            self.set(val - s.step_size);
                    }
                });

                $(document).on("mouseleave", function (e) {

                    // if mouse leaves the browser window stop the scroll

                    e.data = self;
                    self._dragend(e);
                    t.scrolling = false;
                });

                if (s.auto_hide) {
                    this.$el.on("mouseenter", ".mj-scrollbar", function (e) {
                        self.$el.find(".mj-scrollbar-slider").fadeIn("fast");
                    });

                    this.$el.on("mouseleave", ".mj-scrollbar", function (e) {
                        self.$el.find(".mj-scrollbar-slider").fadeOut("fast");
                    });
                }
            },

            _loadCSS: function () {
                var self = this;

                var s = this.settings;

                if (s.style == "normal")
                    return;

                if (s.orientation == "vertical")
                    this.$el.find(".mj-scrollbar").css({ width: "18px" });
                else
                    this.$el.find(".mj-scrollbar").css({ height: "18px" });


                // load css based on style param

                var url = "../css/mjAutoScrollBarThin.css";

                var jqxhr = $.ajax({
                    type: "GET",
                    //dataType: 'css',
                    url: url,
                    contentType: "application/text; charset=utf-8",

                    success: function (data) {

                        $('<style type="text/css">\n' + data + '</style>').appendTo("head");
                    },
                    error: function (jqXHR, textStatus, thrownError) {

                        mjcore.debug("_loadCSS error: " + thrownError);
                    },
                    complete: function (jqxhr, status) {

                        // always runs

                        jqxhr = null;
                    }
                });

                return jqxhr;
            },

            _dragstart: function (e) {

                var s = this.settings;
                var t = this.state;

                t.scrolling = true;

                var pos = t.thumb_element.position();

                t.thumb_element.addClass("mj-scrollbar-thumb-drag");

                this._calcMaxScroll();

                // recalculate size of scrollbar track just in case scrollbar has been resized

                if (s.orientation == "vertical") {
                    t.start_pos = pos.top;       // current thumb position
                    t.mousestart = e.pageY;		// save starting position
                }
                else {
                    t.start_pos = pos.left;
                    t.mousestart = e.pageX;		// save starting position
                }

                var val = s.value;

                //if (this.settings.integer_values)
                //    val = parseInt(val, 10)

                this.$el.trigger("scrollStart", val);
            },

            _drag: function (e) {

                // preventdefault stops select all

                e.preventDefault();

                var self = e.data;

                var s = self.settings;
                var t = self.state;

                if (!t.scrolling)
                    return;

                var delta = 0

                if (s.orientation == "vertical")
                    delta = e.pageY - t.mousestart;
                else
                    delta = e.pageX - t.mousestart;

                //if (self.settings.orientation == "vertical")
                //    delta = parseInt(e.pageY - self.mousestart, 10);
                //else
                //    delta = parseInt(e.pageX - self.mousestart, 10);

                if (delta == 0)
                    return;

                self._move(t.start_pos + delta);
            },

            _dragend: function (e) {

                e.preventDefault();

                var self = e.data;

                var s = self.settings;
                var t = self.state;

                if (!t.scrolling)
                    return;

                t.scrolling = false;

                t.thumb_element.removeClass("mj-scrollbar-thumb-drag");

                $(document).unbind("mousemove", self, self._drag);
                $(document).unbind("mouseup", self, self._dragend);

                var val = s.value;

                //if (self.settings.integer_values)
                //    val = parseInt(val, 10);

                self.$el.trigger("scrollEnd", val);
            },

            _move: function (pos) {

                var s = this.settings;
                var t = this.state;

                // pos: 0..maxscroll
                // where maxscroll = track height/width - thumb height/width

                if (pos <= 0)
                    pos = 0;
                else
                    if (pos >= t.maxscroll)
                        pos = t.maxscroll;

                if (pos == t.prev_pos)       // no change
                    return;

                t.prev_pos = pos;

                // move the thumb

                if (s.orientation == "vertical")
                    t.thumb_element.css({ top: pos });
                else
                    t.thumb_element.css({ left: pos });

                var r = pos / t.maxscroll;   // r: 0..1

                // calculate value

                s.value = s.min + r * t.range;

                var z = (t.content_size - t.viewport_size) * r;

                var e = this.$el.find(".mj-scrollbar-pane");

                if (s.orientation == "vertical")
                    e.scrollTop(z);
                else
                    e.scrollLeft(z);

                var val = s.value;

                if (s.integer_values)
                    this.$el.trigger("valueChanged", parseInt(val, 10));
                else
                    this.$el.trigger("valueChanged", val);

                //$(".mj-scrollbar-thumb").css("transform", "translateY(" + y + "px)");	

                /*
			    var pos = $(".mj-scrollbar-thumb").position();
			
			    y = y - pos.top ;
									
			    $(".mj-scrollbar-thumb").animate({
				    top: "+=" + y,
			        }, 10, function() {
				    // Animation complete.
			        });	
		          */
            },

            set: function (val) {

                var s = this.settings;
                var t = this.state;

                if (val < s.min)
                    val = s.min;
                else
                    if (val > s.max)
                        val = s.max;

                this._calcMaxScroll();

                // map val (min..max) to maxscroll(0..maxscroll)

                var pos = ((val - s.min) / t.range) * t.maxscroll;

                this._move(pos);
            },

            get: function () {

                var s = this.settings;
                var t = this.state;

                var val = s.value;

                if (s.integer_values)
                    return parseInt(val, 10);

                return val;
            },

            setMinMax: function (min, max) {

                var s = this.settings;
                var t = this.state;

                s.min = mjcore.validateFloat(min, 0);
                s.max = mjcore.validateFloat(max, 1000);

                // cant handle max < min yet

                if (s.min > s.max) {
                    var tmp = s.min;
                    s.min = s.max;
                    s.max = tmp;
                }

                if (s.value < s.min)
                    s.value = s.min;

                if (s.value > s.max)
                    s.value = s.max;

                t.range = max - min;

                this._calcMaxScroll();

                this.set(s.value);
            },

            close: function () {

                // dont clear the data
                // important to turn off events

                this._stopListening();

                // we may still want to get the data after the scrollbar has closed so dont remove the data

                $.removeData(this.el, 'mj-auto-scrollbar-data');

                // put everything back to the way we found it

                var e = this.$el.find(".mj-scrollbar-pane");

                if (e && e.length > 0) {
                    var str = e.html();
                    this.$el.html(str);
                }
            }
        }

        $.fn.mjAutoScrollBar = function (options) {

            // options is empty or an object
            // create the scrollbar            
            // check that element exists using this.length

            if (!this.length) {

                mjcore.mjError("mjAutoScrollBar: the html element to attach to '" + this.selector + "' does not exist.");
                return null;
            }

            // within a plugin use this not $(this) to refer to the element to attach to
            // this refers to the element we are attaching to
            // needs to return this for chainability

            if (mjAutoScrollBar[options]) {

                // options is the name of a method in mjAutoScrollBar

                var o = $(this).data('mj-auto-scrollbar-data');

                // cant call slice directly on arguments

                if (o)
                    return o[options].apply(o, Array.prototype.slice.call(arguments, 1));

                // if o is not found then the mjAutoScrollBar has not been attached to the element
                // its not an necessarily and error

                return null;
            }
            else if (!options || typeof options === 'object') {

                // Note: a jquery query select can refer to any number of html elements
                // return is for chainability, dont have to return anything

                return this.each(function (index, o) {

                    var x = Object.create(mjAutoScrollBar);

                    x._init(options, o);

                    // attach object instance to this html element

                    $.data(o, 'mj-auto-scrollbar-data', x);
                });
            }
            else {

                // method does not exist

                if (window.console) {
                    try { console.log("Method '" + options + "' does not exist in mjAutoScrollBar"); } catch (e) { }
                }
            }
        };
    })(jQuery);     // pass jQuery as an argument to the immiediatly executed javascript function so that $ always refers to jquery

});


