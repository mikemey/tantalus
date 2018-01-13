/* global angular */

angular.module('tantalus.balance', [
  'ngRoute',
  'tantalus.ticker'
]).config(['$routeProvider', $routeProvider => $routeProvider
  .when('/balance', {
    templateUrl: 'balance/balance.html'
  })
])
