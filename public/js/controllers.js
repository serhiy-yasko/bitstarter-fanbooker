/* 
   Set up the Angular.js controllers, the A in the MEAN stack (from mean.io).

   This code updates the thermometer dynamically. It's the client-side
   function within the page that sets up the OrdersCtrl controller on the
   homepage.

   NOTE: For simplicity we've hardcoded the path to the corresponding
   /api/orders route defined in routes.js in API_ORDER_ROUTE. If you have a
   large number of routes to share between client- and server-side code and
   really want single-point-of-truth for route definitions, one approach is
   to define a separate file or variable with public route names meant to be
   seen on the client side and then import that on both the client- and
   server-side (and then perhaps obfuscate the code prior to serving it up).
*/

var API_ORDER_ROUTE = '/api/orders';
function OrdersCtrl($http, $scope) {
    $http.get(API_ORDER_ROUTE).success(function(data, status, headers, config) {
	if (data.error) {
	    $scope.error = data.error;
	} else {
	    $scope.num_orders = data.num_orders;
	    $scope.total_funded = data.total_funded.toFixed(2);
	    $scope.unit_symbol = data.unit_symbol;
	    $scope.target = data.target;
	    $scope.days_left = data.days_left ? data.days_left : 0;
	    $scope.percentage_funded = Math.min($scope.total_funded / $scope.target * 100.0, 100);
	}
    }).error(function(data, status, headers, config) {
	$scope.error = "Error fetching order statistics.";
    });
}

var API_EVENT_ROUTE = '/api/events';
function EventsCtrl($http, $scope) {
    $http.get(API_EVENT_ROUTE).success(function(data, status, headers, config) {
	if (data.error) {
	    $scope.error = data.error;
	} else {
	    $scope.events = data;
	}
    }).error(function(data, status, headers, config) {
	$scope.error = "Error fetching events.";
    });

    $scope.upvoteEvent = function(eventId) {
	var event_id = eventId - 1;
	$scope.events[event_id].vote_counter += 1;
	$http({
	    url: '/upvote_event',
	    method: 'POST',
	    headers: { 'Content-Type': 'application/json' },
	    data: JSON.stringify({ 'upvote_event_id': eventId })
	});
    }
}

var API_AGENCY_ROUTE = '/api/agencies';
function AgenciesCtrl($http, $scope) {
    $http.get(API_AGENCY_ROUTE).success(function(data, status, headers, config) {
	if (data.error) {
	    $scope.error = data.error;
	} else {
	    $scope.agencies = data;
	}
    }).error(function(data, status, headers, config) {
	$scope.error = "Error fetching agencies.";
    });  
}

var API_VENUE_ROUTE = '/api/venues';
function VenuesCtrl($http, $scope) {
    $http.get(API_VENUE_ROUTE).success(function(data, status, headers, config) {
	if (data.error) {
	    $scope.error = data.error;
	} else {
	    $scope.venues = data;
	}
    }).error(function(data, status, headers, config) {
	$scope.error = "Error fetching venues.";
    });  
}
