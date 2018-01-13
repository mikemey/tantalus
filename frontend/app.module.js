/* global angular moment */

const transformPrice = () => (input, len = 2) => {
  if (undefined === input || input === 'N/A') return input
  if (typeof input === 'string') input = Number(input)
  return input.toFixed(len)
}

const parseUnixDate = () => (input, format) => moment.unix(input).format(format)

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
    'tantalus.coinfloor',
    'tantalus.simreport',
    'tantalus.balance'
  ])
  .config(['$routeProvider', appRouter])
  .filter('price', transformPrice)
  .filter('unixDate', parseUnixDate)
