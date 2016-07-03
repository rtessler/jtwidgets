$(document).ready(function () {

    /*
		TBD:

        - nested column headers (have to switch to table,tr,td (col-span property not working in firefox)
        - check that sorting works on iphone
        - horizontal merge identical cells (merge_columns)
        - vertical merge idential cells (merge_rows)
        - handle case where more columns than row elements ie missing data
        - ability to take array, object or complex json object as data
        - setting column width does not set the width of a column exactly when the is not enough room in the grid (have to use div inside td)
        - fixed_columns does not work in non-virtual mode
        - fix header row in non-virtual mode
        - spreadsheet mode
        - input type with tab key defined
        - up,down,pageup,pagedown arrow keys for scrolling in virtual mode
        - function to set horizontal scroll position
        - in virtual mode when you are scrolled horizontally and you start scrolling vertically the horizontal position is reset        
		- manual resizing of columns
        - parameter to use display on demand scrollbar, autoscroll
        - pagination control
        - handle case where virtual grid is rendered into a hidden element
        - date field with calendar drop down or in-place edit with format string
        - disable columns
        - hide columns
        - handle date types in sort
        - dynamic setting of page_size in virtual mode
        - import/export to excel
        - trading demo
        - custom dropdowns
        

        questions: 
        - should changes to the grid modify the original data? lets say yes, since cloning large data sets may be excessive

        ------------------------------------------------------------------------------------------------------------------
        Assumptions
        - in virtual_mode all rows are the same height
        - in virtual_mode page_size rows fills the grid

        if you use virtual mode and this is not the case use a different controlap

        ------------------------------------------------------------------------------------------------------------------
        Parameters:

        rows: []                   // eg [<json-object>,...] 
        virtual_mode: true
        page_size: 10                       // number of rows visible (need this in virtual mode)
        show_column_headers: true   
        dragdrop: rows|cells                // enable drag drop
        select_mode: [none,row,cell,multiple_row,multiple_cell]

        columns: [{
                    text: "",
                    data_field: null,                   // mandatory
                    data_type: "string",                // int, float, double, number, date      used for validation and sorting, (default: string)
                    width: "auto",
                    type: "text",                       // text, checkbox, radiobutton, image, dropdown
                    class_name: null,
                    col_header_class_name: null,
                    editable: false,                    
                    align: "left",                      // left, right, center
                    wrap_text: false,                    
                    fixed_columns: 0,                   // number of fixed columns on the left, only works in virtual mode
                    sortable: false,

                    // TBD

                    disabled: false,                    // TBD for disabled columns
                    hidden: false,                      // TBD for hidden columns                   

                    // column functions

                    columnHeaderCellRender: null,       // function to draw column header cell
                    cellRender: null,                   // function to draw a row cell
                    cellValidate: null,                 // function to validate a cell
                    editTransform: null                 // function to transform edit cell value before validate
                    cellFormat: null                    // function to format a cell when rendering
                    
        events

        cellClick
        headerCellClick
        cellValueChange
        cellValidationError
        dragend
        cellDragEnd
        checkChange

        functions

        - addRow
        - insertRow
        - removeRow
        - updateRow
        - updateCell
        - addColumn
        - removeColumn
        - getRows
        - sorting
        - select/deselect
        - scrollToRow
	*/

    (function ($) {

        var mjGrid = {

            init: function (options, el) {

                this.widget_class = "mjGrid";

                this.start = 0;     // row start position used in virtual mode
                this.sort_column_index = null;                
                this.rows = [];             // all rows
                this.visible_rows = [];     // rows visible after filtering
                
                this.el = el;
                this.$el = $(el);

                // plugin have been applied previously
                // blow away any existing instance

                this.close();

                this._validateData(options);

                this._render();

                return this;
            },

            _validateColumns: function()
            {
                var s = this.settings;

                // column parameters

                var default_column = {
                    text: "",
                    data_field: null,                   // mandatory
                    data_type: "string",                // int,float,double,number,date      used for validation and sorting, (default: string)
                    width: "auto",
                    type: "text",                       // text,checkbox,radiobutton,image,dropdown
                    class_name: null,
                    col_header_class_name: null,
                    editable: false,                    
                    align: "left",
                    wrap_text: false,                    
                    fixed_columns: 0,                   // number of left most fixed columns, only works in virtual mode
                    sortable: false,
                    sort_direction: false,
                    nested_headers: [],

                    // TBD

                    disabled: false,                    // TBD for disabled columns
                    group: null,                        // TBD for nested column headers
                    hidden: false,                      // TBD for hidden columns

                    // functions

                    columnHeaderCellRender: null,       // function to draw column header cell
                    cellRender: null,                   // function to draw a row cell
                    cellValidate: null,                 // function to validate a cell
                    editTransform: null,                // function to transform edit cell value before validate
                    cellFormat: null,                   // function to format a cell
                    sortFunction: null                  // function for custom sorting
                };

                $.each(s.columns, function (i, c) {

                    var x = $.extend({}, default_column, c);  // o overrides default

                    $.extend(c, x);
                    
                    // class_name: for custom rendering

                    c.data_type = mjcore.validateString(c.data_type, ["string", "int","float","double", "number", "date"], default_column.data_type);
                    c.type = mjcore.validateString(c.type, ["checkbox", "radiobutton", "image", "text", "dropdown"], default_column.type);
                    c.editable = mjcore.validateBool(c.editable, default_column.editable);
                    c.hidden = mjcore.validateBool(c.hidden, default_column.hidden);
                    c.wrap_text = mjcore.validateBool(c.wrap_text, default_column.wrap_text);
                    c.disabled = mjcore.validateBool(c.disabled, default_column.disabled);
                    s.sortable = mjcore.validateBool(s.sortable, default_column.sortable);
                });
            },

            _validateData: function(options)
            {
                var self = this;

                var default_options = {
                    columns: [],
                    rows: [],                   // eg [<json-object>,...]

                    virtual_mode: true,
                    page_size: 10,                      // number of rows visible (need this in virtual mode)

                    // appearance

                    show_column_headers: true,
                    //borders: "grid",                    // all, grid, right, bottom eg [right,bottom]
                    //border_color: "efefef",

                    dragdrop: "none",                   // none,rows,cells 
                    select_mode: "row",                 // none, row, cell, multi_row, multi_cell
                    filter: null,                       // filter function

                    scrollbar_height: mjcore.MJ_HORIZONTAL_SCROLLBAR_HEIGHT,
                    scrollbar_width: mjcore.MJ_VERTICAL_SCROLLBAR_WIDTH,

                    // common properties

                    width: 'auto',
                    height: 'auto',
                    disabled: false,
                    theme: null
                };

                this.settings = $.extend({}, default_options, options);

                var s = this.settings;

                if (s.rows == null)
                    s.rows = [];

                if (s.columns == null)
                    s.columns = []; 

                s.virtual_mode = mjcore.validateBool(s.virtual_mode, default_options.virtual_mode);
                s.page_size = mjcore.validateInt(s.page_size, null, default_options.page_size);

                s.show_column_headers = mjcore.validateBool(s.show_column_headers, default_options.show_column_headers);

                //if (typeof s.borders == "string")
                //    s.borders = [s.borders]; 

                s.dragdrop = mjcore.validateString(s.dragdrop, ["none","rows","cells"], default_options.dragdrop);
                s.select_mode = mjcore.validateString(s.select_mode, ["none", "row", "cell", "multi_row", "multi_cell"], default_options.select_mode);

                s.scrollbar_width = mjcore.validateInt(s.scrollbar_width, null, default_options.scrollbar_width);
                s.scrollbar_height = mjcore.validateInt(s.scrollbar_height, null, default_options.scrollbar_height);

                this._validateColumns();
                
                // rows is an array of of all rows
                // visible_rows is an array of visible rows, useful if filtering                      
               
                $.each(s.rows, function (i, o) {
                    var r = self._createRow(o);

                    self.rows.push(r);
                    self.visible_rows.push(r);
                });
            },

            _createRow: function(data)
            {
                var s = this.settings;

                var r = { data: data, visible: true, selected: false, disabled: false };

                if (s.select_mode == "cell" || s.select_mode == "multi_cell") {
                    r.selected = [];
                }
                else
                {
                    if (data.selected != undefined)
                        r.selected = (data.selected);
                }

                return r;
            },

            _render: function () {

                var self = this;

                var s = this.settings;

                var str = "<div class='mj-widget mj-grid '>";

                    str += "<div class='mj-grid-container'>";

                        str += "<table class='mj-table'>";

                            str += "<thead class='mj-head'>";
                            str += this._renderColumnHeaders();
                            str += "</thead>";

                            str += "<tbody class='mj-body'>";
                            str += this._renderRows();
                            str += "</tbody>";
                
                        str += "</table>";

                    str += "</div>";

                    // in virtual mode give it a scrollbar
                    // not used in non-virtual mode

                    str += "<div class='mj-vertical-scrollbar-container'></div>";
                    str += "<div class='mj-horizontal-scrollbar-container'></div>";

                str += "</div>";

                this.$el.html(str);         

                this._setRowData();

                this._applyCSS();
               
                // only do this css once

                if (s.width != null && s.width != "auto")
                    this.$el.find(".mj-widget").css({ width: s.width, "max-width": s.width });

                if (s.height != null && s.height != "auto")
                    this.$el.find(".mj-widget").css("height", s.height);                

                this._startListening();

                this._createScrollBars();

                this._handleAllImagesLoaded();

                return this;
            },

            _handleAllImagesLoaded: function()
            {
                var self = this;

                var s = this.settings;

                if (s.virtual_mode) {

                    var arr = this.$el.find("img");

                    //console.log("found " + arr.length + " images");

                    if (arr.length > 0) {

                        var n = 0;

                        this.$el.find("img").load(function () {

                            n++;

                            if (n == arr.length) {
                                //console.log("all images loaded");
                                self._createScrollBars();
                            }
                        });
                    }
                }
            },

            _applyCSS: function()
            {
                var self = this;
                var s = this.settings;

                // set column widths

                //var row_width = 0;

                $.each(s.columns, function (i, o) {

                    var header_cell_style = {};
                    var cell_style = {};

                    if (o.width) {

                        // only works if width is set for all columns

                        self.$el.find(".mj-header-cell:nth-child(" + (i + 1) + ")").css({ "max-width": o.width, width: o.width });
                        self.$el.find(".mj-cell:nth-child(" + (i + 1) + ")").css({ "max-width": o.width, width: o.width });

                        //row_width += parseInt(o.width, 10);
                    }

                    if (o.align) {
                        self.$el.find(".mj-header-cell:nth-child(" + (i + 1) + ")").css("text-align", o.align);
                        self.$el.find(".mj-cell:nth-child(" + (i + 1) + ")").css("text-align", o.align);
                    }
                });
            },

            _renderColumnHeaders: function()
            {
                var str = "";

                // render the column header row

                var s = this.settings;

                if (!s.show_column_headers || !s.columns || s.columns.length == 0)
                    return str;

                if (s.nested_headers && s.nested_headers.length > 0) {

                //    ['A', {label: 'B', colspan: 8}, 'C'],
                //    ['D', {label: 'E', colspan: 4}, {label: 'F', colspan: 4}, 'G'],
                //    ['H', {label: 'I', colspan: 2}, {label: 'J', colspan: 2}, {label: 'K', colspan: 2}, {label: 'L', colspan: 2}, 'M'],
                //    ['N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W']
                //],

                    $.each(s.nested_headers, function (i, r) {

                        str += "<tr class='mj-nested-header-row'>";

                        $.each(r, function (j, c) {

                            var class_str = "mj-nested-header-cell";

                            if (i < s.fixed_columns)
                                class_str += " mj-row-header-cell";

                            str += "<th class='" + class_str + "' ";


                            if (c instanceof Object)
                                str += "colspan='" + c.colspan + "'><div class='mj-cell-content'>" + c.label + "</div>";
                            else
                                str += "><div class='mj-cell-content'>" + c + "</div>";



                            str += "</th>";
                        });

                        str += "</tr>";
                    });

                }

                str += "<tr class='mj-header-row'>";

                $.each(s.columns, function (i, c) {

                    var class_str = "mj-header-cell ";

                    if (i < s.fixed_columns)
                        class_str += " mj-row-header-cell";

                    if (c.col_header_class_name)
                        class_str += c.col_header_class_name;

                    if (!c.wrap_text)
                        class_str += " mj-nowrap";
                    else
                        class_str += " mj-wrap";

                    str += "<th class='" + class_str + "'>";



                    if (c.columnHeaderCellRender && typeof c.columnHeaderCellRender == 'function') {
                        str += c.columnHeaderCellRender({ col: c, col_index: i, value: c.text, col_index: i });
                    }
                    else {
                        str += "<div class='mj-cell-content'>";
                        str += c.text;
                        str += "</div>";
                    }



                    if (c.sortable)
                        str += "<div class='mj-arrow-container'><div class='mj-arrow mj-arrow-down'></div></div>";

                    str += "</th>";
                });

                str += "</tr>";

                return str;
            },

            _renderCellClass: function(r, c, index)
            {
                var class_str = "mj-cell";

                var s = this.settings;

                if (s.select_mode == "cell" || s.select_mode == "multi_cell")
                {
                    if (r.selected.indexOf(c) > -1)
                        class_str += " mj-selected"; 
                }

                if (c.class_name)
                    class_str += " " + c.class_name;

                if (c.type == "text") {

                    // only relevant for text fields

                    class_str += (c.wrap_text) ? " mj-wrap" : " mj-nowrap";
                }

                if (index < s.fixed_columns)
                    class_str += " mj-row-header-cell";
                    
                return class_str;
            },

            _renderCell: function(r, c)
            {
                // return the value to be rendering in a cell

                var val = "";

                if (c.data_field) {

                    var x = r.data[c.data_field];

                    if (x !== null) {

                        // x could be null

                        switch (c.type) {
                            case "text":
                                val = x;

                                if (c.cellFormat)
                                    val = c.cellFormat({ row: r, col: c, value: val });

                                break;

                            case "checkbox":

                                if (x == 1 || x == true || x == "true")
                                    val = "<div class='mj-checkbox-box checked'><div class='mj-tick'></div></div>";
                                else
                                    val = "<div class='mj-checkbox-box'><div class='mj-tick'></div></div>";
                                break;

                            case "radiobutton":
                               
                                if (x == 1 || x == true || x == "true")
                                    val = "<div class='mj-radio checked'><div class='mj-dot'></div></div>";
                                else
                                    val = "<div class='mj-radio'><div class='mj-dot'></div></div>";
                                break;

                            case "image":

                                if (x != null && x !== "")
                                    val = "<img class='mj-image' src='" + x + "' />";
                                break;

                            case "dropdown":
                                
                                var res = $.grep(c.valid_values, function (o) { return o.id == x; });

                                if (res.length > 0)
                                    val = res[0].value;

                            default:
                                break;
                        }
                    }
                }
            
                return val;
            },

            _renderRowVirtual: function(r)
            {
                var self = this;

                if (!r || !r.visible )
                    return "";

                var s = this.settings;

                var class_str = "mj-row";

                if (s.select_mode == "row" || s.select_mode == "multi_row") {

                    if (r.selected)
                        class_str += " mj-selected";

                    if (r.disabled)
                        class_str += " mj-disabled";
                }

                var str = "<tr class='" + class_str + "'>";

                $.each(s.columns, function (col_index, c) {

                    class_str = self._renderCellClass(r, c, col_index);

                    str += "<td class='" + class_str + "'>";


                    if (c.cellRender && typeof c.cellRender == 'function') {                        
                        str += c.cellRender({ row: r, col: c, value: r.data[c.data_field], col_index: col_index });
                    }
                    else {
                        str += "<div class='mj-cell-content'>";
                        str += self._renderCell(r, c);  
                        str += "</div>";
                    }


                    str += "</td>";
                });

                str += "</tr>";

                return str;
            },

            _renderRowNonVirtual: function(r)
            {
                var self = this;

                if (!r || !r.visible)
                    return "";

                var s = this.settings;

                var val;

                var class_str = "mj-row";                

                if (s.select_mode == "row" || s.select_mode == "multi_row") {
                   
                    if (r.selected)
                        class_str += " mj-selected";

                    if (r.disabled)
                        class_str += " mj-disabled";
                }

                var str = "<tr class='" + class_str + "'>";

                $.each(s.columns, function (col_index, c) {

                    if (!c.hidden)
                    {
                        class_str = self._renderCellClass(r, c, col_index);

                        str += "<td class='" + class_str + "'>";


                        if (c.cellRender && typeof c.cellRender == 'function') {

                            str += c.cellRender({ row: r, col: c, value: r.data[c.data_field], col_index: col_index });
                        }
                        else {

                            str += "<div class='mj-cell-content'>";
                            str += self._renderCell(r, c);
                            str += "</div>";
                        }


                        str += "</td>";
                    }
                });

                str += "</tr>";

                return str;
            },

            _setRowData: function()
            {
                var self = this;

                // associate data with every row and column

                var s = this.settings;

                var i = this.start;     // in non-virtual mode start will be 0

                $.each(this.$el.find(".mj-row"), function (index, e) {
                    var r = self.visible_rows[i++];
                    $(e).data("d", r);

                    $.each($(e).find(".mj-cell"), function (j, x) {

                        if (j < s.columns.length) {
                            var c = s.columns[j];
                            $(x).data("d", c);
                        }
                    });
                });

                $.each(this.$el.find(".mj-header-row"), function (index, e) {
                    var r = self.visible_rows[i++];
                    $(e).data("d", r);

                    $.each($(e).find(".mj-header-cell"), function (j, x) {

                        if (j < s.columns.length) {

                            var c = s.columns[j];
                            $(x).data("d", c);
                        }
                    });
                });
            },

            _renderRows: function () {

                // this function is called repeatedly as we scroll so it needs to be fast

                var str = "";

                var s = this.settings;

                var len = this.visible_rows.length;

                if (len == 0)
                    return str;                

                if (s.virtual_mode) {

                    var n = this.start + s.page_size;

                    var maxi = Math.min(n, len);

                    // virtual grid

                    for (var i = this.start; i < maxi; i++) {

                        var r = this.visible_rows[i];

                        str += this._renderRowVirtual(r);
                    }
                }
                else
                {
                    // non-virtual mode

                    for (var i = 0; i < len; i++) {

                        var r = this.visible_rows[i];

                        str += this._renderRowNonVirtual(r);
                    }
                }

                return str;
            },

            _createVerticalScrollBar: function()
            {
                var self = this;

                var s = this.settings;

                var t = this.$el.find(".mj-grid-container");

                var container_width = t.width();

                var w = this.$el.find(".mj-table").width();

                // if number of visible rows is greater than page size we need a vertical scrollbar

                var create_vertical_scrollbar = (this.visible_rows.length > s.page_size);

                // if table width is greater than container width we need a horizontal scrollbar

                var create_horizontal_scrollbar = (w > container_width);

                var e = this.$el.find(".mj-vertical-scrollbar-container");

                if (create_vertical_scrollbar) {

                    if (create_horizontal_scrollbar)
                        e.css({ bottom: s.scrollbar_height, width: s.scrollbar_width });
                    else
                        e.css({ bottom: 0, width: s.scrollbar_width });

                    e.mjScrollBar({ value: self.start, min: 0, max: this.visible_rows.length - s.page_size, page_size: s.page_size, width: s.scrollbar_width });

                    e.on("valueChanged", function (e, n) {

                        // dont update scrollbar

                        self.scrollToRowByIndex(n, false);

                        //self._createHorizontalScrollBar();
                    });

                    t.css("right", s.scrollbar_width + "px");      // leave space for scrollbar

                    // resize the grid container

                    //t.css({ position: "absolute", left: 0, right: right_offset, top: 0, bottom: bottom_offset, overflow: "hidden" });
                }
                else {
                    // remove vertical scrollbar

                    var x = e.find(".mj-scrollbar");

                    if (x && x.length) {
                        e.mjScrollBar("close");
                        t.css("right", "0px");      // leave space for scrollbar
                    }
                }
            },

            _createHorizontalScrollBar: function()
            {
                var self = this;

                var s = this.settings;

                var t = this.$el.find(".mj-grid-container");

                var container_width = t.width();

                var w = this.$el.find(".mj-table").width();

                // if number of visible rows is greater than page size we need a vertical scrollbar

                var create_vertical_scrollbar = (this.visible_rows.length > s.page_size);

                // if table width is greater than container width we need a horizontal scrollbar

                var create_horizontal_scrollbar = (w > container_width);

                var e = this.$el.find(".mj-horizontal-scrollbar-container");

                if (create_horizontal_scrollbar > 0) {

                    if (create_vertical_scrollbar)
                        e.css({ right: s.scrollbar_width, height: s.scrollbar_height });
                    else
                        e.css({ right: 0, height: s.scrollbar_height });

                    e.mjScrollBar({ min: 0, max: w - container_width + s.scrollbar_width, orientation: "horizontal", page_size: s.page_size, height: s.scrollbar_height });

                    e.on("valueChanged", function (e, n) {

                        self.$el.find(".mj-table").css({ position: "relative", left: -n });

                        //self.$el.find(".mj-header-cell").not(".mj-row-header-cell").css({ position: "relative", "left": -n });
                        //self.$el.find(".mj-cell").not(".mj-row-header-cell").css({ position: "relative", "left": -n });

                        self.$el.find(".mj-header-cell.mj-row-header-cell").css({position: "relative", left: n});
                        self.$el.find(".mj-cell.mj-row-header-cell").css({ position: "relative", left: n });
                    });
                }
                else {
                    // remove horizontal scrollbar

                    var x = e.find(".mj-scrollbar");

                    if (x && x.length)
                        e.mjScrollBar("close");
                }
            },

            _createScrollBars: function()
            {
                var self = this;

                // dont create scrollbars for touch screens

                if (mjcore.isTouchScreen())
                    return;

                // when adding a row recreate the scrollbars
                // when deleting a row recreate the scrollbars
                // if number of visible rows changes recreate the scrollbars

                var s = this.settings;

                if (!s.virtual_mode) {

                    this.$el.find(".mj-grid").css("overflow", "auto");
                    //this.$el.find(".mj-grid-container").css("right", "0px");       // no need to leave space for scrollbar

                    // so far unsuccessful fixing column headers in no-virtual mode

                    //var w = this.$el.width();
                    //var h = this.$el.height();
                    //this.$el.find(".mj-body").css({ overflow: "auto", display: "block", width: w, height: h });

                    return;
                }

                //var t = this.$el.find(".mj-grid-container");

                // resize the grid container

                //t.css({ position: "absolute", left: 0, right: 0, top: 0, overflow: "hidden" });  

                this._createVerticalScrollBar();
                                        
                this._createHorizontalScrollBar();
            },
            
            _startListening: function () {

                var self = this;

                this._stopListening();

                var s = this.settings;

                //this.$el.keydown(function(e) {

                //    e.preventDefault();

                //    var KEY_UP = 38;
                //    var KEY_DOWN = 40;

                //    console.log("keydown");

                //    switch (e.keyCode) {

                //        case KEY_UP:
                //            console.log("key UP");
                //            break;

                //        case KEY_DOWN:
                //            console.log("key DOWN");
                //            break;

                //    }
                //});


                this.$el.on("keyup", ".mj-input", function (e) {

                    e.preventDefault();

                    // catch the escape key

                    var ESCAPE_KEY = 27;

                    switch (e.keyCode)
                    {
                        case ESCAPE_KEY:

                            // update the data

                            var r = $(e.currentTarget).closest(".mj-row").data("d");
                            var c = $(e.currentTarget).closest(".mj-cell").data("d");

                            if (!r || !c)
                                return;

                            if (c.data_field) {

                                // go back to old value             

                                value = r.data[c.data_field];                   

                                // destroy the input field
                                // assumes there is no cellRender function
                            
                                $(e.currentTarget).off();                            
                                
                                if (c.cellRender && typeof c.cellRender == 'function') {

                                    var col_index = s.columns.indexOf(c);

                                    var str = c.cellRender({ row: r, col: c, value: mjcore.htmlDecode(value), col_index: col_index });

                                    $(e.currentTarget).parent().html(str);
                                }
                                else {
                                    $(e.currentTarget).parent().html("<div class='mj-cell-content'>" + mjcore.htmlDecode(value) + "</div>");
                                }
                            }

                            break;
                    }
                });

                this.$el.on("focusout", ".mj-input", function (e) {

                    e.preventDefault();

                    var value = $(e.currentTarget).val();

                    // update the data

                    var r = $(e.currentTarget).closest(".mj-row").data("d");
                    var c = $(e.currentTarget).closest(".mj-cell").data("d");

                    if (!r || !c)
                        return;

                    var row_index = self.rows.indexOf(r);
                    var col_index = s.columns.indexOf(c);

                    if (c.data_field) {

                        if (c.editTransform)
                            value = c.editTransform({ row: r, col: c, value: value, row_index: row_index, col_index: col_index });

                        if (c.cellValidate) {
                            if (c.cellValidate({ row: r, col: c, value: value, row_index: row_index, col_index: col_index })) {

                                if (r && c && c.data_field && r.data[c.data_field] != value) {

                                    // check value has changed

                                    r.data[c.data_field] = value;
                                    self.$el.trigger("cellValueChange", { row: r, col: c, value: value, row_index: row_index, col_index: col_index });
                                }
                            }
                            else {
                                value = r.data[c.data_field];        // go back to old value
                                self.$el.trigger("cellValidationError", { row: r, col: c, value: value, row_index: row_index, col_index: col_index });
                            }
                        }
                        else {
                            if (r && c && c.data_field && r.data[c.data_field] != value) {

                                // check value has changed

                                r.data[c.data_field] = value;
                                self.$el.trigger("cellValueChange", { row: r, col: c, value: value, row_index: row_index, col_index: col_index });
                            }
                        }
                    }

                    // destroy the input field
                   
                    $(e.currentTarget).off();

                    if (c.cellRender && typeof c.cellRender == 'function') {

                        var str = c.cellRender({ row: r, col: c, value: mjcore.htmlDecode(value), col_index: col_index });

                        $(e.currentTarget).parent().html(str);
                    }
                    else {
                        $(e.currentTarget).parent().html("<div class='mj-cell-content'>" + mjcore.htmlDecode(value) + "</div>");
                    }
                });


                this.$el.on("click", ".mj-cell", function (e) {

                    // body cell click

                    e.preventDefault();

                    if (s.select_mode == "none")
                        return;

                    var r = $(e.currentTarget).closest(".mj-row").data("d");
                    var c = $(e.currentTarget).data("d");

                    if (!r || !c)
                        return;

                    var row_index = self.rows.indexOf(r);
                    var col_index = s.columns.indexOf(c);

                    if (s.select_mode == "cell" || s.select_mode == "row")
                        self.deselectAll();

                    switch (s.select_mode) {
                        case "cell":

                            $(e.currentTarget).addClass("mj-selected");
                            r.selected.push(c);
                            break;

                        case "multi_cell":

                            $(e.currentTarget).addClass("mj-selected");

                            if (r.selected.indexOf(c) == -1)
                                r.selected.push(c);

                            break;

                        case "row":
                        case "multi_row":

                            $(e.currentTarget).closest(".mj-row").addClass("mj-selected");
                            r.selected = true;

                            break;
                    }

                    var value = r.data[c.data_field];

                    if (c.data_field && !r.disabled) {

                        if (c.type == "dropdown") {

                            var x = $(e.currentTarget).find(".mj-select");

                            if (x.length == 0) {

                                var str = "<select class='mj-select'>";

                                $.each(c.valid_values, function (i, o) {

                                    var selected = "";

                                    if (value == o.id)
                                        selected = "selected";

                                    str += "<option value='" + o.id + "'" + selected + ">" + o.value + "</options>";
                                });

                                str += "</select>";

                                $(e.currentTarget).html(str);

                                self.$el.find(".mj-select").focus().select();
                            }
                        }
                        else if (c.editable) {

                            // column is editable and there is no custom cellRender function
                            // if the cell is not already in edit mode create an input field

                            var x = $(e.currentTarget).find("input");

                            if (x.length == 0) {

                                value = mjcore.htmlEncode(value);

                                var w = $(e.currentTarget).width();

                                $(e.currentTarget).html("<input class='mj-input' value='" + value + "' style='width: " + (w - 10) + "px;' />");

                                self.$el.find(".mj-input").focus().select();
                            }
                        }
                    }

                    self.$el.trigger("cellClick", { row: r, col: c, element: e, value: value, row_index: row_index, col_index: col_index});
                });

                this.$el.on("click", ".mj-header-cell", function (e) {

                    e.preventDefault();

                    var c = $(e.currentTarget).data("d");
                    var col_index = $(e.currentTarget).index();

                    if (c.sortable)
                        self.sort(c);

                    self.$el.trigger("columnHeaderCellClick", { col_index: col_index, col: c });
                });

                //----------------------------------------------------------------------
                // checkboxes

                this.$el.on("click", ".mj-checkbox-box", function (e) {

                    e.preventDefault();

                    var r = $(e.currentTarget).closest(".mj-row").data("d");
                    var c = $(e.currentTarget).closest(".mj-cell").data("d");

                    if (!r || !c)
                        return;

                    var row_index = self.rows.indexOf(r);
                    var col_index = s.columns.indexOf(c);

                    var checked = true;

                    if ($(e.currentTarget).hasClass("checked"))
                        checked = false;                                       

                    if (c.cellValidate && c.cellValidate({ row: r, col: c, value: checked, row_index: row_index, col_index: col_index }))
                    {
                        self.$el.trigger("cellValidationError", { row: r, col: c, value: checked, row_index: row_index, col_index: col_index });
                        return;
                    }

                    if (!checked)
                        $(e.currentTarget).removeClass("checked");                    
                    else
                        $(e.currentTarget).addClass("checked");                    

                    var data_field = c.data_field;

                    if (r && data_field)
                        r.data[data_field] = checked;

                    self.$el.trigger("checkChange", { row: r, col: c, checked: checked, row_index: row_index, col_index: col_index });
                });

                this.$el.on("change focusout", ".mj-select", function (e) {

                    e.preventDefault();

                    var r = $(e.currentTarget).closest(".mj-row").data("d");
                    var c = $(e.currentTarget).closest(".mj-cell").data("d");

                    if (!r || !c)
                        return;

                    var row_index = self.rows.indexOf(r);
                    var col_index = s.columns.indexOf(c);

                    var value = $(e.currentTarget).val();
                    var text = $(e.currentTarget).find("option:selected").text();

                    var data_field = c.data_field;

                    if (r && data_field && r.data[data_field] != value)
                    {
                        // check value has changed

                       r.data[data_field] = value;
                       self.$el.trigger("cellValueChange", { row: r, col: c, value: value, row_index: row_index, col_index: col_index });
                    }

                    // destroy the select field

                    $(e.currentTarget).parent().html(mjcore.htmlDecode(text));

                    // potenially occurs twice: once for change and once for focusout
                    // issue if if the user hits a button and gets gridRows before this function fires focus out we dont get updated values
                });

                //----------------------------------------------------------------------
                // radiobuttons

                this.$el.on(" click", ".mj-cell .mj-radio", function (e) {

                    e.preventDefault();

                    var r = $(e.currentTarget).closest(".mj-row").data("d");
                    var c = $(e.currentTarget).closest(".mj-cell").data("d");

                    if (!r || !c)
                        return;

                    var row_index = self.rows.indexOf(r);
                    var col_index = s.columns.indexOf(c);

                    if (c.cellValidate && c.cellValidate({ row: r, col: c, value: checked, row_index: row_index, col_index: col_index })) {
                        self.$el.trigger("cellValidationError", { row: r, col: c, value: checked, row_index: row_index, col_index: col_index });
                        return;
                    }

                    // cant uncheck a radiobutton

                    var data_field = c.data_field;

                    self.uncheckColumn(c);

                    $(e.currentTarget).addClass("checked");

                    if (r && data_field)
                        r.data[data_field] = true;
                });

                //---------------------------------------------------------------
                // column header hover

                this.$el.find(".mj-table .mj-header-cell").hover(function (e) {

                    $(e.currentTarget).find(".mj-arrow").show();
                },
                function (e) {

                    var i = $(e.currentTarget).index();

                    if (self.sort_column_index != i)
                        $(e.currentTarget).find(".mj-arrow").hide();
                });

                //---------------------------------------------------------------
                // column cell hover

                this.$el.find(".mj-cell").on('mouseenter', function (e) {

                    // conditional tooltip

                    var $this = $(this);

                    var c = $(e.currentTarget).data("d");

                    if (c.type == "text" && this.offsetWidth < this.scrollWidth && !$this.attr('title')) 
                        $this.attr('title', $(this).text());
                });


                //--------------------------------------------------
                // dragdrop

                if (s.dragdrop == "rows") {

                    // uses the query-ui dragdrop

                    this.$el.find(".mj-body").sortable({

                        start: function (event, ui) {

                            var i = self.start;     // in non-virtual mode start will be 0

                            $.each(self.$el.find(".mj-row"), function (index, o) {
                                var r = self.visible_rows[i++];
                                $(o).data("d", r);
                            });
                        },

                        update: function (event, ui) {

                            // refill the data array

                            var new_rows = [];

                            $.each(self.$el.find(".mj-row"), function (index, o) {

                                var r = $(o).data("d");
                                new_rows.push(r);
                            });

                            var index = self.rows.indexOf(self.visible_rows[self.start]);

                            // update the visible rows in the new order

                            for (var i = 0; i < new_rows.length; i++)
                                self.visible_rows[self.start + i] = new_rows[i];

                            var j = 0;

                            for (var i = index, len = self.rows.length; i < len && j < new_rows.length; i++)
                            {
                                var r = self.rows[i];

                                if (r.visible)
                                    self.rows[i] = new_rows[j++];
                            }

                            self.$el.trigger("dragend");
                        }
                        //revert: true
                    });
                }
                
                if (s.dragdrop == "cells")
                {
                    this.$el.find(".mj-cell.draggable").draggable({
                        axis: "x",
                        cursor: "move",
                        snap: true,
                        //grid: [20, 20],
                        //snap: ".mj-cell", snapMode: "both",
                        //connectToSortable: this.$el.find(".mj-table"),
                        start: function (event, ui) {

                            //self.draggable_index = $(event.currentTarget).index();
                        },
                        drag: function (event, ui) {

                        },
                        stop: function (event, ui) {

                        }
                    });

                    // if cell is only partially dragged put it back where it came from

                    this.$el.find(".mj-cell.draggable").draggable({ revert: "invalid" });

                    this.$el.find(".mj-cell.draggable").droppable({

                        drop: function (event, ui) {

                            var oldtext = $(this).html();

                            var text = $(ui.draggable).html();

                            var index = $(this).index();
                            var draggable_index = $(ui.draggable).index();
                            var row_index = $(this).parent().index();
                            //console.log("drop: oldtext = " + oldtext + " index = " + index + " draggable_index = " + draggable_index + " row_index = " + row_index);

                            // swap values
                            // column.type may be invalid after swap
                            // check boxes may stop working
                            // you should only swap cells for columns of the same type

                            var r = s.rows[row_index];

                            var a = s.columns[index];
                            var b = s.columns[draggable_index];

                            if (a.data_field != null && b.data_field != null) {

                                // fields must exist in the data

                                if (r[a.data_field] != undefined && r[b.data_field] != undefined) {

                                    var tmp = r[a.data_field];
                                    r[a.data_field] = r[b.data_field];
                                    r[b.data_field] = tmp;
                                }
                            }

                            $(this).html(text);

                            $(ui.draggable).remove();

                            var c = s.columns[draggable_index];

                            var class_str = self._renderCellClass(r, c, draggable_index);

                            if (draggable_index < $(this).parent().find(".mj-cell").length)
                                $(this).parent().find('.mj-cell').eq(draggable_index).before("<td class='" + class_str + "'>" + oldtext + "</td>");
                            else
                                $(this).parent().append("<td class='" + class_str + "'>" + oldtext + "</td>");

                            self.$el.trigger("cellDragEnd", draggable_index, index);

                            self._applyCSS();
                            self._setRowData();
                            self._startListening();
                        }
                    });
                }

                if (s.virtual_mode)
                {                    
                    if (mjcore.isTouchScreen()) {

                        // on touch screens enable touch scrolling

                        var e = this.$el.find(".mj-grid-container");

                        e.on('touchstart', this, this._touchstart);
                        e.on('touchmove', this, this._touchmove);
                        e.on('touchend', this, this._touchend);
                    }
                    else
                    {
                        // chrome, safari: mousewheel
                        // firefox: DOMMouseScroll
                        // IE: wheel

                        // see: http://www.javascriptkit.com/javatutors/onmousewheel.shtml

                        var mousewheelevt = (/Firefox/i.test(navigator.userAgent)) ? "DOMMouseScroll" : "mousewheel";

                        this.$el.on(mousewheelevt, 'tr', function (e) {

                            e.preventDefault();

                            var n = self.start;

                            var delta = e.originalEvent.wheelDelta;

                            if (mousewheelevt == "DOMMouseScroll")
                                delta = -e.originalEvent.detail;

                            if (delta > 0)
                                n--;
                            else
                                n++;

                            if (n >= 0 && n < self.visible_rows.length) {

                                self.scrollToRowByIndex(n);
                                self.$el.find(".mj-vertical-scrollbar-container").mjScrollBar("set", n);
                            }
                        });
                    }
                }

                //this.$el.on("mouseover", ".mj-cell", function (e) {

                //    // body cell hover
    
                //    e.preventDefault();
                //});
    
                //this.$el.on("mouseout", ".mj-cell", function (e) {
    
                //    e.preventDefault();    
                //});
            },

            _stopListening: function () {

                this.$el.off();

                //if (this.settings.virtual_mode)
                //    this.$el.find(".mj-vertical-scrollbar-container").mjScrollBar("close");
            },

            _touchstart: function(evt)
            {
                var self = evt.data;
                evt.preventDefault();        // need this otherwise the whole page scrolls

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
                //evt.preventDefault();

                var self = evt.data;

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

                var h = self.$el.find(".mj-grid-container").height();

                var delta = (y - self.touch_y);          // change

                var t = delta / h;         // % change can be -ve

                self.touch_y = y;

                var n = s.rows.length;			// number of rows 

                y = self.start + Math.floor((n - s.page_size) * t);

                if (y < 0 || y >= n)
                    return;

                self.touch_busy = true;

                self.start = y;

                self.redraw();                

                self.touch_busy = false;
            },

            _touchend: function(evt)
            {
                var self = evt.data;

                self.touch_busy = false;
            },

            getRowElement: function(r)
            {
                if (!r)
                    return null;

                var rows = this.$el.find(".mj-row");

                for (var i = 0, len = rows.length; i < len; i++) {
                    var e = rows[i];

                    if ($(e).data("d") == r)
                        return $(e);
                }

                return null;
            },

            getCellElement: function (r, c) {
                
                if (!r || !c)
                    return null;

                var e = this.getRowElement(r);

                if (!e)
                    return null;

                var cells = e.find(".mj-cell");

                for (var i = 0, len = cells.length; i < len; i++) {
                    var ee = cells[i];

                    if ($(ee).data("d") == c)
                        return $(ee);
                }

                return null;
            },

            getColHeaderElement: function (c) {

                if (!c)
                    return null;

                var cells = this.$el.find(".mj-header-cell");

                for (var i = 0, len = cells.length; i < len; i++) {
                    var e = cells[i];

                    if ($(e).data("d") == c)
                        return $(e);
                }

                return null;
            },

            //-----------------------------------------------------------------------------------
            // public methods

            disableRow: function (r) {

                if (!r)
                    return;

                r.disabled = true;

                var e = this.getRowElement(r);

                if (e)
                    e.addClass("mj-disabled");
            },

            disableRowAt: function (index) {

                if (index == null || index < 0 || index >= this.rows.length)
                    return;

                var r = this.rows[index];
                this.disableRow(r);
            },

            disableAll: function () {

                var self = this;

                $.each(this.rows, function (i, r) { r.disabled = true; });

                this.$el.find(".mj-row").addClass("mj-disabled");
            },

            enableRow: function (r) {

                if (!r)
                    return;

                r.disabled = false;

                var e = this.getRowElement(r);

                if (e)
                    e.removeClass("mj-disabled");
            },

            enableRowAt: function (index) {

                if (index == null || index < 0 || index >= this.rows.length)
                    return;

                var r = this.rows[index];
                this.enableRow(r);
            },

            enableAll: function()
            {
                var self = this;

                $.each(this.rows, function(i,r) { r.disabled = false; });

                this.$el.find(".mj-row").removeClass("mj-disabled");
            },

            //-------------------------------------------------------------------------------------------------

            getRows: function()
            {
                return this.rows;
            },

            getVisibleRows: function()
            {
                return this.visible_rows;
            },

            getRowAt: function (index) {

                if (index == null || index < 0 || index >= this.rows.length)
                    return null;

                return this.rows[index];
            },

            findRow: function(callback)
            {
                // find a row using a user supplied callback function

                if (!callback)
                    return null;

                for (var i = 0; i < this.rows.length; i++) 
                {
                    var r = this.rows[i];

                    if (callback(r))
                        return r;
                }              
                
                return null;
            },

            getColumns: function()
            {
                return this.settings.columns;
            },

            //---------------------------------------------------------------------------
            // CRUD operations

            _updateRow: function(r, op, old_row)
            {
                // rendering for add, insert, update, remove operations

                if (!r || !r.visible)
                    return;

                var s = this.settings;

                if (s.virtual_mode) {

                    this.redraw();

                    if (op != "update")
                        this._createScrollBars();        // update the scrollbar
                }
                else
                {
                    // find the row in the DOM

                    var str = this._renderRowNonVirtual(r);

                    switch (op) {
                        case "add":

                            this.$el.find(".mj-table").append(str);
                            break;

                        case "update":

                            var e = this.getRowElement(r);

                            if (e)
                                e.replaceWith(str);
                            break;

                        case "remove":

                            var e = this.getRowElement(r);

                            if (e)
                                e.off().remove();

                            break;

                        case "insert":

                            if (old_row) {

                                e = this.getRowElement(old_row);

                                if (e && e.length > 0)
                                    e.before(str);
                            }
                            break;
                    }

                    this._setRowData();
                    this._applyCSS();
                    this._startListening();
                }
            },

            addRow: function (data, options) {

                if (!data)
                    return null;

                // add a row to the end of table

                var r = this._createRow(data);
                
                this.rows.push(r);
                this.visible_rows.push(r);
                this._updateRow(r, "add");

                return r;
            },

            insertRow: function (r, data, options) {

                if (!r || !data)
                    return;

                var index1 = this.rows.indexOf(r);

                if (index1 == -1)
                    return;

                // find the next visible row and insert before it

                var len = this.rows.length;

                var index = index1;

                for (var i = index1; i < len; i++) {

                    r = this.rows[i];

                    if (r.visible) {

                        index = this.visible_rows.indexOf(r);
                        break;
                    }
                }

                // create a new row

                var new_row = this._createRow(data);

                // insert into the rows array

                this.rows.splice(index1, 0, new_row);

                if (i == len)       // no next visible row was found, just add it to the end
                {
                    this.visible_rows.push(new_row);
                    this._updateRow(r, "add");
                }
                else {

                    this.visible_rows.splice(index, 0, new_row);
                    this._updateRow(new_row, "insert", r);
                }

                return new_row;
            },

            insertAt: function(index, data)
            {
                if (index == null || index < 0 || index >= this.rows.length)
                    return;

                var r = this.rows[index];

                return this.insertRow(r, data);
            },

            updateRow: function(r, data) {

                if (!r || !data)
                    return;

                r.data = data;      // update the data

                this._updateRow(r, "update");

                return r;
            },

            updateRowAt: function(index, data)
            {
                if (index == null || index < 0 || index >= this.rows.length)
                    return;

                var r = this.rows[index];

                this.updateRow(r, data);

                return r;
            },

            updateCell: function(r, c, val)
            {
                if (!r || !c || !val)
                    return;

                r.data[c.data_field] = val;

                this._updateRow(r, "update");
            },

            removeRow: function (r) {

                if (!r)
                    return;

                // remove from both rows and visible_rows

                var index = this.rows.indexOf(r);

                if (index > -1)
                    this.rows.splice(index, 1);
                else {
                    return;
                }

                index = this.visible_rows.indexOf(r);

                if (index > -1)
                    this.visible_rows.splice(index, 1);     // remove from visible_rows

                this._updateRow(r, "remove");
            },

            removeRowAt: function (index)
            {
                if (index == null || index < 0 || index >= this.rows.length)
                    return;

                var r = this.rows[i];

                this.removeRow(r);
            },

            addColumn: function(c, default_val)
            {
                // TBD: handle nested_headers

                var s = this.settings;

                if (!c)
                    return;

                if (default_val == null)
                    default_val = "";

                s.columns.push(c);

                this._validateColumns();        // validate the new column data

                $.each(this.rows, function (i, r) {

                    // if data_field does not exist in data create it

                    if (c.data_field && r.data[c.data_field] === undefined)
                        r.data[c.data_field] = default_value;
                });

                this._render();
            },

            insertColumn: function(col_index, c)
            {
                // TBD: handle nested_headers

                var s = this.settings;

                if (col_index == null || c == null || col_index < 0 || col_index >= s.columns.length)
                    return;

                s.columns.splice(col_index, 0, c);

                $.each(this.rows, function (i, r) {

                    // if data_field does not exist in data create it

                    if (c.data_field && r.data[c.data_field] === undefined)
                        r.data[c.data_field] = "";
                });

                this._render();
            },

            removeColumn: function (c)
            {
                // TBD: handle nested_headers

                if (!c)
                    return;

                var s = this.settings;

                // remove the data field
               
                if (c.data_field) {

                    $.each(this.rows, function (i, r) {

                        if (r.data[c.data_field])
                            delete r.data[c.data_field];
                    });
                }

                var index = s.columns.indexOf(c);

                s.columns.splice(index, 1);

                $.each(this.$el.find(".mj-header-row"), function (i, e) {

                    $(e).find(".mj-header-cell").eq(index).off().remove();
                });

                $.each(this.$el.find(".mj-row"), function (i, e) {

                    $(e).find(".mj-cell").eq(index).off().remove();
                });
            },

            removeColumnAt: function(index)
            {
                var s = this.settings;

                if (index == null || index < 0 || index >= s.columns.length)
                    return;

                var c = s.columns[index];

                this.removeColumn(c);              
            },

            //------------------------------------------------------------------------------------------------
            // select functions

            getSelected: function()
            {
                var arr = [];

                var s = this.settings;

                if (s.select_mode == "row" || s.select_mode == "multi_row") {

                    $.each(this.rows, function (index, r) {

                        if (r.selected)
                            arr.push(r);
                    });
                }
                else
                {
                    $.each(this.rows, function (index, r) {

                        if (r.selected.length > 0)
                            arr.push(r);
                    });
                }

                return arr;
            },          

            select: function(r,c)
            {
                if (!r)
                    return;

                var s = this.settings;

                if (s.select_mode == "none")
                    return;

                if (s.select_mode == "row" || s.select_mode == "cell")
                    this.deselectAll();

                var e;

                switch (s.select_mode) {
                    case "row":
                    case "multi_row":

                        r.selected = true;

                        e = this.getRowElement(r);

                        if (e && e.length > 0)
                            e.addClass("mj-selected");

                        break;

                    case "cell":
                    case "multi_cell":

                        if (r.selected.indexOf(c) == -1)
                            r.selected.push(c);

                        e = this.getCellElement(r, c);

                        if (e && e.length > 0)
                            e.addClass("mj-selected");

                        break;
                }
            },

            selectAt: function(index)
            {
                var r = this.rows[index];
                this.select(r, c);               
            },

            deselect: function(r,c)
            {
                var s = this.settings;

                if (s.select_mode == "none")
                    return;

                var e;

                switch (s.select_mode) {
                    case "row":
                    case "multi_row":
                            
                        r.selected = false;

                        var e = this.getRowElement(r);

                        if (e && e.length)
                            e.removeClass("mj-selected");

                        break;

                    case "cell":
                    case "multi_cell":

                        var n = r.selected.indexOf(c);

                        if (n > -1)
                            r.selected.splice(n, 1);

                        e = this.getCellElement(r, c);

                        if (e && e.length > 0)
                            e.removeClass("mj-selected");

                        break;
                }
            },

            deselectAt: function(index)
            {
                var r = this.rows[index];
                this._deselect(r, null);
            },

            deselectAll: function()
            {
                var s = this.settings;

                if (s.select_mode == "none")
                    return;

                this.$el.find(".mj-row").removeClass("mj-selected");
                this.$el.find(".mj-cell").removeClass("mj-selected");

                if (s.select_mode == "cell" || s.select_mode == "multi_cell")
                    $.each(this.rows, function (index, r) { r.selected = []; });
                else
                    $.each(this.rows, function (index, r) { r.selected = false; });
            },

            //-----------------------------------------------------------------------------------------------

            _checkCell: function(e, c, state)
            {
                var x = null;

                var s = this.settings;

                var col_index = s.columns.indexOf(c);

                switch (c.type) {
                    case "checkbox":

                        x = $(e).find(".mj-cell").eq(col_index).find(".mj-checkbox-box");
                        break;

                    case "radiobutton":

                        x = $(e).find(".mj-cell").eq(col_index).find(".mj-radio");
                        break;
                }

                if (x && x.length > 0) {

                    if (state)
                        x.addClass("checked");
                    else
                        x.removeClass("checked");
                }
            },

            checkColumn: function (c)
            {
                var self = this;

                if (!c || c.data_field == null)
                    return;

                $.each(this.$el.find(".mj-row"), function (i, e) { self._checkCell(e, c, 1); });

                $.each(this.rows, function (i, r) { r.data[c.data_field] = 1; });
            },

            checkColumnAt: function (col_index) {

                var s = this.settings;

                if (col_index < 0 || col_index >= s.columns.length)
                    return;

                var c = s.columns[col_index];

                this.checkColumn(c);
            },

            uncheckColumn: function (c)
            {
                var self = this;

                if (!c || c.data_field == null)
                    return;

                $.each(this.$el.find(".mj-row"), function (i, e) { self._checkCell(e, c, 0); });

                $.each(this.rows, function (i, r) { r.data[c.data_field] = 0; });
            },

            uncheckColumnAt: function (col_index) {

                var s = this.settings;

                if (col_index < 0 || col_index >= s.columns.length)
                    return;

                var c = s.columns[col_index];

                this.uncheckColumn(c);
            },

            checkCell: function(r, c)
            {
                if (!r || !c)
                    return;

                var s = this.settings;

                r.data[c.data_field] = 1;       // update the data

                // row may not be displayed

                var e = this.getRowElement(r);

                if (e)
                    this._checkCell(e, c, 1);
            },

            uncheckCell: function(r, c)
            {
                if (!r || !c)
                    return;

                var s = this.settings;

                r.data[c.data_field] = 0;       // update the data

                // row may not be displayed

                var e = this.getRowElement(r);

                if (e)
                    this._checkCell(e, c, 0);
            },

            //-----------------------------------------------------------------------------------------------

            sort: function (c)
            {
                var self = this;
                var s = this.settings;

                if (!c || c.data_field == null)
                    return;

                this.rows.sort(function (a, b) {

                    if (c.sortFunction)
                        return c.sortFunction(c, a, b);            // user defined sort function must return -1,0,1

                    var aa = a.data[c.data_field];
                    var bb = b.data[c.data_field];

                    if (aa == undefined || bb == undefined)
                        return 0;

                    switch (c.data_type)
                    {
                        case "number":
                        case "int":
                        case "float":
                        case "double":

                            aa = parseFloat(aa);
                            bb = parseFloat(bb);

                            if (isNaN(aa))
                                aa = a.data[c.data_field];

                            if (isNaN(bb))
                                bb = b.data[c.data_field];

                            break;
                        case "date":
                            break;

                        default:
                            break;
                    }

                    if (c.sort_direction) {

                        if (aa < bb)
                            return 1;

                        if (aa > bb)
                            return -1;
                    }
                    else {
                        if (aa < bb)
                            return -1;

                        if (aa > bb)
                            return 1;
                    }

                    return 0;
                });

                // rebuild the visible_rows array

                this.visible_rows = [];

                $.each(this.rows, function (i, r) {

                    if (r && r.visible)                   
                        self.visible_rows.push(r);                     
                });               

                c.sort_direction = !c.sort_direction;

                var col_index = s.columns.indexOf(c);           

                this.sort_column_index = col_index;

                this.start = 0;

                this.redraw();

                // hide all arrows

                this.$el.find(".mj-header-cell .mj-arrow").hide();

                // show the nth arrow

                var e = this.$el.find(".mj-header-cell").eq(col_index).find(".mj-arrow");

                e.show();
                
                if (c.sort_direction)
                    e.addClass("mj-arrow-up").removeClass("mj-arrow-down");
                else
                    e.addClass("mj-arrow-down").removeClass("mj-arrow-up");
            },

            sortByColIndex: function(index)
            {
                var s = this.settings;

                if (index == null || index < 0 || index >= s.columns.length)
                    return;

                var c = s.columns[index];

                this.sort(c);
            },

            filter: function (val, callback) {

                var self = this;

                var s = this.settings;

                // build an array of visible rows
                // mark each node as visible or not using the user supplied filter function

                this.visible_rows = [];                

                if ((val == null) || (val === "") || (!s.filter && !callback)) {

                    $.each(this.rows, function (i, r) {

                        r.visible = true;
                        self.visible_rows.push(r);
                    });
                }
                else {

                    $.each(this.rows, function (i, r) {

                        // if a callback was provided use that

                        if (callback)
                            r.visible = callback(r, val);
                        else
                            r.visible = s.filter(r, val);

                        if (r.visible)
                            self.visible_rows.push(r);
                    });
                }

                this.start = 0;     // start from 0
                
                this.redraw();

                this._createScrollBars();

                return this.visible_rows.length;
            },

            redraw: function()
            {
                var str = this._renderRows();

                // dragdrop and sortable need to be recreated after scrolling

                this.$el.find(".mj-body").html(str);

                this._setRowData();

                this._applyCSS();

                this._startListening();
            },

            //------------------------------------------------------------------------------------------------
            // scrolling

            _isScrolledIntoView: function(e)
            {
                // http://stackoverflow.com/questions/487073/check-if-element-is-visible-after-scrolling

                var w = this.$el.find(".mj-grid"); //$(window);

                var docViewTop = w.scrollTop();
                var docViewBottom = docViewTop + w.height();

                var elemTop = e.position().top;
                var elemBottom = elemTop + e.height();

                return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
            },

            getTopRowIndex: function()
            {
                var self = this;
                var s = this.settings;

                if (s.virtual_mode)
                    return this.start;

                var first = null;

                this.$el.find(".mj-row").each(function (i, e) {

                    if (self._isScrolledIntoView($(e)) && !first)
                        first = $(e);         
                });

                var top = first.index();

                return top; 
            },

            scrollToRowByIndex: function (n, update_scrollbar) {

                if (n == null)
                    return;

                if (n < 0)
                    n = 0;

                if (n >= this.visible_rows.length)
                    n = this.visible_rows.length - 1;

                var s = this.settings;

                if (!s.virtual_mode)
                {
                    var rowpos;

                    if (n >= this.visible_rows.length) 
                        rowpos = this.$el.find('.mj-row:last').position();     // just show the last page                    
                    else                    
                        rowpos = this.$el.find(".mj-row").eq(n).position();                    

                    if (rowpos)
                        this.$el.find(".mj-grid").scrollTop(rowpos.top);

                    return;
                }               

                if (n > this.visible_rows.length - s.page_size)
                    n = this.visible_rows.length - s.page_size;     // display last page

                // n could go -ve

                if (n < 0)
                    n = 0;

                this.start = n;

                this.redraw();

                if (mjcore.isTouchScreen())
                    return;

                // if vertical scrollbar exists scroll to the row

                var e = this.$el.find(".mj-vertical-scrollbar-container .mj-scrollbar");

                if (e.length && (update_scrollbar == true || update_scrollbar == undefined))
                    this.$el.find(".mj-vertical-scrollbar-container").mjScrollBar("set", n);

                // reset horizontal scrollbar to 0;

                var e = this.$el.find(".mj-horizontal-scrollbar-container");

                var x = e.find(".mj-scrollbar");

                if (x && x.length)
                    e.mjScrollBar("set", 0);
            },

            scrollToRow: function (r) {

                if (r == null)
                    return;

                var n = this.visible_rows.indexOf(r);

                this.scrollToRowByIndex(n);

                // reset horizontal scrollbar to 0;

                var e = this.$el.find(".mj-horizontal-scrollbar-container");                       

                var x = e.find(".mj-scrollbar");

                if (x && x.length)
                    e.mjScrollBar("set", 0);
            },

            setSelectMode: function(select_mode)
            {
                var s = this.settings;

                s.select_mode = mjcore.validateString(select_mode, ["none", "row", "cell", "multi_row", "multi_cell"], "row");

                this.deselectAll();
            },

            close: function () {

                // dont clear the data
                // important to turn off events

                this._stopListening();
                this.$el.data(this, 'mj-grid-data', null);
                this.$el.html("");
            }
        }

        $.fn.mjGrid = function (options) {

            // check that element exists using this.length

            if (!this.length) {

                mjcore.mjError("mjGrid: the html element to attach to '" + this.selector + "' does not exist."); 
                return null;
            }

            if (mjGrid[options]) {                

                // options is the name of a method in mjGrid

                var o = $(this).data('mj-grid-data');

                // cant call slice directly on arguments

                if (o)
                    return o[options].apply(o, Array.prototype.slice.call(arguments, 1));

                // if o is not found then the mjGrid has not been attached to the element
                // its not an necessarily and error

            }
            else if (!options || typeof options === 'object') {

                // Note: a jquery query select can refer to any number of html elements
                // return is for chainability, dont have to return anything

                return this.each(function (index, o) {

                    var grid = Object.create(mjGrid);

                    grid.init(options, o);

                    // attach object instance to this html element

                    $.data(o, 'mj-grid-data', grid);
                });
            }
            else {

                // method does not exist

                mjcore.mjError("Method '" + options + "' does not exist in mjGrid");
            }
        };
    })(jQuery);

});