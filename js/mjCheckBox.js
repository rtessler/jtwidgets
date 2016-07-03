$(document).ready(function () {

    (function ($) {

        var mjCheckBox = {

            _init: function (options, el) {

                this.widget_class = "mjCheckBox";

                this.el = el;
                this.$el = $(el);

                // plugin have been applied previously
                // blow away any existing instance

                this.close();

                this._validateData(options);

                this._render();
                this._startListening();

                return this;
            },

            _render: function () {

                var s = this.settings;

                s.original_value = s.checked;

                var class_str = "mj-widget mj-checkbox ";

                if (s.disabled == 1)
                    class_str += " mj-disabled";

                var e = $("<div>", { 'class': class_str });

                e.data("data", s); // attach some data

                class_str = "mj-checkbox-box";

                switch (s.checked) {
                    case 1: class_str += " checked"; break;
                    case 2: class_str += " half-ticked"; break;
                    default: break;
                }

                var str = "<div class='" + class_str + "'><div class='mj-tick'></div></div>";

                if (s.image)
                    str += "<img class='mj-image' src='" + s.image + "' />";

                str += "<div class='mj-text'>" + s.text + "</div>";

                e.html(str);

                this.$el.html(e);

                return this;
            },

            _validateData: function(options)
            {
                var default_options = {
                    text: "select",
                    checked: 0,         // 0,1,2
                    image: null,
                    original_value: 0,
                    tristate: 0,         // 0 or 1
                    fade_duration: 0,

                    // common properties

                    width: 'auto',
                    height: 'auto',
                    disabled: false,
                    theme: null
                };

                this.settings = $.extend({}, default_options, options);

                var s = this.settings;

                if (s.checked == undefined || s.checked == null || s.checked == false || s.checked == "0")
                    s.checked = 0;

                if (s.checked == "1" || s.checked == true || s.checked == "true")
                    s.checked = 1;

                if (s.checked == "2")
                    s.checked = 2;
                
                s.original_value = s.checked;

                if (s.text == null || s.text == undefined)
                    s.text = "";

                if (s.disabled == undefined || s.disabled == null || s.disabled == false)
                    s.disabled = 0;

                if (s.disabled == "1" || s.disabled == true)
                    s.disabled = 1;

                if (s.tristate == undefined || s.tristate == null || s.tristate == false || s.tristate == "0")
                    s.tristate = 0;

                if (s.tristate == "1" || s.tristate == true)
                    s.tristate = 1;

                if (!mjcore.isNumber(s.fade_duration))
                    s.fade_duration = 0;
            },

            _startListening: function () {

                var self = this;

                this._stopListening();

                var s = this.settings;

                this.$el.on("click", ".mj-checkbox", function (e) {         

                    e.preventDefault();

                    var o = $(e.currentTarget).data("data");

                    if (o.disabled == 1)
                        return;

                    var tick = $(e.currentTarget);
                    var box = tick.find(".mj-checkbox-box");

                    if (o.tristate == 1) {

                        switch (o.checked) {
                            case 0:
                              
                                box.addClass("checked").removeClass("half-ticked");                                
                                o.checked = 1;
                                break;

                            case 1:

                                box.removeClass("checked").addClass("half-ticked");
                                o.checked = 2;
                                break;
                            case 2:
                                
                                box.removeClass("checked").removeClass("half-ticked");
                                o.checked = 0;
                                break;
                        }
                    }
                    else {

                        switch (o.checked) {
                            case 0:

                                if (s.fade_duration > 0) {
                                    box.addClass("checked").removeClass("half-ticked");
                                    tick.find(".mj-tick").fadeIn(s.fade_duration, function () { });
                                }
                                else
                                    box.addClass("checked").removeClass("half-ticked");
                                
                                o.checked = 1;
                                break;

                            case 1:

                                if (s.fade_duration > 0) 
                                    tick.find(".mj-tick").fadeOut(s.fade_duration, function () { box.removeClass("checked").removeClass("half-ticked"); });                                
                                else                                
                                    box.removeClass("checked").removeClass("half-ticked");
                                
                                o.checked = 0;
                                break;
                        }
                    }

                    self.$el.trigger("checkChange", o);
                });
            },

            _stopListening: function () {
                this.$el.off();
            },

            //-----------------------------------------------------------------------------------
            // public methods

            hasChanged: function () {

                return (this.settings.checked != this.settings.original_value);
            },

            check: function () {

                this.$el.find(".mj-checkbox-box").addClass("checked").removeClass("half-ticked");
                this.settings.checked = 1;
            },

            halfTick: function () {

                this.$el.find(".mj-checkbox-box").addClass("checked").addClass("half-ticked");
                this.settings.checked = 2;
            },

            uncheck: function () {

                this.$el.find(".mj-checkbox-box").removeClass("checked").removeClass("half-ticked");
                this.settings.checked = 0;
            },

            set: function(val)
            {
                switch (val)
                {
                    case 0: this.uncheck(); break;
                    case 1: this.check(); break;
                    case 2: this.halfTick(); break;
                }
            },

            enable: function () {

                this.$el.find(".mj-checkbox-box").removeClass("mj-disabled");
                this.settings.disabled = 0;
            },

            disable: function () {

                this.$el.find(".mj-checkbox-box").addClass("mj-disabled");
                this.settings.disabled = 1;
            },

            val: function () {

                return this.settings;
            },

            close: function () {

                // dont clear the data
                // important to turn off events

                this._stopListening();
                //this.$el.data(this, 'mj-checkbox-data', null);
                $.removeData(this.el, 'mj-checkbox-data');
                this.$el.html("");                
            }
        }

        $.fn.mjCheckBox = function (options) {
      
            // check that element exists using this.length

            if (!this.length) {

                mjcore.mjError("mjCheckBox: the html element to attach to '" + this.selector + "' does not exist.");               
                return null;
            }
                       
            if (mjCheckBox[options]) {

                // options is the name of a method in mjCheckBox

                var o = $(this).data('mj-checkbox-data');

                // cant call slice directly on arguments

                if (o)
                    return o[options].apply(o, Array.prototype.slice.call(arguments, 1));

                // if o is not found then the mjCheckBox has not been attached to the element
                // its not an necessarily and error

                return null;
            }
            else if (typeof options === 'object' || !options) {

                // Note: a jquery query select can refer to any number of html elements
                // return is for chainability, dont have to return anything

                return this.each(function (index, o) {

                    // remove any previous data

                    //$.removeData(this, 'mj-checkbox-instance');

                    var x = Object.create(mjCheckBox);

                    x._init(options, o);

                    // attach object instance to this html element

                    $.data(o, 'mj-checkbox-data', x);
                });
            }
            else {

                // method does not exist

                mjcore.mjError("Method '" + options + "' does not exist in mjCheckBox"); 
            }
        };
    })(jQuery);

});