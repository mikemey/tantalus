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
]).factory('authorization', ['$http', '$window', function ($http, $window) {
  // const accountKey = 'account_user'

  const getAccount = function () {
    // if (!$window.localStorage[accountKey]) {
    //   console.log('requesting account from BACKEND')
    //   return $http.get('/api/users/account')
    //     .then(response => {
    //       console.log('received response')
    //       console.log(response.data)
    //     })
    //     .catch(err => {
    //       console.log('=====================')
    //       console.log(err)
    //     })
    // }
    console.log('using CACHED account')
    return Promise.resolve({ username: 'ladidadidaaa' })
    // if(!$window.localStorage[accountKey]) {
    // $window.localStorage['user'] = token;
    //   requestAccount().then
    // }
    // return $window.localStorage[accountKey]
  }

  // const logout = function () {
  //   $window.localStorage.removeItem(accountKey)
  // }

  return { getAccount }
}])
