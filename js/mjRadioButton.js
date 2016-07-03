$(document).ready(function () {

    (function ($) {

        var mjRadioButton = {

            _init: function (options, el) {

                this.widget_class = "mjRadioButton";

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

            _render: function () {

                this.settings.original_value = this.settings.checked;

                var class_string = "mj-radiobutton mj-widget";

                if (this.settings.disabled)
                    class_string += " mj-disabled";

                var e = $("<div>", { 'class': class_string });

                e.data("data", this.settings);

                var checked = (this.settings.checked == 1) ? " checked" : "";

                var str = "<div class='mj-radio" + checked + "'><div class='mj-dot'></div></div>";

                if (this.settings.image)
                    str += "<img class='mj-image ' src='" + this.settings.image + "' />";

                str += "<div class='mj-text '>" + this.settings.text + "</div>";

                e.html(str);

                this.$el.html(e);

                return this;
            },

            _startListening: function () {

                var self = this;

                this._stopListening();

                this.$el.on("click", ".mj-radiobutton", function (e) {

                    e.preventDefault();

                    var o = $(e.currentTarget).data("data");

                    if (o.disabled)
                        return;

                    if (o.checked == 1) {

                        self.$el.find(".mj-radio").removeClass("checked");
                        o.checked = 0;
                    }
                    else {

                        self.$el.find(".mj-radio").addClass("checked");
                        o.checked = 1;
                    }

                    self.$el.trigger("checkChange", o);
                });
            },

            _stopListening: function () {
                this.$el.off();
            },

            _validateData: function (options) {

                var default_options = {
                    id: 1,
                    text: "select",
                    checked: 0,
                    image: null,
                    data: null,
                    original_value: 0,

                    // common properties

                    width: 'auto',
                    height: 'auto',
                    disabled: false,
                    theme: null
                };

                this.settings = $.extend({}, default_options, options);

                var s = this.settings;

                if (s.checked == undefined || s.checked == null || s.checked == false || s.checked == "false" || s.checked == "0")
                    s.checked = 0;

                if (s.checked == "1" || s.checked == true || s.checked == "true")
                    s.checked = 1;

                if (mjcore.isEmpty(s.text))
                    s.text = "";

                if (mjcore.isEmpty(s.id))
                    s.id = s.text;

                if (s.disabled == undefined || s.disabled == null || s.disabled == false)
                    s.disabled = 0;

                if (s.disabled == "1" || s.disabled == true)
                    s.disabled = 1;
            },

            //-----------------------------------------------------------------------------------
            // public methods

            hasChanged: function () {

                return (this.settings.checked != this.settings.original_value);
            },

            check: function () {

                //if (this.settings.disabled)
                //    return;

                this.$el.find(".mj-radio").addClass("checked").removeClass("half-ticked");
                this.settings.checked = 1;
            },

            uncheck: function () {

                //if (this.settings.disabled)
                //    return;

                this.$el.find(".mj-radio").removeClass("checked").removeClass("half-ticked");
                this.settings.checked = 0;
            },

            set: function (val) {
                switch (val) {
                    case 0: this.uncheck(); break;
                    case 1: this.check(); break;
                }
            },

            enable: function () {

                this.$el.find(".mj-radiobutton").removeClass("mj-disabled");
                this.settings.disabled = false;
            },

            disable: function () {

                this.$el.find(".mj-radiobutton").addClass("mj-disabled");
                this.settings.disabled = true;
            },

            val: function () {

                return this.settings;
            },

            close: function () {

                // dont clear the data
                // important to turn off events

                this._stopListening();
                //this.$el.data(this, 'mj-radiobutton-data', null);
                $.removeData(this.el, 'mj-radiobutton-data');
                this.$el.html("");
            }
        }

        $.fn.mjRadioButton = function (options) {

            // options is empty or an object
            // within a plugin use this not $(this)
            // check that element exists using this.length

            if (!this.length) {

                mjcore.mjError("mjRadioButton the html element to attach to '" + this.selector + "' does not exist");
                return null;
            }

            function createMRadiobutton(name) {
                function F() { };
                F.prototype = mjRadioButton;
                var f = new F;
                return f;
            }

            if (mjRadioButton[options]) {

                // options is the name of a method in Radiobutton

                var o = $(this).data('mj-radiobutton-data');

                if (o) {

                    return o[options].apply(o, Array.prototype.slice.call(arguments, 1));

                }
            }
            else if (typeof options === 'object' || !options) {

                // return is for chainability, dont have to return anything
                // if the selector was multiply defined you would be creating plugin for each selector

                return this.each(function (index, o) {

                    var o = Object.create(mjRadioButton);
                    //var o = createmjRadioButton();

                    o._init(options, this);
                    $.data(this, 'mj-radiobutton-data', o);
                });
            }
            else {

                // method does not exist

                mjcore.mjError("Method '" + options + "' does not exist on mjRadioButton");                
            }
        };
    })(jQuery);

});