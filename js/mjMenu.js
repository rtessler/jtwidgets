$(document).ready(function () {

    (function ($) {

        var mjMenu = {

            _init: function (options, el) {

                this.widget_class = "mjMenu";

                // item structure:
                // id
                // text
                // selected: 0|1

                this.el = el;
                this.$el = $(el);

                // plugin have been applied previously
                // blow away any existing instance

                //if (this.settings.data)
                this.close();

                this._validateData(options);

                if (!this.settings.data || this.settings.data.length == 0) {

                    var html = this.$el.html();
                    //var html = this.el;

                    //console.log(this.$el);

                    //var json = html2json(html);

                    //console.log(json);
                }


                this._render();
                this._startListening();

                return this;
            },

            _validateData: function (options) {


                var default_options = {
                    data: [],                   // if data is provided build menu from json rather than underlying html element
                    orientation: "horizontal",  // vertical or horizontal
                    animation: false,           // animate opening of submenus
                    hover: true,                // change background when cursor is over an item
                    open_on_click: false,       // if true only open submenus on click
                    show_arrows: true,          // show arrows to right of text
                    template_id: null,          // TBD
                    top_level_item_width: 100,
                    submenu_width: 200,

                    // common properties

                    width: 'auto',
                    height: 'auto',
                    disabled: false,
                    theme: null
                };

                this.settings = $.extend({}, default_options, options);

                if (this.settings.data == null)
                    this.settings.data = [];

                // we need everything to have an id and text

                $.each(this.settings.data, function (index, o) {

                    if (o.id == null || o.id == undefined)
                        o.id = index;

                    if (o.text == null || o.text == undefined)
                        o.text = "";

                    if (o.selected == null || o.selected == undefined)
                        o.selected = 0;

                    if (o.selected == true)
                        o.selected = 1;

                    if (o.selected == false)
                        o.selected = 0;
                });
            },

            createNode: function (o, level) {
                var self = this;

                var e;

                if (o.id)
                    e = $("<li>", { "data-id": o.id });
                else
                    e = $("<li>");

                if (o.selected == 1)
                    e.addClass("mj-selected");

                // attach data to list item 

                e.data(o);

                var item = $("<div>", { 'class': "mj-item" });

                var x = $("<span>", { 'class': 'mj-text', html: o.text });
                item.append(x);

                if (o.items && o.items.length > 0) {
                    // create submenu

                    if (self.settings.show_arrows) {
                        if (level == 0) {

                            if (self.settings.orientation == "horizontal")
                                x = $("<div>", { 'class': 'mj-arrow mj-arrow-down' });
                            else
                                x = $("<div>", { 'class': 'mj-arrow mj-arrow-right' });
                        }
                        else {
                            x = $("<div>", { 'class': 'mj-arrow mj-arrow-right' });
                        }

                        item.append(x);
                    }

                    var q = $("<ul>", { 'class': 'mj-submenu' });

                    $.each(o.items, function (index, x) {

                        q.append(self.createNode(x, level + 1));
                    });

                    item.append(q);
                }

                e.append(item);

                return e;
            },

            _render: function () {

                var self = this;

                //if (this.settings.data)
                //{
                // create top level node

                if (this.settings.orientation == "horizontal")
                    var e = $("<ul>", { 'class': 'mj-menu mj-widget mj-horizontal' });
                else
                    var e = $("<ul>", { 'class': 'mj-menu mj-widget mj-vertical' });

                for (var i = 0; i < this.settings.data.length; i++) {
                    var o = this.settings.data[i];

                    e.append(self.createNode(o, 0));
                }

                this.$el.html(e);
                //}
                //else
                //{
                //    this.$el.addClass("mj-menu").addClass("mj-horizontal");
                //}

                if (!self.settings.hover) {
                    //this.$el.find("li:hover").css("background-color", "transparent");

                    // remove hover effect

                    this.$el.find("li").hover(
                        function () { $(this).css("background-color", "inherit"); },
                        function () { $(this).css("background-color", "inherit"); }
                    );
                }

                this.$el.find(".mj-menu > li").css({ width: this.settings.top_level_item_width });
                this.$el.find(".mj-submenu li").css({ width: this.settings.submenu_width });


                //// add span elements so we can style the text

                //if (!self.settings.data) {

                //    //self.settings.data = [];

                //    this.$el.find("li").each(function (i, e) {

                //        //var str = $(e).clone().children().remove().end().text().trim();
                //        var str = $(e)[0].firstChild.textContent.trim();

                //        var d = {text: str};

                //        //self.settings.data.push(d);
                //        $(e).data(d);
                //    });
                //}

                return this;
            },

            _startListening: function () {

                var self = this;

                this.stopListening();

                if (this.settings.open_on_click) {

                    this.$el.on("mouseover", "li", function (e) {

                        if (!self.isTopLevel(e.currentTarget))
                            self.openSubmenu(e.currentTarget);
                    });

                    this.$el.on("mouseout", "li", function (e) {

                        if (!self.isTopLevel(e.currentTarget))
                            self.closeSubmenu(e.currentTarget);
                    });

                    $(document).on("click", function (e) {

                        // clicked off the menu

                        var container = $(".mj-menu");

                        if (container
                            && !container.is(e.target) // if the target of the click isn't the container...
                            && container.is(":visible")
                            && container.has(e.target).length === 0) // ... nor a descendant of the container
                        {
                            self.closeAllSubmenus(e);
                        }

                    });

                }
                else {
                    this.$el.on("mouseenter", "li", function (e) {
                        self.openSubmenu(e.currentTarget);
                    });

                    this.$el.on("mouseleave", "li", function (e) {
                        self.closeSubmenu(e.currentTarget);
                    });
                }

                // mouseleave event is useless because in nested list a ul is child of li

                this.$el.on("click", "li", function (e) {

                    e.stopPropagation();

                    var d = $(e.currentTarget).data();

                    self.$el.trigger("select", d);      // trigger an event

                    if (self.settings.open_on_click) {
                        self.closeAllSubmenus(e);
                        self.openSubmenu(e.currentTarget);
                    }
                    else {
                        self.closeAllSubmenus();
                    }
                });
            },

            isTopLevel: function (e) {
                return $(e).parent().first().hasClass("mj-menu");
            },

            openSubmenu: function (e) {
                var submenu = $(e).find('ul').first();

                if (submenu.length > 0) {

                    if (this.settings.animation)
                        submenu.fadeIn(150);
                    else
                        submenu.show();

                    // move submenu to right of li if li has a ul parent

                    //var w = $(e).outerWidth();    // allow for padding

                    var top_level_item_width = this.settings.top_level_item_width + 10;
                    var submenu_width = this.settings.submenu_width + 10;

                    var c = $(e).closest("ul");

                    if (c.hasClass("mj-menu")) {

                        // top level dropdown

                        if (this.settings.orientation == "horizontal") {
                            submenu.css({ left: "0px", top: "30px" });
                            //submenu.animate({ left: "0px", top: "30px" }, 300);
                        }
                        else {
                            var w = $(e).outerWidth();

                            submenu.css({ left: w + "px", top: "0px" });
                            //submenu.css({ left: top_level_item_width + "px", top: "0px" });
                            //submenu.animate({ left: width + "px", top: "0px" }, 300);
                        }
                    }
                    else {

                        var w = $(e).outerWidth();

                        submenu.css({ left: w + "px", top: "0px" });
                        //submenu.css({ left: submenu_width + "px", top: "0px" });
                        //submenu.animate({ left: submenu_width + "px", top: "0px" }, 300);
                    }
                }
            },

            closeSubmenu: function (e) {
                if (this.settings.animation)
                    $(e).find('ul').first().fadeOut(150);
                else
                    $(e).find('ul').first().hide();
            },

            closeAllSubmenus: function () {
                this.$el.find('ul.mj-menu ul').css('display', 'none');
                this.$el.trigger("allClosed");
            },

            stopListening: function () {
                this.$el.off();
            },

            debug: function (msg) {

                if (window.console && window.console.log)
                    console.log(msg);
            },

            //-----------------------------------------------------------------------------------
            // public methods

            disable: function () {

                this.$el.addClass("mj-disabled");
                this.settings.disabled = true;
            },

            enable: function () {

                this.$el.removeClass("mj-disabled");
                this.settings.disabled = false;
            },

            disableItem: function (id) { },

            enableItem: function (id) { },

            add: function (data) { },

            insert: function (id, data) { },

            insertAt: function (n, data) { },

            remove: function (id) { },

            removeAt: function (n) { },

            expand: function (id) { },

            expandAt: function (n) { },

            collapse: function (id) { },

            collapseAt: function (n) { },

            close: function () {

                // dont clear the data
                // important to turn off events

                this.stopListening();
                this.$el.data(this, 'mj-menu-data', null);
                this.$el.html("");
            }
        }

        $.fn.mjMenu = function (options) {

            // check that element exists using this.length

            if (!this.length) {

                mjcore.mjError("mjMenu: the html element to attach to '" + this.selector + "' does not exist.");
                return null;
            }

            if (mjMenu[options]) {

                // options is the name of a method in mjListBox

                var o = $(this).data('mj-menu-data');

                // cant call slice directly on arguments

                if (o)
                    return o[options].apply(o, Array.prototype.slice.call(arguments, 1));

                // if o is not found then the mjListBox has not been attached to the element
                // its not an necessarily and error

                return null;
            }
            else if (typeof options === 'object' || !options) {

                // Note: a jquery query select can refer to any number of html elements
                // return is for chainability, dont have to return anything

                return this.each(function (index, o) {

                    // remove any previous data

                    //$.removeData(this, 'mj-listbox-instance');

                    var x = Object.create(mjMenu);

                    x._init(options, o);

                    // attach object instance to this html element

                    $.data(o, 'mj-menu-data', x);
                });
            }
            else {

                // method does not exist

                mjcore.mjError("Method '" + options + "' does not exist in mjMenu");
            }
        };
    })(jQuery);

});