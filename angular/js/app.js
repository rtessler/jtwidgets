var app = angular.module('myApp', ['ngRoute']);

app.config(['$routeProvider', function ($routeProvider) {
    $routeProvider.

    when('/listbox', {
        templateUrl: 'demo',
        controller: 'listboxCtrl'
    }).

    //when('/treeview', {
    //    templateUrl: 'demo',
    //    controller: 'treeviewController'
    //}).

    otherwise({
        redirectTo: '/'
    });
}]);

//mainApp.controller('AddStudentController', function ($scope) {
//    $scope.message = "This page will be used to display add student form";
//});

//mainApp.controller('ViewStudentsController', function ($scope) {
//    $scope.message = "This page will be used to display all the students";
//});