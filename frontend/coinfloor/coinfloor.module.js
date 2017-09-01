/* global angular */

angular.module('tantalus.coinfloor', ['tantalus.ticker'])
  .config(['$routeProvider', $routeProvider => $routeProvider
    .when('/coinfloor', { templateUrl: 'coinfloor/coinfloor.html' })
  ])
