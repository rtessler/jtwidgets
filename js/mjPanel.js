$(document).ready(function () {

    // reference:
    // http://learn.jquery.com/plugins/basic-plugin-creation/

    (function ($) {

        var mjPanel = {

            _init: function (options, el) {

                this.widget_class = "mjPanel";

                this.el = el;
                this.$el = $(el);

                this.close();
                this._validateData(options);
                this._render();
                this._startListening();

                return this;
            },

            // private

            _validateData: function (options) {
                var default_options = {
                    toggleMode: true,           // if true only 1 node is visible at a time
                    arrowPosition: 'left',      // left, right, none
                    expandedIndexes: [],        // which nodes to expand initially
                    animationDuration: 200,     // in milliseconds, 0 for no animation

                    // common properties

                    width: 'auto',
                    height: 'auto',
                    disabled: false,
                    theme: null
                };

                this.settings = $.extend({}, default_options, options);
            },

            _render: function () {
                var self = this;

                this.$el.addClass("mj-widget mj-panel mj-list");

                if (this.settings.disabled)
                    this.$el.addClass("mj-disabled");

                $.each(this.$el.children(), function (i, e) {

                    $(e).addClass("mj-item");

                    var pos = $.inArray(Math.floor(i / 2), self.settings.expandedIndexes);

                    if (i % 2 == 0) {
                        $(e).addClass("mj-header");

                        if (self.settings.arrowPosition == "left" || self.settings.arrowPosition == "right") {

                            var c = "mj-arrow";

                            if (pos != -1)
                                c += " mj-arrow-down";
                            else
                                c += " mj-arrow-right";

                            switch (self.settings.arrowPosition) {
                                case "left":
                                    c += " mj-left";
                                    break;
                                case "right":
                                    c += " mj-right";
                                    break;
                            }

                            $(e).prepend("<span class='" + c + "'></span>");
                        }
                    }
                    else {

                        if (pos == -1)
                            $(e).addClass("mj-hidden");
                    }
                });
            },

            stopListening: function () {
                this.$el.off();
            },

            _startListening: function () {
                var self = this;

                // panels can be nested, only operate on 1st child

                this.$el.on("click", "> .mj-header", function (e) {

                    if (self.settings.disabled)
                        return;

                    var $e = $(e.currentTarget);
                    var index = self.$el.parent().find(".mj-header").index($e);
                    var o = $e.next();
                    var visible = o.is(":visible");
                    var arrow = $e.find(".mj-arrow").first();

                    var pos = self.settings.arrowPosition;

                    if (self.settings.toggleMode) {

                        // close all nodes, be careful not to touch nested mj controls

                        $e.parent().find(".mj-arrow").removeClass("mj-arrow-down").addClass("mj-arrow-right");
                        //arrow.removeClass("mj-rotate-0").removeClass("mj-rotate-90");

                        $e.parent().children(".mj-item:visible:not(.mj-header)").hide();
                        //$e.parent().children(".mj-item:visible:not(.mj-header)").slideUp(self.settings.animationDuration, function () { });
                    }

                    var data = { index: index, e: $e[0] };

                    if (visible) {
                        self.$el.trigger("collapsedStart", data);

                        if (pos == "left" || pos == "right")
                            arrow.removeClass("mj-arrow-down").addClass("mj-arrow-right");
                        //arrow.addClass("mj-rotate-0").removeClass("mj-rotate-90");

                        o.slideUp(self.settings.animationDuration, function () { self.$el.trigger("collapseComplete", data); });
                    }
                    else {
                        self.$el.trigger("expandStart", data);

                        if (pos == "left" || pos == "right")
                            arrow.removeClass("mj-arrow-right").addClass("mj-arrow-down");
                        //arrow.addClass("mj-rotate-90").removeClass("mj-rotate-0");

                        o.slideDown(self.settings.animationDuration, function () { self.$el.trigger("expandComplete", data); });
                    }
                });
            },

            //------------------------------------------------------------------------------------------------------------------
            // public

            expandAll: function () {

                var self = this;

                this.$el.children(".mj-header").children(".mj-arrow").addClass("mj-arrow-down").removeClass("mj-arrow-right");

                this.$el.children(".mj-header").next().slideDown(self.settings.animationDuration, function () { });
            },

            collapseAll: function () {

                var self = this;

                this.$el.children(".mj-header").children(".mj-arrow").removeClass("mj-arrow-down").addClass("mj-arrow-right");

                this.$el.children(".mj-header").next().slideUp(self.settings.animationDuration, function () { });
            },

            expandAt: function (n) {

                var self = this;

                var expanded = self.getExpanded();

                var e = this.$el.find(".mj-header").eq(n);

                e.children(".mj-arrow").addClass("mj-arrow-down").removeClass("mj-arrow-right");

                e.next().slideDown(self.settings.animationDuration, function () { });

                if (self.settings.toggleMode) {

                    if (expanded.length > 0 && expanded[0] != n)
                        self.collapseAt(expanded[0]);
                }
            },

            collapseAt: function (n) {

                var self = this;

                var e = this.$el.find(".mj-header").eq(n);

                e.children(".mj-arrow").removeClass("mj-arrow-down").addClass("mj-arrow-right");

                e.next().slideUp(self.settings.animationDuration, function () { });
            },

            getExpanded: function () {
                var data = [];

                $.each(this.$el.children(".mj-header"), function (index, e) {

                    var next = $(e).next();

                    if (next.is(":visible"))
                        data.push(index);
                });

                return data;
            },

            enable: function () {
            },

            disable: function () {
            },

            enableAt: function (n) {
            },

            disableAt: function (n) {
            },

            add: function (data) {
            },

            insert: function (data) {
            },

            update: function (n, data) {

            },

            close: function () {

                // dont clear the data
                // important to turn off events

                this.stopListening();

                // we may still want to get the data after the panel has closed so dont remove the data

                // restore the original html

                $.removeData(this.el, 'mj-panel-data');

                this.$el.removeClass("mj-panel");
                this.$el.removeClass("mj-widget");
                this.$el.removeClass("mj-list");
                this.$el.removeClass("mj-disabled");

                $.each(this.$el.children(), function (i, e) {

                    $(e).removeClass("mj-hidden");
                    $(e).removeClass("mj-header");
                    $(e).removeClass("mj-item");
                    $(e).children("span.mj-arrow").remove();
                });

            }
        }

        $.fn.mjPanel = function (options) {

            // check that element exists using this.length

            if (!this.length) {

                mjcore.mjError("mjPanel: the html element to attach to '" + this.selector + "' does not exist.");
                return null;
            }

            // within a plugin use this not $(this) to refer to the element to attach to
            // this refers to the element we are attaching to
            // needs to return this for chainability

            if (mjPanel[options]) {

                // options is the name of a method in mjPanel

                var o = $(this).data('mj-panel-data');

                // cant call slice directly on arguments

                if (o)
                    return o[options].apply(o, Array.prototype.slice.call(arguments, 1));

                // if o is not found then the mjPanel has not been attached to the element
                // its not an necessarily and error

                return null;
            }
            else if (!options || typeof options === 'object') {

                // Note: a jquery query select can refer to any number of html elements
                // return is for chainability, dont have to return anything

                return this.each(function (index, o) {

                    var x = Object.create(mjPanel);

                    x._init(options, o);

                    // attach object instance to this html element

                    $.data(o, 'mj-panel-data', x);
                });
            }
            else {

                // method does not exist

                mjcore.mjError("Method '" + options + "' does not exist in mjPanel");
            }
        };
    })(jQuery);     // pass jQuery as an argument to the immiediatly executed javascript function so that $ always refers to jquery
});