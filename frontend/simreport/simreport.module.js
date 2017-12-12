/* global angular */

angular.module('tantalus.simreport', [
  'ngRoute'
]).config(['$routeProvider', $routeProvider => $routeProvider
  .when('/simreport', { templateUrl: 'simreport/simreport.html' })
])
