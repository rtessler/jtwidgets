app.controller('demoCtrl', function($scope, $http) {

    $scope.firstName= "John";
    $scope.lastName= "Doe";
	$scope.result = 1;
	$scope.users = [{fName: "John", lName: "Doe"}, {fName: "Robert", lName: "Tessler"}];

/*
	$scope.show_generate_page = false;
	
	$scope.fullName = function() {
        return $scope.firstName + " " + $scope.lastName;
    }

	$scope.getCountries = function($scope, $http)
	{
		$http.get("http://www.w3schools.com/angular/customers.php")
		.success(function(response) {$scope.countries = response.records;});
	}	

	$scope.getSessionData = function($scope, $http)
	{
		$http.get("http://localhost:8888/get_session_data")
		.success(function(response) { 
			$scope.session_data = response;
		});
	}

	$scope.getAvails = function ($scope, $http) {
	    $http.get("http://localhost:8888/get_avails")
		.success(function (response) {
		    $scope.avails = response;
		    console.log(response);
		});
	}
	
	$scope.deleteAvail = function (index) {

	    $scope.avails.splice(index, 1);
	}

	$scope.addFilter = function () {

	}

	$scope.browse = function() {
        $scope.result++;

        $scope.show_generate_page = !$scope.show_generate_page;
    };

	$scope.filterAvails = function() {
       console.log("filter avails");
    };       

	$scope.generateLink = function() {
        $scope.result++;
	};
*/

	$scope.status = "not started";

	$scope.doit = function () {

	    console.log("do it");

	    $scope.status = "clicked";
	};

	$scope.open = function (name) {

	    console.log("open: name = " + name);
	};
	
	//$scope.getSessionData($scope, $http);
	//$scope.getAvails($scope, $http);
});