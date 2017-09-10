/* global angular */

angular.module('tantalus.account', [
  'ngRoute'
]).config(['$routeProvider', $routeProvider => $routeProvider
  .when('/account', {
    templateUrl: 'account/account.html',
    resolve: {
      account: ['authorization', authorization => authorization.getAccount()]
    }
  })
  .when('/account/login', {
    templateUrl: 'account/login.html'
  })
]).factory('authorization', ['$http', '$location', ($http, $location) => {
  let account

  const getAccount = () => account
    ? Promise.resolve(account)
    : $http.get('/api/users/account')
      .then(response => {
        account = response.data
        return account
      })
      .catch(() => $location.path('/account/login'))

  const logout = () => $http.post('/api/users/logout')
    .then(() => { account = null })

  return { getAccount, logout }
}])
