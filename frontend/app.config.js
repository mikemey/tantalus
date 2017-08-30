/* global angular */

angular.module('tantalus')
  .config(['$routeProvider', $routeProvider => {
    $routeProvider
      .when('/', {
        templateUrl: 'tickers/tickers.template.html'
      })
      .otherwise('/')
  }])
