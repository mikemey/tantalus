/* global angular */

angular.module('tantalus.coinfloor', [])
  .config(['$routeProvider', $routeProvider => $routeProvider
    .when('/coinfloor', { templateUrl: 'coinfloor/coinfloor.html' })
  ])
