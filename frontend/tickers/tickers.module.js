/* global angular */

angular.module('tantalus.tickers', [])
  .config(['$routeProvider', $routeProvider => $routeProvider
    .when('/tickers', { templateUrl: 'tickers/tickers.html' })
  ])
