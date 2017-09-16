/* global angular */

angular.module('tantalus.account', [
  'ngRoute'
]).config(['$routeProvider', $routeProvider => $routeProvider
  .when('/account', {
    templateUrl: 'account/account.html',
    resolve: {
      account: ['authorization', authorization => {
        const account = authorization.getAccount()
        if (!account) {
          return authorization.reloadAccount()
            .then(() => authorization.getAccount())
        }
        return account
      }]
    }
  })
  .when('/account/login', {
    templateUrl: 'account/login.html'
  })
]).factory('authorization', ['$http', '$location', function ($http, $location) {
  let account = null

  const resetAccount = () => {
    account = null
    $location.path('/account/login')
  }

  const getAccount = () => account

  const login = (username, password) =>
    $http.post('/api/users/login', { username, password })

  const logout = () => $http.post('/api/users/logout').then(resetAccount)

  const reloadAccount = () => account
    ? Promise.resolve(true)
    : $http.get('/api/users/account').then(response => {
      account = response.data
    }).catch(() => {
      resetAccount()
    })

  return { getAccount, login, logout, reloadAccount }
}])
