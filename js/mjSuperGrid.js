$(document).ready(function () {

    (function ($) {

        /*
            data is represented as a 2d array
            there is no separate array or column headers or row headers, everything is contained in 1 2d array
            elements of the array are raw values to be displayed

            html output contains 3 html tables: 
                main table with 2 columns: col1: rowheader table col2: data table. 
                data table contains column headers

            the rowheader and data tables make use of colspan and rowspan table properties

            Requirements:
    
            - merge columns: done
            - automatic resizing of columns
            - custom rendering of cells
            - center text in columns
            - virtual mode: done
            - freeze columns: done

            TBD
            non-virtual mode
            addRow
            deleteRow
            insertRow
            updateRow
            updateCell
            column widths
            column alignment
            wrap_text

            Notes: in virtual mode we need the specify the page_size. It doesnt matter how big the widget container is we only get page_size rows
            not surrently possible to fill the grid with as many which will fill the widget
            as a rough guide the height of a row is 24 pixels
        */

        var mjSuperGrid = {

            init: function (options, el) {

                this.widget_class = "mjSuperGrid";

                // stateful variables

                //this.state = {
                    //this.start = 0;
                    //this.scrolling = false;
                    //this.sort_column_index = null;
                    //this.sort_column_direction = false;
                //}
                
                this.start = 0;
                this.scrolling = false;
                this.sort_column_index = null;
                this.sort_column_direction = false;
                

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
                    data: [],
                    colheader_rowno: 0,
                    rowheader_colno: 0,
                    rowheader_type: "column",           // column or indent
                    page_size: 0,                       // max number of data rows visible (virtual_mode parameter), only relevant if virtual_mode is true
                                                        // if page_size is null or 0 mjSuperGrid will do its best to calculate it
                                                        // is page_size is 0 mjSuperGrid will try to fill the height of the container
                    cellRender: null,                   // function to render a data cell (val, row_index, col_index)
                    columnHeaderCellRender: null,       // function to render a column header cell (val, row_index, col_index)
                    rowHeaderCellRender: null,          // function to render a row data cell (val, row_index, col_index)
                    virtual_mode: true,                 // we only have virtual mode at the moment

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

                if (!(s.data instanceof Array))
                    s.data = [];
               
                s.colheader_rowno = mjcore.validateInt(s.colheader_rowno, null, 0);
                s.rowheader_colno = mjcore.validateInt(s.rowheader_colno, null, 0);
                s.rowheader_type = mjcore.validateString(s.rowheader_type, ["column", "indent"], "column");
                s.page_size = mjcore.validateInt(s.page_size, null, 0);
                s.virtual_mode = mjcore.validateBool(s.virtual_mode, true);

                s.virtual_mode = true;      // TBD non-virtual-mode not implemented

                s.scrollbar_width = mjcore.validateInt(s.scrollbar_width, null, default_options.scrollbar_width);
                s.scrollbar_height = mjcore.validateInt(s.scrollbar_height, null, default_options.scrollbar_height);

                if (s.virtual_mode && (!s.page_size || s.page_size <= 0))
                {
                    // fill the height of the container widget
                    // at the moment with the current css a row is 24 pixels high
                    
                    var container_height = this.$el.height();

                    // if the the control is hidden container_height is 0

                    if (!container_height || container_height == 0)
                        container_height = 10 * 24;                     // space for 10 rows

                    var default_row_height = 24;

                    s.page_size = Math.floor((container_height / default_row_height) - s.colheader_rowno) - 1;      // -1 for horizontal scrollbar
                }

                var data = s.data;

                if (data && data.length > 0) {
                    if (s.colheader_rowno > data.length)
                        s.colheader_rowno = data.length;
                }

                // if rowheader_type is column the rowheader table has 1 column

                if (s.rowheader_type == "indent")
                    s.rowheader_colno = 1;
            },

            _startListening: function()
            {
                var self = this;

                this._stopListening();

                var s = self.settings;

                var event_name = "click";

                if (mjcore.isTouchScreen())
                    event_name = "touchend";

                this.$el.on(event_name, ".mj-data-table tr:last-child th", function (e) {

                    e.preventDefault();

                    var i = $(e.currentTarget).index();

                    i += s.rowheader_colno;
                    
                    if (self.sort_column_index == i)
                        self.sort_column_direction = !self.sort_column_direction;      // reverse direction                                    
                    else
                        self.sort_column_direction = true;                    

                    self.sort_column_index = i;

                    var headers = s.data.slice(0, s.colheader_rowno);
                    var data = s.data.slice(s.colheader_rowno);

                    data.sort(function (a, b) {

                        var aa = parseFloat(a[i]);
                        var bb = parseFloat(b[i]);

                        if (isNaN(aa))
                            aa = a[i];

                        if (isNaN(bb))
                            bb = b[i];

                        if (self.sort_column_direction) {

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

                    s.data = headers.concat(data);

                    self.start = 0;

                    self._renderRowHeaderTable();
                    self._renderDataTable();

                    self._createScrollBars();
                });

                this.$el.on("mouseover", ".mj-data-table th", function (e) {

                    $(e.currentTarget).find(".mj-arrow").show();
                });

                this.$el.on("mouseout", ".mj-data-table th", function (e) {

                    var i = $(e.currentTarget).index();

                    i += s.rowheader_colno;

                    if (self.sort_column_index != i)
                        $(e.currentTarget).find(".mj-arrow").hide();
                });



                if (mjcore.isTouchScreen()) {

                    // there is no mouse wheel event to worry about
                    // because its a virtual grid we need to handle scrolling

                    var e = this.$el.find(".mj-super-grid-table-container");

                    e.on('touchstart', this, this._touchstart);
                    e.on('touchmove', this, this._touchmove);
                    e.on('touchend', this, this._touchend);
                }
                else {

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

                        if (n >= 0 && n < s.data.length - self.settings.page_size)
                        {
                            self.start = n;

                            self.$el.find('.mj-vertical-scrollbar-container').mjScrollBar('set', self.start);
                            self._renderRowHeaderTable();
                            self._renderDataTable();

                            self.$el.trigger("mjScrollChange", null);
                        }
                    });
                }
            },

            _stopListening: function ()
            {
                this.$el.off();
            },

            _touchstart: function (evt) {                

                var self = evt.data;

                evt.preventDefault();       // need this otherwise the whole page scrolls    

                var e = evt.originalEvent;
                var y = 0;

                if (e.touches)
                    y = e.touches[0].pageY;
                else
                    y = e.pageY;

                self.touch_y = y;

                self.touch_busy = false;
            },

            _touchmove: function (evt) {

                //evt.preventDefault();

                var self = evt.data;

                var e = evt.originalEvent;

                var y = 0;

                if (e.touches)
                    y = e.touches[0].pageY;
                else
                    y = e.pageY;

                if (y == self.touch_y)
                    return;                 // no change

                if (self.touch_busy)      // still drawing
                    return;

                var s = self.settings;

                var h = self.$el.find(".mj-super-grid-table-container").height();

                var delta = (y - self.touch_y);          // change

                var t = delta / h;         // % change can be -ve

                self.touch_y = y;

                var n = s.data.length;			// number of rows 

                var colheader_rowno = s.colheader_rowno;

                y = self.start + Math.floor((n - s.page_size) * t);

                if (y < 0 || y >= n)
                    return;

                self.touch_busy = true;

                self.start = y;

                //window.setTimeout(function () {

                self._renderRowHeaderTable();
                self._renderDataTable();

                //}, 0);

                self.touch_busy = false;
            },

            _touchend: function (evt) {

                var self = evt.data;

                self.touch_busy = false;
            },

            _render: function () {

                // we require the rowheaders to be frozen so we render them in a separate table
                // data-table also contains column headers

                var str = "<div class='mj-widget mj-super-grid'>";

                    str += "<div class='mj-super-grid-table-container'>";

                        str += "<table class='mj-super-grid-table'>";

                            str += "<tr>";

                                str += "<td class='mj-row-header-table-container'></td>";       // will contain the row header table

                                str += "<td class='mj-data-table-container'></td>";             // will contain the data table which also contains column headers

                            str += "</tr>";

                        str += "</table>";

                    str += "</div>";


                    str += "<div class='mj-vertical-scrollbar-container'></div>";

                    str += "<div class='mj-horizontal-scrollbar-container'></div>  ";

                str += "</div>";

                this.$el.html(str);

                this._renderRowHeaderTable();
                this._renderDataTable();

                var s = this.settings;

                if (s.width != null && s.width != ""  && s.width != "auto")
                    this.$el.find(".mj-widget").css("width", s.width);

                if (s.height != null && s.height != "" && s.height != "auto")
                    this.$el.find(".mj-widget").css("height", s.height);

                this._createScrollBars();

                //this.$el.trigger("mjScrollChange", null);

                return this;
            },

            postRender: function()
            {               
                var h = this.$el.find(".mj-data-table").height();
                
                this.$el.find(".mj-row-header-table").height(h);
            },

            _renderColHeaders: function () {

                var s = this.settings;

                var data = s.data;
                var rowheader_colno = s.rowheader_colno;
                var colheader_rowno = s.colheader_rowno;
                var val;

                // there may be no column headers

                if (data.length == 0 || colheader_rowno == 0)
                    return "";

                var str = "";

                var len = data[0].length;       // number of columns

                // the column headers are in the data as are the row headers

                for (var i = 0; i < colheader_rowno && i < data.length; i++) {

                    var r = data[i];

                    var j;

                    str += "<tr>";

                    if (i == colheader_rowno - 1) {

                        // last header row, no colspans

                        for (j = rowheader_colno; j < len; j++) {

                            val = r[j];

                            if (val == undefined )
                                val = "&nbsp;";

                            var arrow_class = "mj-arrow-down";

                            var style = "";

                            if (this.sort_column_index == j) {

                                if (this.sort_column_direction)
                                    arrow_class = "mj-arrow-up";
                                else
                                    arrow_class = "mj-arrow-down";

                                style = "display: block;";
                            }

                            str += "<th title='" + val + "'><div class='mj-value'><div class='mj-text'>" + val + "</div></div><div class='mj-arrow " + arrow_class + "' style='" + style + "'></div></th>";
                        }
                    }
                    else {

                        // create remaining cells	

                        var val = r[rowheader_colno];

                        var count = 1;

                        str += "<th title='" + val + "' ";

                        for (j = rowheader_colno + 1; j < len; j++) {

                            if (r[j] != val) {

                                // new cell

                                if (j != 0) {
                                    // end previous cell

                                    if (count > 1)
                                        str += " colspan='" + count + "'>";	// end previous cell
                                    else
                                        str += ">";

                                    if (val == undefined )
                                        str += "<div class='mj-text'>&nbsp;</div>";
                                    else
                                        str += "<div class='mj-text'>" + val + "</div>";

                                    str += "</th>";
                                }

                                count = 1;
                                val = r[j];

                                str += "<th title='" + val + "' ";
                            }
                            else {
                                count++;
                            }
                        }

                        if (count > 1)
                            str += " colspan='" + count + "'>";	// end previous cell
                        else
                            str += ">";

                        if (val == undefined)
                            str += "<div class='mj-text'>&nbsp;</div>";
                        else
                            str += "<div class='mj-text'>" + val + "</div>";

                        str += "</th>";
                    }

                    str += "</tr>";
                }

                return str;
            },

            _renderRow: function (row_index) {

                var s = this.settings;
                var data = s.data;

                r = data[row_index];

                var rowheader_colno = s.rowheader_colno;
                var len = r.length;

                var str = "<tr>";

                // render the rest of the row

                for (var i = rowheader_colno; i < len; i++) {

                    var val;

                    if (r[i] == null)
                        val = "";
                    else
                        val = String(r[i]);

                    // cell is height 0 unless there is a value
                    // set empty cells to space

                    if (val.length == 0)
                        val = "&nbsp;";

                    if (s.cellRender) {
                        val = s.cellRender(val, row_index, i);
                        str += "<td>" + val + "</td>";
                    }
                    else {
                        
                        str += "<td><div class='mj-text'>" + val + "</div></td>";
                    }
                }

                str += "</tr>";

                return str;
            },

            _renderRows: function () {

                var s = this.settings;

                var data = s.data;
                var rowheader_colno = s.rowheader_colno;
                var colheader_rowno = s.colheader_rowno;
                var str = "";                

                if (data.length == 0)
                    return str;

                // this.start goes to 0 but data rows start from data[colheader_rowno]

                var n = Math.min(this.start + colheader_rowno + s.page_size, data.length);

                for (var i = this.start + colheader_rowno; i < n; i++)
                    str += this._renderRow(i);

                return str;
            },

            _renderRowHeaderTable: function () {

                var s = this.settings;

                var data = s.data;
                var rowheader_colno = s.rowheader_colno;
                var colheader_rowno = s.colheader_rowno;
                var page_size = s.page_size;

                if (data.length == 0 || rowheader_colno == 0)
                    return "";

                var str = "<table class='mj-row-header-table'>";

                if (s.rowheader_type == "column") {
                    // render empty rows before row headers

                    str += "<thead>";

                    for (var i = 0; i < colheader_rowno; i++) {
                        str += "<tr>";

                        for (var j = 0; j < rowheader_colno; j++)
                            str += "<th><div class='mj-text'>&nbsp;</div></th>";               // need a printing character othersize cell height is wrong

                        str += "</tr>";
                    }

                    str += "</thead>";

                    // render the rows

                    str += "<tbody>";                  

                    // this.start goes to 0 but data rows start from data[colheader_rowno]

                    var n = Math.min(parseInt(this.start + colheader_rowno + page_size, 10), data.length);

                    //mjcore.error("rowheader_colno = " + rowheader_colno + " colheader_rowno = " + colheader_rowno + " start = " + this.start + " page_size = " + page_size + " n = " + n);

                    var rowspan = new Array(rowheader_colno);

                    // initialy all cells span 1 row

                    for (i = 0; i < rowheader_colno; i++)
                        rowspan[i] = 1;

                    var start = parseInt(this.start + colheader_rowno, 10);

                    for (i = start; i < n; i++) {

                        // render the row headers

                        str += "<tr>";

                        for (var j = 0; j < rowheader_colno; j++) {

                            var draw_rowspan = false;

                            if (rowspan[j] <= 1) {
                                // get the rowspan value

                                var prev = data[i][j];

                                if (prev == null && prev == "")
                                    prev = "rubbish-text-not-likley-to-appear-in-user-data";

                                for (var k = i+1; k < n; k++) {
                                    if (data[k][j] == prev) {

                                        // if previous column value changes end the rowspan

                                        if (j > 0 && k > 0 && data[k-1][j-1] != data[k][j-1])
                                            break;

                                        // cell spans next row
                                        
                                        prev = data[k][j];
                                        rowspan[j]++;
                                    }
                                    else
                                        break;
                                }

                                if (rowspan[j] > 1)                                    
                                    draw_rowspan = true;                                
                            }

                            var val = data[i][j];

                            if (val == null || val == "")
                                val = "&nbsp;";

                            if (draw_rowspan) {
                                str += "<td rowspan='" + rowspan[j] + "' title='" + val + "'><div class='mj-text'>" + val + "</div></td>";
                                draw_rowspan = false;
                                rowspan[j]++;
                            }
                            else
                            if (rowspan[j] == 1)
                                str += "<td title='" + val + "'><div class='mj-text'>" + val + "</div></td>";
                                
                            if (rowspan[j] > 1)
                                rowspan[j]--;
                        }

                        str += "</tr>";
                    }

                    str += "</tbody>";
                }

                str += "</table>";

                this.$el.find(".mj-row-header-table-container").html(str);
            },

            _renderDataTable: function () {

                // data table contains column headers

                var str = "<table class='mj-data-table'>";

                str += "<thead>";
                str += this._renderColHeaders();     // there may be no header
                str += "</thead>";

                str += "<tbody>";
                str += this._renderRows();       // there may be no rows
                str += "</tbody>";

                str += "</table>";

                this.$el.find(".mj-data-table-container").html(str);
            },

            //postRender: function () {

            //},

            _createVerticalScrollBar: function()
            {
                var self = this;

                var s = this.settings;


                var page_size = parseInt(s.page_size, 10);

                var vertical_range = parseInt(s.data.length - page_size - s.colheader_rowno, 10);

                var create_vertical_scrollbar = (vertical_range > 0);

                //-----------------------------------------------------

                var total_width = this.$el.find(".mj-super-grid-table").width();

                var visible_width = this.$el.find(".mj-super-grid-table-container").width(); // the visible area

                var horizontal_range = total_width - visible_width;

                var create_horizontal_scrollbar = (horizontal_range > 0);

                //----------------------------------------------------

                var e = this.$el.find(".mj-vertical-scrollbar-container");

                if (create_vertical_scrollbar) {
                    
                    // leave space for horizontal scrollbar

                    if (create_horizontal_scrollbar)
                        e.css({ bottom: s.scrollbar_height + "px" });
                    else
                        e.css({ bottom: "0px" });

                    e.mjScrollBar({ min: 0, max: vertical_range, page_size: page_size });

                    //this.$el.find(".mj-super-grid-table-container").css({ right: s.scrollbar_width });

                    e.on("valueChanged", function (ee, val) {

                        self.start = val;

                        self._renderRowHeaderTable();
                        self._renderDataTable();

                        self._createHorizontalScrollBar();

                        self.$el.trigger("mjScrollChange", val);
                    });
                }
                else {

                    //this.$el.find(".mj-super-grid-table-container").css({ right: 0 });

                    // remove vertical scrollbar

                    var x = e.find(".mj-scrollbar");

                    if (x.length)
                        e.mjScrollBar("close");
                }
            },

            _createHorizontalScrollBar: function()
            {
                var self = this;

                var s = this.settings;


                var page_size = parseInt(s.page_size, 10);

                var vertical_range = parseInt(s.data.length - page_size - s.colheader_rowno, 10);

                var create_vertical_scrollbar = (vertical_range > 0);

                //-----------------------------------------------------

                var total_width = this.$el.find(".mj-super-grid-table").width();      // the whole table (variable)

                var visible_width = this.$el.find(".mj-super-grid-table-container").width(); // the visible area

                var horizontal_range = total_width - visible_width;

                var create_horizontal_scrollbar = (horizontal_range > 0);

                //-----------------------------------------------------

                var e = this.$el.find(".mj-horizontal-scrollbar-container");

                if (create_horizontal_scrollbar) {

                    // leave space for vertical scrollbar

                    if (create_vertical_scrollbar)
                        e.css({ height: s.scrollbar_height + "px", right: s.scrollbar_width + "px" });
                    else
                        e.css({ height: s.scrollbar_height + "px", right: "0px" });

                    e.mjScrollBar({ min: 0, max: horizontal_range, orientation: "horizontal" });

                    e.on("valueChanged", function (ee, val) {

                        var x = self.$el.find(".mj-data-table-container");

                        x.css({ left: -val + "px" });

                        self.$el.trigger("mjScrollChange", val);
                    });
                }
                else {

                    // remove horizontal scrollbar

                    var x = e.find(".mj-scrollbar");

                    if (x.length)
                        e.mjScrollBar("close");
                }
            },

            _createScrollBars: function()
            {
                if (mjcore.isTouchScreen())
                    return;

                var s = this.settings;

                if (!s.virtual_mode)
                    return;

                this._createVerticalScrollBar();

                this._createHorizontalScrollBar();
            },

            close: function () {

                // dont clear the data
                // important to turn off events

                this._stopListening();
                this.$el.data(this, 'mj-treegrid-data', null);
                this.$el.html("");
            },

            addRow: function (data) { this._createScrollBars(); },     // TBD
            insertRow: function (data) { this._createScrollBars(); },  // TBD
            deleteRow: function (data) { this._createScrollBars(); },  // TBD
            updateRow: function (data) { this._createScrollBars(); },  // TBD
            updateCell: function (x, y, val) { },   // TBD
            exportToCSV: function () {

                // see: http://stackoverflow.com/questions/14964035/how-to-export-javascript-array-info-to-csv-on-client-side

                //var data = [["name1", "city1", "some other info"], ["name2", "city2", "more info"]];
                var data = this.settings.data;
                var csvContent = "data:text/csv;charset=utf-8,";

                data.forEach(function(infoArray, index){

                    dataString = infoArray.join(",");
                    csvContent += index < data.length ? dataString+ "\n" : dataString;

                });                 

                //var encodedUri = encodeURI(csvContent);
                //window.open(encodedUri);

                var encodedUri = encodeURI(csvContent);
                var link = document.createElement("a");
                link.setAttribute("href", encodedUri);
                link.setAttribute("download", "grid_data.csv");

                link.click();
            },
        }

        $.fn.mjSuperGrid = function (options) {

             // check that element exists using this.length

             if (!this.length) {

                 mjcore.mjError("mjSuperGrid: the html element to attach to '" + this.selector + "' does not exist.");
                 
                 return null;
             }

             if (mjSuperGrid[options]) {                

                 // options is the name of a method in mjSuperGrid

                 var o = $(this).data('mj-super-grid-data');

                 // cant call slice directly on arguments

                 if (o)
                     return o[options].apply(o, Array.prototype.slice.call(arguments, 1));

                 // if o is not found then the mjSuperGrid has not been attached to the element
                 // its not an necessarily and error

             }
             else if (!options || typeof options === 'object') {
                

                 // Note: a jquery query select can refer to any number of html elements
                 // return is for chainability, dont have to return anything

                 return this.each(function (index, o) {

                     var x = Object.create(mjSuperGrid);

                     x.init(options, o);

                     // attach object instance to this html element

                     $.data(o, 'mj-super-grid-data', x);
                 });
             }
             else {

                 // method does not exist

                 mjcore.mjError("Method '" + options + "' does not exist in mjSuperGrid");
             }
        };
    })(jQuery);
});