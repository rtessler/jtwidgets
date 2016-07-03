$(document).ready(function () {

    (function ($) {

        var mjModal = {

            // params:

            // html
            // fadein_duration
            // fadeout_duration

            init: function (options, el) {

                this.widget_class = "mjModal";

                this.el = el;
                this.$el = $(el);

                // plugin have been applied previously
                // blow away any existing instance

                $(".mj-modal-container").remove();

                this._validateData(options);

                var v = this._render();

                this._startListening();

                return v;
            },

            //----------------------------------------------------------------------------------------------------------
            // private functions

            _validateData: function(options)
            {
                var default_settings = {
                    html: "",                       // html for the body of the dialog
                    custom_html: "",                // custom html for entire content of the dialog
                    fade_duration: 200,
                    show_close_button: true,        // show x close button in upper right
                    show_header: true,
                    header_text: "Modal Dialog",
                    show_footer: true,
                    show_background: true,
                    buttons: [{ text: "ok", callback: this.close }, { text: "cancel", callback: this.close }],

                    // properties common to all controls

                    width: 500,
                    height: 300,
                    disabled: false,
                    theme: null
                };

                this.settings = $.extend({}, default_settings, options);    // options overrides default

                var s = this.settings;

                if (s.custom_html !== "")
                {
                    s.html = s.custom_html;
                }
                else
                {
                    var html = "";

                    if (s.show_header) {

                        html += "<div class='mj-header'>";

                        if (s.show_close_button)
                            html += "<a class='mj-close-btn'>x</a>";

                        if (s.header_text !== "")
                            html += "<h3>" + s.header_text + "</h3>";

                        html += "</div>";
                    }
                    else
                    {
                        if (s.show_close_button)
                            html += "<a class='mj-close-btn'>x</a>";
                    }

                    html += "<div class='mj-body'>" + s.html + "</div>";

                    if (s.show_footer) {
                        html += "<div class='mj-footer'>";

                        html += "<div class='mj-buttons'>";

                            for (var i = 0; i < s.buttons.length; i++)
                            {
                                var o = s.buttons[i];
                                html += "<a class='mj-btn'>" + o.text + "</a>";
                            }

                        html += "</div>";


                        html += "</div>";
                    }

                    s.html = html;
                }
            },

            _startListening: function () {

                var self = this;

                // we may be recreating the plugin for the second time
                // if we do not stop listening to events on the element we get strange behaviour

                this._stopListening();

                var s = this.settings;

                $(".mj-modal .mj-close-btn").on("click", function(e) { self.close(); });

                // attach callbacks to buttons

                $(".mj-modal .mj-btn").each(function (index, e) {

                    var callback = s.buttons[index].callback;

                    $(e).on("click", function () { if (callback) callback(self); });
                });

                $(".mj-modal").on("click", function (e) {

                    e.preventDefault();
                    e.stopPropagation();        // prevent click in modal from triggering click click in mj-modal-container as well
                });

                $(".mj-modal-container").on("click", function (e) {

                    // background click

                    e.preventDefault();
                    e.stopPropagation();

                    self.close();
                });
            },

            _stopListening: function () {
                $(".mj-modal").off();
            },

            _render: function () {

                var self = this;

                var s = this.settings;

                $("body .mj-modal-container").remove();

                var str = "<div class='mj-modal-container'>";
                str += "<div class='mj-widget mj-modal'>";
                str += s.html;
                str += "</div>";
                str += "</div>";

                $("body").prepend(str);

                if (s.width != null)
                    $(".mj-modal").css("width", s.width);

                if (s.height != null)
                    $(".mj-modal").css("height", s.height);

                if (!s.show_background) 
                    $(".mj-modal-container").css({ background: "transparent" });

                $(".mj-modal-container").fadeIn(s.fade_duration);

                var document_width = $(document).width();
                var document_height = $(document).height();

                $(".mj-modal").css({ "margin-left": (document_width/2 - (s.width / 2)) + "px", "margin-top": (document_height/2 - (s.height / 2)) + "px" });
                //$(".mj-modal").css({ "margin-left": -(s.width / 2) + "px", "margin-top": -(s.height / 2) + "px" });

                var z = this._findHighestZIndex();

                $(".mj-modal-container").css({ "z-index": (z + 1) });
                $(".mj-modal").css({ "z-index": (z + 2) });

                return this;
            },

            _findHighestZIndex: function()
            {
                return Math.max.apply(null,
                 $.map($('body *'), function (e, n) {
                     if ($(e).css('position') != 'static')
                         return parseInt($(e).css('z-index')) || 1;
                 }));
            },

            //--------------------------------------------------------------------
            // public functions

            close: function (context) {

                var self = this;

                console.log("close");

                if (context)
                    self = context;

                var s = self.settings;

                // important to turn off events

                self._stopListening();

                $(".mj-modal-container").fadeOut(s.fade_duration, function () {

                    // dont clear the data
                    
                    self.$el.data(this, 'mj-modal-data', null);
                    $(".mj-modal-container").remove();
                });
            },

            cancel: function ()
            {
                var s = this.settings;

                if (s.cancel_callback)
                    s.cancel_callback();

                $(".mj-modal-container").fadeOut(s.fade_duration, function () {

                    // dont clear the data
                    // important to turn off events

                    this._stopListening();
                    this.$el.data(this, 'mj-modal-data', null);
                    $(".mj-modal-container").remove();
                });
            }
        }

        $.fn.mjModal = function (options) {

            // options is empty or an object
            // within a plugin use this not $(this)
            // check that element exists using this.length

            if (!this.length) {

                mjcore.mjError("mjModal: the html element to attach to '" + this.selector + "' does not exist");
                return null;
            }

            if (mjModal[options]) {

                var q = $(this).data('mj-modal-data');

                if (q)
                    return q[options].apply(q, Array.prototype.slice.call(arguments, 1));
            }
            else if (!options || typeof options === 'object') {

                // return is for chainability, dont have to return anything
                // if the selector was multiply defined you would be creating plugin for each selector

                //return this.each(function () {
                    var modal = Object.create(mjModal);
                    modal.init(options, this);
                    $.data(this, 'mj-modal-data', modal);
                //});

                    return this;
            }
            else {

                // method does not exist

                mjcore.error("Method '" + options + "' does not exist on mjModal");
            }
        };
    })(jQuery);

});