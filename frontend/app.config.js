/* global angular */

const transformPrice = $filter => input => {
  if (input === 'N/A') return input
  return $filter('number')(input, 2)
}

angular.module('tantalus')
  .config(['$routeProvider', $routeProvider => {
    $routeProvider
      .when('/', {
        templateUrl: 'tickers/tickers.template.html'
      })
      .otherwise('/')
  }])
  .filter('price', transformPrice)
