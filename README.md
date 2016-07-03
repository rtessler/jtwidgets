# Multilist

A jquery plugin for rendering json data as lists of checkboxes, radiobuttons, images and text.

Examples:

http.www.multilistjs.com

# Documentation

## Options:

### Item parameters:

id			( list item id )
text		( text to display )
image		( image file name, image directory may be specified in settings)
selected	(1 for selected, 0 for not selected, 2 for half selected)
disabled	(true or false)

### Settings

data:			( json data to display )
image_path:		( path to image directory, default is "images" )
type:			( one of checkbox, radiobutton, image default is checkbox )

## Examples:

### Listview

var data = [
{id: 1, text: "Chocolate Beverage",}, 
{id: 2, text: "Espresso Beverage",}, 
{id: 3, text: "Frappuccino",}];

$("#list").multilist({ data: data, type: "text" });

$("#list").on("select", function(e, data) {
    console.log(data);
	$("#status").html("id: " + data.id + " selected = " + data.selected);
});

### Checklist:


    var data = [
    { id: 1, text: "Michael Jackson", selected: 0, image: "test.png"}, 
    { id: 2, text: "Katie Perry", selected: 0, image: "test.png" },
    { id: 3, text: "Rhianna", selected: 0, image: "test.png" },
    { id: 4, text: "Geoff Buckley", selected: 0, image: "test.png" },
    { id: 5, text: "Amy Winehouse", selected: 0, image: "test.png" },
    { id: 6, text: "Jimi Hendrix", selected: 0, image: "test.png" },
    { id: 7, text: "Wolfgang Amedeus Mozart", selected: 0, image: "test.png" },
    { id: 8, text: "Daft Punk", selected: 0, image: "test.png" },
    { id: 9, text: "Dead Maus", selected: 1, image: "test.png"}];

    $("#list").multilist({ data: data, type: "checkbox" });

    $("#list").on("select", function(e, data)
    {
        console.log("id: " + data.id + " selected = " + data.selected);
    });

		
### Radiobuttons

    var data = [
    { id: 1, text: "White", selected: 1 },
    { id: 2, text: "Black", selected: 0, disabled: true },
    { id: 3, text: "Red", selected: 0 },
    { id: 4, text: "Green", selected: 0 },
    { id: 5, text: "Blue", selected: 0 },
    { id: 6, text: "Yellow", selected: 0 },
    { id: 7, text: "Orange", selected: 0 },
    { id: 8, text: "Grey", selected: 0 },
    { id: 9, text: "Purple", selected: 0 },
    { id: 10, text: "Magenta", selected: 0 },
    { id: 12, text: "Brown", selected: 0}];

    $("#list").multilist({data: data, type: "radiobutton"});

    $("#list").on("select", function(e, data) {

        console.log("id: " + data.id + " selected = " + data.selected);
    });
	
	
###	Images and text

	var data = [
	{ id: 1, text: "<h3>beyonce</h3>", image: "beyonce.jpg" },
	{ id: 2, text: "<b>britany</b>", image: "britany.jpg" },
	{ id: 3, text: "<i>rhianna</i>", image: "rhianna.jpg" }
	];

	$("#list").multilist({ data: data, type: "image", image_path: "images/celebrities/", });

		$("#list").on("select", function(e, data) {
			console.log("id: " + data.id + " selected = " + data.selected);
		});
	});

### Events:

select

### Methods:

	select(id)				select a item in the list <br>
	deselect(id)			deselect an item in the list <br>
	disable(id, state)		enable or disable an item in the list, state: true/false <br>
	halfTick(id)			half select an item <br>
	getSelected()			get array of selected items <br>
	isSelected(id)			returns true if an item is selected <br>
	selectAll()				select all items <br>
	deselectAll()			deselect all items <br>
	halfTickAll()			half select all items <br>
	deselectHalfTicked()	deselect half selected items <br>
	getNode(id)				get an item's data <br>
	getNodeElement(id)		get the html for a item <br>
	add(data)				add an item to the list <br>
	insert(id, data)		insert an item in the list <br>
	update(data)			update an item in the list <br>
	remove(id)				remove an item from the list <br>
	refill(data)			change the list contents <br>
	clear()					delete all items from the list <br>
	close()					delete all items and stop listening to events <br>
	hasChanged()			return true or false depending if anything has changed <br>
	save()					save selected state so hasChanged can work properly <br>

	example: 

	var changed = $("#list").multilist("hasChanged"); 


# Treeview

A jquery plugin for rendering json data as lists of checkboxes, radiobuttons, images and text.

Examples:

http.www.multilistjs.com

# Documentation

## Options:

### Settings

data: null			( json data to display, mandatory, default null )
image_path: "images/"		path to image directory
type: "checkbox"			image or checkbox
expand_selected: false		if true show subitems for selected nodes
animated: true				if true nodes animate when opening and closing
recursive: true				if true selecting a node selects all child nodes and their parents

### Item parameters:

id: 0				list item id
pid: null			id of parent
text: ""			text to display
image" ""			image file name, image directory may be specified in settings
selected: 0			1 for selected, 0 for not selected, 2 for half selected
disabled: false		true or false

## Examples:

var data = [
{id: 1, text: "Coffee"}, 
{id: 11, text: "Latte"},
{id: 12, text: "Moccha"},
{id: 2, text: "Car"}, 
{id: 21, text: "Ford"},
{id: 22, text: "Toyota"}];

$("#list").treeview({ data: data, type: "checkbox", expand_selected: true });

$("#list").on("select", function(e, data) {
    console.log(data);
	$("#status").html("id: " + data.id + " selected = " + data.selected);
});

### Events:

select(id)
expand(id)
collapse(id)

### Methods:

	hasChanged()			return true or false depending if anything has changed <br>
	selectParent(id)		select parent node<br>
	select(id)				select a item in the list <br>
	deselect(id)			deselect an item in the list <br>
	disable(id, state)		enable or disable an item in the list, state: true/false <br>
	halfTick(id)			half select an item <br>
	getSelected()			get array of selected items <br>
	isSelected(id)			returns true if an item is selected <br>
	selectAll()				select all items <br>
	deselectAll()			deselect all items <br>
	halfTickAll()			half select all items <br>
	deselectHalfTicked()	deselect half selected items <br>
	getNode(id)				get an item's data <br>
	getNodeElement(id)		get the html for a item <br>
	getAll()				get data array <br>
	isRootNode(id)			return true or false if node is a root node <br>
	getSiblings(id)			return array of siblings of node <br>
	insert(id, data)		insert an item in the list <br>
	update(data)			update an item in the list <br>
	remove(id)				remove an item from the list <br>
	refill(data)			change the list contents <br>
	expand(id)				expand node <br>
	collapse(id)			collapse node <br>
	expandAll()				expand all nodes <br>
	collapseAll()			collapse all nodes <br>
	clear()					delete all items from the list <br>
	close()					delete all items and stop listening to events <br>	
	save()					save selected state so hasChanged can work properly <br>

	example: 

	var changed = $("#list").multilist("hasChanged"); 