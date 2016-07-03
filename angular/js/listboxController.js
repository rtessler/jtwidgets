app.controller('listboxCtrl', function ($scope, $http) {

    $scope.examples = [
        { text: "basic", op: "basic"},
        { text: "checklist", op: "checklist"},
        { text: "radiolist", op: "radiolist"},
        { text: "imagelist", op: "imagelist"},
        { text: "filter", op: "filter" },
        { text: "custom render", op: "customRender" },
        { text: "long text", op: "longText" },
        { text: "dragdrop", op: "dragdrop" },
        { text: "horizontal", op: "horizontal" },
        { text: "half ticked list", op: "halfTickedList" },
        { text: "big data", op: "bigData" },
        { text: "operations on non existantant controls", op: "nonExist" }];

    $scope.doc = [];

    $scope.ops = [{ op: 'getChecked', text: 'get checked' },
               { op: 'getSelected', text: 'get selected' },
               { op: 'checkAll', text: 'check all' },
               { op: 'uncheckAll', text: 'uncheck all' },
               { op: 'selectAll', text: 'selectAll' },
               { op: 'deselectAll', text: 'deselect all' },
               { op: 'add', text: 'add' },

               { op: 'select', text: 'select' },
               { op: 'insert', text: 'insert' },
               { op: 'update', text: 'update' },

               { op: 'remove', text: 'remove' },

               { op: 'disable', text: 'disable' },
               { op: 'enable', text: 'enable' },

               { op: 'disableAll', text: 'disable all' },
               { op: 'enableAll', text: 'enable all' },

               { op: 'close', text: 'close' },
               { op: 'hasChanged', text: 'hasChanged' },

               { op: 'scrollTo', text: 'scrollTo' },
               { op: 'sort', text: 'sort' }];

    $scope.runtest = function (name) {

        console.log("runtest: name = " + name);
    };

    $scope.runop = function (name) {

        console.log("runop: name = " + name);
    };
});