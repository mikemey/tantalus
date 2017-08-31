/* global angular */

angular.module('tantalus.ticker', [])
  .config(['$routeProvider', $routeProvider => $routeProvider
    .when('/ticker', { templateUrl: 'ticker/ticker.html' })
  ])
