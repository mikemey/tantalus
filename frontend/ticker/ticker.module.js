/* global angular */

angular.module('tantalus.ticker', [
  'ngRoute',
  'chart.js'
])
  .config(['$routeProvider', $routeProvider => $routeProvider
    .when('/ticker', {
      templateUrl: 'ticker/ticker.html',
      reloadOnSearch: false
    })
  ])
