/* global angular */

const transformPrice = () => (input, len = 2) => {
  if (input === 'N/A') return input
  return input.toFixed(len)
}

const appRouter = $routeProvider => $routeProvider
  .when('/dashboard', {
    templateUrl: 'dashboard.template.html',
    reloadOnSearch: false
  })
  .otherwise('/dashboard')

angular
  .module('tantalus', [
    'ngCookies',
    'ngRoute',
    'tantalus.navbar',
    'tantalus.account',
    'tantalus.ticker',
    'tantalus.coinfloor'
  ])
  .config(['$routeProvider', appRouter])
  .filter('price', transformPrice)
