
app.controller('myCtrl', function($scope, $http) {
    $scope.firstName= "John";
    $scope.lastName= "Doe";
	$scope.result = 1;
	$scope.users = [{fName: "John", lName: "Doe"}, {fName: "Robert", lName: "Tessler"}];
	
	$scope.fullName = function() {
        return $scope.firstName + " " + $scope.lastName;
    }

	$scope.getCountries = function($scope, $http)
	{
		$http.get("http://www.w3schools.com/angular/customers.php")
		.success(function(response) {$scope.countries = response.records;});
	}	
	
	$scope.inc = function() {
        $scope.result++;
    };	
	
	$scope.getCountries($scope, $http);
});