$(document).ready(function() {

// reference:
    // http://learn.jquery.com/plugins/basic-plugin-creation/

/*
    parameters:
   
    items: [],                  array of item obects
    type: "text",               text, checkbox, radiobutton. 
    multi_select: false,        if true can select multiple items when type set to text
    component_order: ["button", "image", "text"]
    max_text_width: null,           for elispses or positioning buttons and images on the right specify a text width
    itemRender: null,           custom render function
    dragdrop: false,
    enable_hover: true,
    horizontal: false,
    wrap_text: false,
    virtual_mode: false,
    page_size: 15                if virtual_mode is true we need this

    stack_components:            true|false default: false
   
    Properties common to all controls
   
    width: 'auto',
    height: 'auto',
    disabled: false,
    theme: null
   
    Data item structure:
   
    id: string
    text:                       can be a function
    selected: true,false,1,0    (only used if type is not checkbox or radiobutton)
    checked: 0,1,2          (0: not checked, 1: checked, 2: half ticked, only used if type is checkbox or radiobutton)
    disabled: true,false,1,0
    image: null
   
    TBD:
   
    allow function for item text field
    implement disabled
    implement themes
    _enableKeyEvents
    wrap_text: true/false (if true item can span many lines, if false ellipse text)
   
    */
    
(function ($) {

    var mjListBox = {

        _init: function (options, el) {

            this.widget_class = "mjListBox";

            this.el = el;
            this.$el = $(el);

            this._validateData(options);

            //var state = { original_data: [] };

            this.original_data = [];
            this.start = 0;

            // plugin have been applied previously, blow away any existing instance

            this.close();

            this._render();

            this._startListening();

            return this;
        },

        _renderItemButton: function(o)
        {
            // render the checkbox or radio button

            var str = "";

            if (!this.isCheckable())
                return str;

            var s = this.settings;

            var x = "";

            switch (o.checked) {
                case 1: x = " checked"; break;
                case 2: x = " half-ticked"; break;
            }

            switch (s.type) {
                case "checkbox":
                    str = "<div class='mj-cell mj-checkbox-cell'><div class='mj-checkbox-box" + x + "'><div class='mj-tick'></div></div></div>";
                    break;

                case "radiobutton":
                    str = "<div class='mj-cell mj-radio-cell'><div class='mj-radio" + x + "'><div class='mj-dot'></div></div></div>";
                    break;
            }

            return str;
        },

        _renderImage: function(o)
        {
            if (!o.image)
                return "";

            return "<div class='mj-cell mj-image-cell'><div class='mj-image'><img src='" + o.image + "' /></div></div>";
        },

        _renderText: function(o)
        {
            var s = this.settings;

            var str = "";

            if (s.itemRender) {

                // custom render, if itemRender is provided the text is replaced by the output of the itemRender
                
                str += "<div class='mj-cell'>" + s.itemRender(o) + "</div>";
            }
            else {

                var text = o.text;
                var title = o.text;

                if ($.isFunction(o.text)) {
                    text = o.text();
                    title = "";
                }

                if (title.indexOf("<") > -1)        // title cannot be html expression
                    title = "";

                if (s.wrap_text)
                    str += "<div class='mj-cell mj-text-cell'><div class='mj-text' title='" + title + "'>" + text + "</div></div>";
                else
                    str += "<div class='mj-cell mj-text-cell'><div class='mj-text mj-nowrap' title='" + title + "'>" + text + "</div></div>";
            }

            return str;
        },
        

        _renderItem: function (o, index) {

            var s = this.settings;

            var str = "<div class='mj-row' tabindex=" + 1 + " >";       // ths tabindex is so we can use the up,down arrow keys

            for (var i = 0; i < s.component_order.length; i++)
            {
                switch (s.component_order[i])
                {
                    case "button": str += this._renderItemButton(o); break;
                    case "image": str += this._renderImage(o); break;
                    case "text": str += this._renderText(o); break;
                }
            }

            str += "</div>";

            var item = $(str);      // convert to jquery selector

            if (o.disabled)
                item.addClass("mj-disabled");                   // can be disabled and selected

            // cant select items in a checkbox or radiobutton list

            if (o.selected && !this.isCheckable())
                item.addClass("mj-selected");

            // attach some data

            if (s.virtual_mode) {
                item.data("d", o);
            }
            else
            {
                var data_clone = mjcore.clone(o);

                item.data("d", data_clone);
            }

            return item;
        },

        _redraw: function (items, list_el) {

            var self = this;

            var s = this.settings;

            if (!items)
                items = s.items;

            if (!list_el)
                list_el = this.$el.find(".mj-table");

            // need this loop to be fast
            // index goes up by 100 in case we insert new items
            // dont want to rewrite all the tabindexes again            
            
            if (s.virtual_mode) {

                list_el.empty();

                for (var i = this.start; i < this.start + s.page_size; i++)
                {
                    var o = items[i];

                    list_el.append(self._renderItem(o, i * 100));
                }
            }
            else {
                $.each(items, function (index, o) { list_el.append(self._renderItem(o, index * 100)); });
            }
        },

        _createScrollBars: function () {

            var self = this;

            // dont create scrollbars for touch screens

            if (mjcore.isTouchScreen())
                return;

            var s = this.settings;

            if (!s.virtual_mode)
                return;

            this.$el.find(".mj-listbox").css("overflow", "hidden");
            //this.$el.find(".mj-grid .mj-grid-container").css("right", "0px");       // no need to leave space for scrollbar           

            // horizontal scrollbar

            var t = this.$el.find(".mj-listbox");
            var container_width = t.width();

            var w = this.$el.find(".mj-table").width();

            var bottom_offset = 0;
            var right_offset = 0;
            var e;

            if (w > container_width)
                bottom_offset = mjcore.MJ_HORIZONTAL_SCROLLBAR_HEIGHT;

            if (s.items.length > s.page_size)
                right_offset = mjcore.MJ_VERTICAL_SCROLLBAR_WIDTH;

            if (bottom_offset > 0) {

                // create horizontal scrollbar

                e = this.$el.find(".mj-listbox-horizontal-scrollbar");
                e.css({ right: right_offset + "px", height: mjcore.MJ_HORIZONTAL_SCROLLBAR_HEIGHT });

                if (right_offset > 0)
                    e.mjScrollBar({ min: 0, max: w - container_width + mjcore.MJ_VERTICAL_SCROLLBAR_WIDTH, orientation: "horizontal", page_size: s.page_size });
                else
                    e.mjScrollBar({ min: 0, max: w - container_width, orientation: "horizontal", page_size: s.page_size });

                e.on("valueChanged", function (e, n) {

                    self.$el.find(".mj-cell").css("left", -n);
                });
            }
            else {
                // remove horizontal scrollbar

                var e = this.$el.find(".mj-listbox-horizontal-scrollbar .mj-scrollbar");

                if (e.length)
                    this.$el.find(".mj-listbox-horizontal-scrollbar").mjScrollBar("close");
            }

            if (right_offset > 0) {
                // create vertical scrollbar
                // if the number of items changes we need to update the scrollbar

                e = this.$el.find(".mj-listbox-vertical-scrollbar");
                e.css({ bottom: bottom_offset + "px", width: mjcore.MJ_VERTICAL_SCROLLBAR_WIDTH });

                e.mjScrollBar({ min: 0, max: s.items.length - s.page_size, page_size: s.page_size });
                e.on("valueChanged", function (e, n) { self.scroll(n); });
            }
            else {
                // remove vertical scrollbar

                e = this.$el.find(".mj-listbox-vertical-scrollbar .mj-scrollbar");

                if (e.length)
                    this.$el.find(".mj-listbox-vertical-scrollbar").mjScrollBar("close");
            }

            //t.css({ position: "absolute", left: 0, right: right_offset + "px", top: 0, bottom: bottom_offset + "px", overflow: "hidden" });

            //}
            //else {
            //    this.$el.find(".mj-grid").css("overflow", "auto");
            //    this.$el.find(".mj-grid .mj-grid-container").css("right", "0px");       // no need to leave space for scrollbar
            //}
        },

        _render: function () {

            var self = this;

            var s = this.settings;

            var widget = $("<div>", { 'class': 'mj-widget mj-listbox' });

            var list_el = $("<div>", { 'class': 'mj-table' });

            if (s.horizontal)
                list_el.addClass("mj-horizontal");

            widget.append(list_el);

            this._redraw(s.items, list_el);

            this.$el.html(widget);

            if (s.virtual_mode) {

                var vertical_scrollbar = $("<div>", { 'class': 'mj-listbox-vertical-scrollbar' });
                var horizontal_scrollbar = $("<div>", { 'class': 'mj-listbox-horizontal-scrollbar' });

                widget.append(vertical_scrollbar);

                widget.append(horizontal_scrollbar);

                this._createScrollBars();
            }

            if (s.max_text_width)
                this.$el.find(".mj-text").css({ width: s.max_text_width });

            if (!mjcore.isEmpty(s.width) && s.width != "auto")
                this.$el.find(".mj-widget").css("width", s.width);

            if (!mjcore.isEmpty(s.height) && s.height != "auto")
                this.$el.find(".mj-widget").css("height", s.height);

            this.saveState();        // save state

            return this;
        },

        _validateItem: function(o)
        {
            var default_item = {
                id: null,
                text: "",
                image: null,
                selected: false,
                checked: 0,
                disabled: false
            };

            var x = $.extend({}, default_item, o);  // o overrides default

            $.extend(o, x);

            // we need an id for every item

            if ( mjcore.isEmpty(o.id) )
                o.id = mjcore.generateId();

            if (this.isCheckable()) {

                switch (String(o.checked)) {

                    case "false": o.checked = 0; break;
                    case "true": o.checked = 1; break;
                    case "0": o.checked = 0; break;
                    case "1": o.checked = 1; break;
                    case "2": o.checked = 2; break;
                        break;

                    default:
                        o.checked = 0;
                        break;
                }

                o.selected = null;
            }
            else
            {
                switch (String(o.selected)) {

                    case "false": o.selected = false; break;
                    case "true": o.selected = true; break;
                    case "0": o.selected = false; break;
                    case "1": o.selected = true; break;
                    
                    default:
                        o.selected = false;
                }

                o.checked = null;
            }

            switch (String(o.disabled)) {

                case "false": o.disabled = false; break;
                case "true": o.disabled = true; break;
                case "0": o.disabled = false; break;
                case "1": o.disabled = true; break;              

                default:
                    o.disabled = false;
            }
        },

        _validateData: function (options) {

            var default_options = {
                items: [],                  // array of item obects
                type: "text",               // text, checkbox, radiobutton. 
                multi_select: false,        // if true can select multiple items when type set to text
                component_order: ["button", "image", "text"],
                max_text_width: null,           // for elispses or positioning buttons and images on the right specify a text width
                itemRender: null,           // custom render function
                dragdrop: false,
                enable_hover: true,
                horizontal: false,
                wrap_text: false,
                virtual_mode: false,
                page_size: 15,              // only used is virtual_mode is true
                stack_components: false,    // true|false default: false

                // properties common to all controls

                width: 'auto',
                height: 'auto',
                disabled: false,
                theme: null
            };

            this.settings = $.extend({}, default_options, options);  // options overrides default

            var self = this;

            var map = {};

            $.each(this.settings.items, function (index, o) {

                self._validateItem(o);

                if (map[o.id])
                    mjcore.mjError("mjListBox Error: duplicate id: " + o.id + " found in data. Ids must be unique.");

                map[o.id] = o.id;
            });
        },

        _startListening: function () {

            var self = this;
            var s = this.settings;

            this._stopListening();

            if (s.enable_hover) {

                this.$el.find(".mj-row").hover(
                  function () {
                      $(this).addClass("mj-hover");
                  }, function () {
                      $(this).removeClass("mj-hover");
                  }
                );
            }

            if (s.virtual_mode && mjcore.isTouchScreen()) {

                // on touch screens enable touch scrolling

                //this.el.addEventListener("touchstart", function (e) { self._touchstart(e, self); }, false);
                //this.el.addEventListener("touchmove", function (e) { self._touchmove(e, self); }, false);
                //this.el.addEventListener("touchstart", function (e) { self._touchend(e, self); }, false);

                this.$el.on('touchstart', this, this._touchstart);
                this.$el.on('touchmove', this, this._touchmove);
                this.$el.on('touchend', this, this._touchend);
            }
                
            if (!mjcore.isTouchScreen())
            {
                // chrome, safari: mousewheel
                // firefox: DOMMouseScroll
                // IE: wheel

                this.$el.on('mousewheel DOMMouseScroll wheel', ".mj-row", function (e) {

                    e.preventDefault();

                    var n = self.start;

                    if (e.originalEvent.wheelDelta > 0)
                        n--;
                    else
                        n++;

                    if (n >= 0 && n < s.items.length) {

                        self.scroll(n);
                        e = self.$el.find(".mj-listbox-vertical-scrollbar");
                        e.mjScrollBar("set", n);
                    }
                });                
            }

            this.$el.on("click", ".mj-image", function (e) {

                e.preventDefault();
                //e.stopPropagation();

                var x = $(e.currentTarget).closest(".mj-row");

                // x.data() will get data for the whole element including the action

                self.$el.trigger("imageClick", x.data());
            });

            this.$el.on("click", ".mj-row", function (e) {

                e.preventDefault();
                e.stopPropagation();

                var ee = $(e.currentTarget);

                var o = ee.data("d");

                if (!o) {
                    mjcore.mjError("mjListBox: item click: item data not found");
                    return;
                }

                if (o.disabled)         // cant click on disabled item
                    return;

                switch (s.type)
                {
                    case "checkbox":
                    case "radiobutton":

                        self._toggle(ee);
                        self.$el.trigger("checkChange", o);
                        break;

                    default:

                        self._select(ee);
                        self.$el.trigger("selected", o);
                        break;
                }
            });

            if (s.dragdrop) {

                this.$el.find(".mj-listbox .mj-table").sortable({

                    update: function (event, ui) {

                        // refill the data array

                        s.items = [];

                        $.each(self.$el.find(".mj-row"), function (index, o) {

                            var x = $(o).data("d");
                            s.items.push(x);
                        });

                        self.$el.trigger("dragend");
                    }
                });
            }

            this._enableKeyEvents();
        },

        _touchstart: function(evt)
        {
            evt.preventDefault();       // need this otherwise the whole page scrolls
            //evt.stopPropagation();

            var self = evt.data;

            var e = evt.originalEvent;
            var y = 0;

            if (e.touches)
                y = e.touches[0].pageY;
            else
                y = e.pageY;

            self.touch_y = y;

            self.touch_busy = false;
        },

        _touchmove: function(evt)
        {
            //var self = this;
            var self = evt.data;

            //if (self.touch_busy == false)
            //    evt.preventDefault();

            //evt.stopPropagation();

            //console.log("touchmove");

            var e = evt.originalEvent;

            var y = 0;

            if (e.touches)
                y = e.touches[0].pageY;
            else
                y = e.pageY;

            if (y == self.touch_y)
                return;         // no change

            if (self.touch_busy)      // still drawing
                return;

            var s = self.settings;

            var h = self.$el.height();

            var delta = (y - self.touch_y);          // change

            var t = delta / h;         // % change can be -ve

            self.touch_y = y;

            var n = s.items.length;			// number of rows 

            y = self.start + Math.floor((n - s.page_size) * t);

            if (y < 0 || y >= n)
                return;

            self.touch_busy = true;

            //window.setTimeout(function () {

            var str = self.scroll(y);

            //}, 0);

            self.touch_busy = false;
        },

        _touchend: function(evt)
        {
            //evt.preventDefault();

            var self = evt.data;

            self.touch_busy = false;
        },

        _enableKeyEvents: function () {

            var self = this;

            // assumes list is made of list items

            this.$el.on("keydown", "li", function (e) {                

                var key = e.keyCode;
                var target = $(e.currentTarget);

                //self.$el.find("li").removeClass("mj-hover");

                var KEY_SPACE = 32;
                var KEY_UP = 38;
                var KEY_DOWN = 40;

                switch (key) {

                    case KEY_SPACE:

                        e.preventDefault();

                        var o = $(target).data("d");

                        if (o)
                            self.toggle(o.id);
                        
                        break;

                    case KEY_UP: // arrow up

                        e.preventDefault();

                        setTimeout(function () { target.prev().focus(); }, 0);     // jquery .focus() not working on firefox

                        var ee = $(target.prev());

                        var o = $(target.prev()).data("d");

                        if (o) {

                            if (!self.isCheckable()) {
                                //self.deselectAll();
                                self._select(ee);
                            }

                            self.$el.trigger("arrowIn", o);
                        }

                        break;

                    case KEY_DOWN: // arrow down

                        e.preventDefault();

                        setTimeout(function () { target.next().focus(); }, 0);      // jquery .focus() not working on firefox

                        var ee = $(target.next());

                        var o = $(target.next()).data("d");

                        if (o) {

                            if (!self.isCheckable()) {
                                //self.deselectAll();
                                self._select(ee);
                            }

                            self.$el.trigger("arrowIn", o);
                        }

                        break;
                }
            });

            //this.$el.on("focusin", "li", function (e) {

            //});

            this.$el.on("focusout", "li", function (e) {

                //$(e.currentTarget).removeClass("mj-hover");
            });

            // select the 1st selected or checked

            var n = -1;

            var items = this.toArray();

            var n = mjcore.findIndex(items, function(o) { return (o.selected || o.checked == 1); });

            //for (var i = 0, len = items.length; i < len; i++)
            //{
            //    var o = items[i];

            //    if (o.selected || o.checked == 1)
            //    {
            //        n = i;
            //        break;
            //    }
            //}

            if (n != -1) {

                if (this.$el.find("li:eq(" + n + ")")) {
                    setTimeout(function () { self.$el.find("li:eq(" + n + ")").focus(); }, 0);      // jquery .focus() not working on firefox
                }
            }
        },

        _stopListening: function()
        {
            this.$el.off();
        },

        //-----------------------------------------------------------------------------------
        // public methods

        getElement: function (id) {

            var items = this.$el.find(".mj-row");

            var filtered = items.filter(function () { return $(this).data("d").id == id; });

            if (filtered.length == 0)
                return null;

            return filtered;
        },

        getElementAt: function(n)
        {
            var e = this.$el.find(".mj-row:eq(" + n + ")").first();

            if (e && e.length > 0)
                return e;

            return null;
        },

        isCheckable: function ()
        {
            return (this.settings.type == "checkbox" || this.settings.type == "radiobutton");       
        },

        getItem: function (id) {

            // get the data for an iten

            var s = this.settings;

            if (s.virtual_mode) {

                return mjcore.find(s.items, function (o) { return o.id == id; });
            }
            else {
                var e = this.getElement(id);

                if (!e)
                    return null;

                return e.data("d");
            }
        },

        getItems: function () {

            return this.toArray();
        },

        toArray: function () {

            var s = this.settings;

            if (s.virtual_mode) {
                return s.items;
            }
            else {

                var items = this.$el.find(".mj-row");

                var arr = [];

                $.each(items, function (index, e) { arr.push($(e).data("d")); });

                return arr;
            }
        },

        getItemAt: function (n) {

            var s = this.settings;

            if (s.virtual_mode) {

                if (n < 0 || n >= s.items.length)
                    return null;

                return s.items[n];
            }
            else {

                var items = this.$el.find(".mj-row");

                if (!items || items.length == 0)
                    return null;

                if (n < 0 || n >= items.length)
                    return null;

                return $(items[n]).data("d");
            }
        },

        search: function(search_function)
        {
            var arr = [];

            // use user supplied function which returns true or false to test each object

            if (!search_function)
                return res;

            var items = this.toArray();
           
            $.each(items, function (index, o) {

                if (search_function(o))
                    arr.push(o);
            });

            return arr;
        },

        //-------------------------------------------------------------------------
        // checkbox and radiobutton functions

        _toggle: function(e)
        {
            if (!e)
                return;

            var s = this.settings;

            var o = e.data("d");

            if (this.isCheckable()) {
                if (s.type == "radiobutton") {

                    this._check(e);     // cant turn a radiobutton off
                }
                else {
                    if (o.checked == 1)
                        this._uncheck(e);
                    else
                        this._check(e);
                }
            }
            else {
                if (o.selected)
                    this._deselect(e);
                else
                    this._select(e);
            }
        },

        toggle: function(id)
        {
            var e = this.getElement(id);

            if (!e)
                return;

            this._toggle(e);
        },

        _check: function(e)
        {
            if (!e)
                return;

            if (!this.isCheckable())
                return;

            var s = this.settings;

            //if (s.virtual_mode) {

            //    e.data("d").checked = 1;
            //    this._redraw();
            //}
            //else {
                switch (s.type) {
                    case "checkbox":
                        e.data("d").checked = 1;
                        e.find(".mj-checkbox-box").addClass("checked").removeClass("half-ticked");
                        break;

                    case "radiobutton":

                        this.uncheckAll();      // radio buttons are mutually exclusive
                        e.data("d").checked = 1;
                        e.find(".mj-radio").addClass("checked");
                        break;
                }
            //}
        },

        check: function (id) {

            if (!this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                var o = mjcore.find(s.items, function (o) { return o.id == id; });

                if (o)
                    o.checked = 1;

                this._redraw();
            }
            else {

                var e = this.getElement(id);

                this._check(e);
            }
        },

        checkAt: function(n)
        {
            if (!this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                if (n < 0 || n >= s.items.length)
                    return;

                s.items[n].checked = 1;
                this._redraw();
            }
            else {

                var e = this.getElementAt(n);

                if (!e)
                    return;

                this._check(e);
            }
        },

        _uncheck: function (e) {

            if (!e)
                return;

            e.data("d").checked = 0;
            e.find(".mj-checkbox-box").removeClass("checked").removeClass("half-ticked");
            e.find(".mj-radio").removeClass("checked");
        },

        uncheck: function (id) {

            if (!this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                var o = mjcore.find(s.items, function (o) { return o.id == id; });

                if (o)
                {
                    o.checked = 0;
                    this._redraw();
                }
            }
            else {
                var e = this.getElement(id);
                this._uncheck(e);
            }
        },

        unchecktAt: function(n)
        {
            if (!this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                if (n < 0 || n >= s.items.length)
                    return;

                s.items[n].checked = 0;
                this._redraw();
            }
            else {
                var e = this.getElementAt(n);
                this._uncheck(e);
            }
        },

        getChecked: function () {

            var arr = [];

            var s = this.settings;

            if (s.virtual_mode) {

                $.each(s.items, function (index, o) {

                    if (o.checked == 1)
                    {
                        o.index = index;
                        arr.push(o);
                    }                        
                });
            }
            else {

                var items = this.$el.find(".mj-row");

                $.each(items, function (index, e) {

                    var o = $(e).data("d");

                    if (o.checked == 1) {
                        o.index = index;
                        arr.push(o);
                    }
                });
            }

            return arr;
        },

        isChecked: function (id) {

            if (!this.isCheckable())
                return false;

            var s = this.settings;

            if (s.virtual_mode) {

                var o = mjcore.find(s.items, function (o) { return o.id == id; });

                if (!o)
                    return false;

                return o.checked == 1;
            }
            else {

                var e = this.getElement(id);

                if (!e)
                    return false;

                return e.data("d").checked == 1;
            }
        },

        checkAll: function () {

            if (!this.isCheckable())
                return;

            var s = this.settings;

            if (s.type != "checkbox")
                return;

            if (s.virtual_mode) {

                $.each(s.items, function (index, o) { o.checked = 1; });
                this._redraw();
            }
            else {

                var items = this.$el.find(".mj-row");

                $.each(items, function (index, e) { $(e).data("d").checked = 1; });

                this.$el.find(".mj-row .mj-checkbox-box").addClass("checked").removeClass("half-ticked");
                this.$el.find(".mj-row .mj-radio").addClass("checked");
            }
        },

        uncheckAll: function () {

            if (!this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                $.each(s.items, function (index, o) { o.checked = 0; });
                this._redraw();
            }
            else {

                var items = this.$el.find(".mj-row");

                $.each(items, function (index, e) { $(e).data("d").checked = 0; });

                this.$el.find(".mj-row .mj-checkbox-box").removeClass("checked").removeClass("half-ticked");
                this.$el.find(".mj-row .mj-radio").removeClass("checked");
            }
        },

        halfTick: function (id) {

            var s = this.settings;

            if (s.type != "checkbox")
                return;

            if (s.virtual_mode) {

                var o = mjcore.find(s.items, function (o) { return o.id == id; });

                if (!o)
                    return false;

                o.checked = 2;
                this._redraw();
            }
            else {

                var e = this.getElement(id);

                if (!e)
                    return;

                e.data("d").checked = 2;
                e.find(".mj-checkbox-box").removeClass("checked").addClass("half-ticked");
            }
        },

        halfTickAll: function () {

            var s = this.settings;

            if (s.type != "checkbox")
                return;

            if (s.virtual_mode) {

                $.each(s.items, function (index, o) { o.checked = 2; });
                this._redraw();
            }
            else {

                this.$el.find(".mj-row .mj-checkbox-box").removeClass("checked").addClass("half-ticked");

                var items = this.$el.find(".mj-row");

                $.each(items, function (index, e) { $(e).data("d").checked = 2; });
            }
        },

        uncheckHalfTicked: function () {

            var s = this.settings;

            if (s.type != "checkbox")
                return;

            // dont call halfTick for every item, too slow

            // deselect all items which are half ticked

            this.$el.find(".mj-row .mj-checkbox-box.half-ticked").removeClass("half-ticked");

            var items = this.$el.find(".mj-row");

            $.each(items, function (index, e) {

                var o = $(e).data("d");

                if (o.checked == 2)
                    o.checked = 0;
            });
        },

        //----------------------------------------------------------------------------------------------
        // enable disable functions

        disable: function (id) {

            var s = this.settings;

            if (s.virtual_mode) {

                var o = mjcore.find(s.items, function (o) { return o.id == id; });

                if (!o)
                    return false;

                o.disabled = true;
                this._redraw();
            }
            else {

                var e = this.getElement(id);

                if (!e)
                    return;

                e.data("d").disabled = true;
                e.addClass("mj-disabled");
            }
        },

        disableAt: function(n)
        {
            var s = this.settings;

            if (s.virtual_mode) {

                if (n < 0 || n >= s.items.length)
                    return false;

                s.items[n].disabled = true;
                this._redraw();
            }
            else {

                var e = this.getElementAt(n);

                if (!e)
                    return;

                e.data("d").disabled = true;
                e.addClass("mj-disabled");
            }
        },

        disableAll: function()
        {
            var s = this.settings;

            if (s.virtual_mode) {

                $.each(s.items, function(index, o) { o.disabled = true; });
                this._redraw();
            }
            else {
                this.$el.find(".mj-row").addClass("mj-disabled");

                var items = this.$el.find(".mj-row");

                $.each(items, function (index, e) { o = $(e).data("d").disabled = true; });
            }
        },

        enable: function (id) {

            var s = this.settings;

            if (s.virtual_mode) {

                var o = mjcore.find(s.items, function (o) { return o.id == id; });

                if (!o)
                    return false;

                o.disabled = false;
                this._redraw();
            }
            else {

                var e = this.getElement(id);

                if (!e)
                    return;

                e.data("d").disabled = false;
                e.removeClass("mj-disabled");
            }
        },

        enableAt: function (n) {

            var s = this.settings;

            if (s.virtual_mode) {

                if (n < 0 || n >= s.items.length)
                    return false;

                s.items[n].disabled = false;
                this._redraw();
            }
            else {

                var e = this.getElementAt(n);

                if (!e)
                    return false;

                e.data("d").disabled = false;
                e.removeClass("mj-disabled");
            }

            return true;
        },

        enableAll: function () {

            var s = this.settings;

            if (s.virtual_mode) {

                $.each(s.items, function(index, o) { o.disabled = false; });

                this._redraw();
            }
            else {

                this.$el.find(".mj-row").removeClass("mj-disabled");

                var items = this.$el.find(".mj-row");

                $.each(items, function (index, e) { $(e).data("d").disabled = false; });
            }
        },

        //-------------------------------------------------------------------------
        // select functions

        selectAll: function () {

            if (this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                $.each(s.items, function (index, o) { o.selected = true; });
                this._redraw();
            }
            else {

                // dont call select for every item, too slow

                var items = this.$el.find(".mj-row");

                $.each(items, function (index, e) { $(e).data("d").selected = true; });

                this.$el.find(".mj-row").addClass("mj-selected");
            }
        },

        deselectAll: function () {

            if (this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                $.each(s.items, function (index, o) { o.selected = false; });
                this._redraw();
            }
            else {

                // dont call deselect for every item, too slow

                var items = this.$el.find(".mj-row");

                $.each(items, function (index, e) { $(e).data("d").selected = false; });

                this.$el.find(".mj-row").removeClass("mj-selected");
            }
        },

        getSelected: function () {

            var arr = [];

            var s = this.settings;

            if (s.virtual_mode) {

                $.each(s.items, function (index, o) {

                    if (o.selected)
                        arr.push(o);
                });
            }
            else {

                var items = this.$el.find(".mj-row");

                $.each(items, function (index, e) {

                    var o = $(e).data("d");

                    if (o.selected) {
                        o.index = index;
                        arr.push(o);
                    }
                });
            }

            return arr;
        },

        isSelected: function (id) {

            var s = this.settings;

            if (s.virtual_mode) {

                var o = mjcore.find(s.items, function (o) { return o.id == id; });

                if (!o)
                    return false;

                return o.selected;
            }
            else {

                var e = this.getElement(id);

                if (!e)
                    return false;

                return e.data("d").selected;
            }
        },

        _select: function (e) {

            if (!e)
                return;

            if (!this.settings.multi_select)
                this.deselectAll();

            e.data("d").selected = true;
            e.addClass("mj-selected");
        },

        select: function(id)
        {
            if (this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                var o = mjcore.find(s.items, function (o) { return o.id == id; });

                if (!o)
                    return false;

                o.selected = true;
                this._redraw();
            }
            else {

                var e = this.getElement(id);

                if (!e)
                    return false;

                e.data("d").selected = true;
                e.addClass("mj-selected");
            }

            return true;
        },

        selectAt: function (n) {

            if (this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                if (n < 0 || n >= s.items.length)
                    return false;

                s.items[n].selected = true;
                this._redraw();
            }
            else {

                var e = this.getElementAt(n);

                if (!e)
                    return false;

                e.data("d").selected = true;
                e.addClass("mj-selected");
            }

            return true;
        },

        _deselect: function (e) {

            if (this.isCheckable())
                return;

            if (!e)
                return;

            $(e).data("d").selected = false;
            e.removeClass("mj-selected");
        },

        deselect: function (id) {

            if (this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                var o = mjcore.find(s.items, function (o) { return o.id == id; });

                if (!o)
                    return false;
                
                o.selected = false;
                this._redraw();
            }
            else {

                var e = this.getElement(id);

                if (!e)
                    return false;

                $(e).data("d").selected = false;
                e.removeClass("mj-selected");
            }

            return true;
        },

        deselectAt: function (n) {

            if (this.isCheckable())
                return;

            var s = this.settings;

            if (s.virtual_mode) {

                if (n < 0 || n >= s.items.length)
                    return false;

                s.items[n].selected = false;
                this._redraw();
            }
            else {

                var e = this.getElementAt(n);

                if (!e)
                    return false;

                $(e).data("d").selected = false;
                e.removeClass("mj-selected");
            }

            return true;
        },

        //--------------------------------------------------------------------------------
        // add, insert, update, remove functions

        add: function(data)
        {
            this._validateItem(data);

            var s = this.settings;

            if (s.virtual_mode) {

                s.items.push(data);
                this._redraw();
            }
            else {

                var str = this._renderItem(data);

                this.$el.find(".mj-table").append(str);
            }
        },

        insert: function(id, data)
        {
            var s = this.settings;

            if (s.virtual_mode) {

                var i = mjcore.findIndex(s.items, function (o) { return o.id == id; });

                if (i == -1)
                    return false;

                s.items.splice(i, 0, data);

                this._redraw();
            }
            else {

                var e = this.getElement(id);

                if (!e)
                    return false;

                this._validateItem(data);
                e.append(this._renderItem(data));
            }

            return true;
        },
        
        insertAt: function(n, data)
        {
            var s = this.settings;

            if (s.virtual_mode) {

                if (n < 0 || n >= s.items.length)
                    return false;

                s.items.splice(n, 0, data); 

                this._redraw();
            }
            else {
                var e = this.getElementAt(n);

                if (!e)
                    return false;

                this._validateItem(data);
                e.append(this._renderItem(data));
            }

            return true;
        },

        update: function(id, data)
        {
            var s = this.settings;

            if (s.virtual_mode) {

                var i = mjcore.findIndex(s.items, function (o) { return o.id == id; });                 

                if (i == -1)
                    return false;

                s.items[i] = data;
                this._redraw();
            }
            else {
                var e = this.getElement(id);

                if (!e)
                    return false;

                this._validateItem(data);

                var o = e.data("d");

                $.removeData(e, 'd');

                //this._validateItem(data);      // dont validateItem, we may omit properties eg change text only

                o = $.extend(o, data);          // data overrides o

                var str = this._renderItem(o);
                e.html(str);
            }

            return true;
        },

        updateAt: function(n, data)
        {
            var s = this.settings;

            if (s.virtual_mode) {

                if (n < 0 || n >= s.items.length)
                    return false;

                var o = s.items[n];

                this.update(o.id);
            }
            else {

                var e = this.getElementAt(n);

                if (!e)
                    return;

                var o = e.data("d");

                if (o)
                    this.update(o.id);
            }
        },

        remove: function(id)
        {
            var s = this.settings;

            if (s.virtual_mode) {

                var i = mjcore.findIndex(s.items, function (o) { return o.id == id; });

                if (i == -1)
                    return false;

                s.items.splice(i, 1);
                this._redraw();
            }
            else {

                var e = this.getElement(id);

                if (!e)
                    return false;

                e.remove();        // remove the li
            }

            return true;
        },

        removeAt: function(n)
        {
            var s = this.settings;

            if (s.virtual_mode) {

                if (n < 0 || n >= s.items.length)
                    return false;

                s.items.splice(n, 1);
                this._redraw();
            }
            else {
                var e = this.getElementAt(n);

                if (!e)
                    return false;

                e.remove();
            }

            return true;
        },

        //-----------------------------------------------------------------------------------------
        // misc functions

        saveState: function () {

            // save the state of the list

            var self = this;

            this.original_data = [];

            var items = this.toArray();

            $.each(items, function (index, o) {
                self.original_data.push({ checked: o.checked, selected: o.selected });
            });
        },

        hasChanged: function () {

            var items = this.toArray();

            for (var i = 0, len1 = items.length, len2 = this.original_data.length; i < len1 && i < len2; i++) {

                var a = items[i];
                var b = this.original_data[i];

                // if new state is undefined dont count it as a change

                if (a.checked != b.checked || a.selected != b.selected)
                    return true;
            }

            return false;
        },

        sort: function (callback, direction) {

            var self = this;

            var items = this.toArray();

            if (callback) {

                items.sort(function (a, b) { return callback(a, b); });
            }
            else {

                // no callback function provided, compare text fields

                items.sort(function (a, b) {

                    if ($.isFunction(a.text) || $.isFunction(b.text))
                        return 0;

                    if (!direction || direction.toLowerCase() == "asc")
                    {
                        if (a.text.toLowerCase() > b.text.toLowerCase())
                            return 1;

                        if (a.text.toLowerCase() < b.text.toLowerCase())
                            return -1;
                    }
                    else
                    {
                        if (a.text.toLowerCase() < b.text.toLowerCase())
                            return 1;

                        if (a.text.toLowerCase() > b.text.toLowerCase())
                            return -1;
                    }

                    return 0;
                });
            }

            var e = this.$el.find(".mj-table");
            e.empty();

            this._redraw(items, e);
        },

        clear: function()
        {
            this.$el.find(".mj-row").empty();

            this.settings.items = [];
        },

        close: function () {

            // dont clear the data
            // important to turn off events

            this._stopListening();

            // we may still want to get the data after the listbox has closed so dont remove the data

            $.removeData(this.el, 'mj-listbox-data');
           
            this.$el.html("");            
        },

        scroll: function (n) {

            // for virtual mode

            var s = this.settings;

            if (!s.virtual_mode)
                return;

            this.start = n;

            if (this.start < 0)
                this.start = 0;

            if (this.start > s.items.length)
                this.start = s.items.length - 1;

            this._redraw();
        },

        scrollTo: function (n, animate) {

            var s = this.settings;

            if (s.virtual_mode) {

                this.start = n;
                this._redraw();
            }
            else {
                var e = this.getElement(n);

                if (!e)
                    return;

                // need to use position rather than offset

                var pos = e.position().top;

                if (animate == false)
                    this.$el.find(".mj-row").css({ scrollTop: pos });
                else
                    this.$el.find(".mj-row").animate({ scrollTop: pos }, 300);
            }
        }
    }

    $.fn.mjListBox = function (options) {
      
        // check that element exists using this.length

        if (!this.length) {

            mjcore.mjError("mjListBox: the html element to attach to '" + this.selector + "' does not exist.");
            return null;
        }

        // within a plugin use this not $(this) to refer to the element to attach to
        // this refers to the element we are attaching to
        // needs to return this for chainability

        if (mjListBox[options]) {

            // options is the name of a method in mjListBox

            var o = $(this).data('mj-listbox-data');

            // cant call slice directly on arguments

            if (o)
                return o[options].apply(o, Array.prototype.slice.call(arguments, 1));

            // if o is not found then the mjListBox has not been attached to the element
            // its not an necessarily and error

            return null;
        }
        else if (!options || typeof options === 'object') {

            // Note: a jquery query select can refer to any number of html elements
            // return is for chainability, dont have to return anything

            return this.each(function (index, o) {

                // remove any previous data

                //$.removeData(this, 'mj-listbox-instance');

                var x = Object.create(mjListBox);
                   
                x._init(options, o);

                // attach object instance to this html element

                $.data(o, 'mj-listbox-data', x);
            });
        }
        else {

            // method does not exist

            mjcore.mjError("mjListBox: Method '" + options + "' does not exist in mjListBox");
        }
    };
})(jQuery);     // pass jQuery as an argument to the immiediatly executed javascript function so that $ always refers to jquery

}); // document.ready
