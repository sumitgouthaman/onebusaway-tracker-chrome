moment.updateLocale('en', {
    relativeTime: {
        future: "%s",
        past: "%s ago",
        s: 'a few sec',
        ss: '%d sec',
        m: "1 min",
        mm: "%d min",
        h: "1 hour",
        hh: "%d hours",
        d: "1 day",
        dd: "%d days",
        M: "1 month",
        MM: "%d months",
        y: "1 year",
        yy: "%d years"
    }
});

var app = angular.module('oba', []);
app.controller('popup', ['$scope', '$http', '$timeout', function ($scope, $http, $timeout) {
    let fetchUpcomingBusesForStop = function (stop, attempt) {
        if (!stop.id) {
            return;
        }

        stop.loading = true;
        $http({
            'method': 'GET',
            'url': `${API_URL}/api/where/arrivals-and-departures-for-stop/${stop.id}.json`,
            'params': {
                'key': KEY
            }
        }).then(function (response) {
            stop.upcomingBuses = response.data.data.entry.arrivalsAndDepartures;
        }).catch(function () {
            console.log(`Request for upcoming buses at ${stop.name} rejected. [Attempt ${attempt}]`);
            if (attempt <= 3) {
                let tryAgainMs = attempt * 797;
                console.log(`Will try fetching ${stop.name} again in ${tryAgainMs} millis.`);
                $timeout(function () {
                    fetchUpcomingBusesForStop(stop, attempt + 1);
                }, tryAgainMs);
            }
        }).then(function () {
            // Finally
            stop.loading = false;
        });
    }

    let loadNearbyStops = function (attempt = 1) {
        if (navigator.geolocation) {
            $scope.locationUnavailable = false;
            navigator.geolocation.getCurrentPosition(function (position) {
                $scope.loadingNearbyStops = true;
                let latitude = position.coords.latitude;
                let longitude = position.coords.longitude;
                $http({
                    'method': 'GET',
                    'url': `${API_URL}/api/where/stops-for-location.json`,
                    'params': {
                        'key': KEY,
                        'lat': latitude,
                        'lon': longitude
                    }
                }).then(function (response) {
                    $scope.nearbyStops = response.data.data.list;
                    _.forEach($scope.nearbyStops, function (stop) {
                        stop.formattedDirection = formatDirection(stop.direction);
                        stop.formattedName = formatStopName(stop);
                    });
                    $scope.$applyAsync();
                }).catch(function () {
                    console.log(`Request for nearby stops rejected. [Attempt ${attempt}]`);
                    $scope.nearbyStopsFailedAtLeastOnce = true;
                    if (attempt <= 3) {
                        let tryAgainMs = attempt * 211;
                        console.log(`Will try fetching nearby stops again in ${tryAgainMs} millis.`);
                        $timeout(function () {
                            loadNearbyStops(attempt + 1);
                        }, tryAgainMs);
                    } else {
                        $scope.nearbyStopsNoMoreRetries = true;
                    }
                }).then(function () {
                    $scope.loadingNearbyStops = false;
                });
            });
        } else {
            $scope.locationUnavailable = true;
            console.log('Location unavailable.');
        }
    };

    let loadStopNumQueryResults = function (stopNumQuery) {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(function (position) {
                let latitude = position.coords.latitude;
                let longitude = position.coords.longitude;
                $http({
                    'method': 'GET',
                    'url': `${API_URL}/api/where/stops-for-location.json`,
                    'params': {
                        'key': KEY,
                        'lat': latitude,
                        'lon': longitude,
                        'query': stopNumQuery
                    }
                }).then(function (response) {
                    if (!_.isEmpty(response.data.data.list)) {
                        $scope.stopNumQueryResult = response.data.data.list[0];
                        $scope.stopNumQueryResult.formattedDirection = formatDirection($scope.stopNumQueryResult.direction);
                        $scope.stopNumQueryResult.formattedName = formatStopName($scope.stopNumQueryResult);
                    } else {
                        $scope.stopNumQueryError = `Stop with # ${stopNumQuery} not found.`;
                    }
                    $scope.$applyAsync();
                }).catch(function () {
                    console.log(`Request for nearby stops rejected - loadStopNumQueryResults.`);
                    $scope.stopNumQueryError = "Could not load stop info.";
                });
            });
        } else {
            $scope.stopNumQueryError = "Cannot fetch stop info without location permission.";
            console.log('Location unavailable - loadStopNumQueryResults.');
        }
    }

    let formatDirection = function (direction) {
        if (direction) {
            switch (direction) {
                case 'N':
                    return 'North';
                case 'S':
                    return 'South';
                case 'W':
                    return 'West';
                case 'E':
                    return 'East';
                default:
                    return direction;
            }
        }
    }

    let formatStopName = function (stop) {
        let name = stop.name;
        if (stop.direction) {
            name += ` (${formatDirection(stop.direction)} bound)`;
        }
        return name;
    }

    $scope.chrome = chrome;

    $scope.addStop = function (id, name) {
        if (!id || !name) {
            return;
        }

        let newStop = {
            'id': id,
            'name': name,
            'loading': true
        };

        $scope.stops.push(newStop);

        fetchUpcomingBusesForStop(newStop);

        let storedStops = _.map($scope.stops, function (stop) {
            return _.pick(stop, ['id', 'name']);
        });

        // Save it using the Chrome extension storage API.
        chrome.storage.sync.set({ 'storedStops': storedStops }, function () {
            console.log('Saved stops list.');
        });
    }

    $scope.removeStop = function (stop) {
        let index = $scope.stops.indexOf(stop);
        if (index != -1) {
            $scope.stops.splice(index, 1);
        }
        let storedStops = _.map($scope.stops, function (stop) {
            return _.pick(stop, ['id', 'name']);
        });

        // Save it using the Chrome extension storage API.
        chrome.storage.sync.set({ 'storedStops': storedStops }, function () {
            console.log('Saved stops list.');
        });
    }

    $scope.getTimeMinsLeft = function (unixTime) {
        if (!unixTime) {
            return '--';
        }
        let day = moment(unixTime);
        return day.fromNow();
    }

    $scope.searchStopNumber = function (stopNumQuery) {
        $scope.stopNumQueryError = null;

        if (!stopNumQuery || !$.isNumeric(stopNumQuery)) {
            $scope.stopNumQueryError = "Stop number is invalid!";
            return;
        }

        loadStopNumQueryResults(stopNumQuery);
    }

    chrome.storage.sync.get('storedStops', function (data) {
        $scope.stops = data.storedStops;
        if (!$scope.stops) {
            $scope.stops = []
        }
        $scope.$applyAsync();
        _.forEach($scope.stops, function (stop, stopIndex) {
            $timeout(function () {
                fetchUpcomingBusesForStop(stop, 1);
            }, stopIndex * 211);
        });
    });

    loadNearbyStops();
}]);