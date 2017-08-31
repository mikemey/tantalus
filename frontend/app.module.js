/* global angular */

const transformPrice = () => input => {
  if (input === 'N/A') return input
  return input.toFixed(2)
}

const appRouter = $routeProvider => $routeProvider
  .when('/', { templateUrl: 'start.template.html' })
  .otherwise('/')

angular
  .module('tantalus', [
    'ngCookies',
    'ngRoute',
    'tantalus.tickers'
  ])
  .config(['$routeProvider', appRouter])
  .filter('price', transformPrice)
