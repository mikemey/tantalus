/* global angular */

angular.module('tantalus.coinfloor', [
  'ngRoute',
  'tantalus.ticker'
]).config(['$routeProvider', $routeProvider => $routeProvider
  .when('/coinfloor', { templateUrl: 'coinfloor/coinfloor.html' })
])