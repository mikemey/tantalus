/* global angular */

const loginControllerName = 'LoginController'
angular.module('tantalus.account')
  .config(['$routeProvider', $routeProvider => $routeProvider
    .when('/account/login', {
      templateUrl: 'account/login.html',
      controller: loginControllerName
    })
  ]).controller(loginControllerName, ['$scope', '$location', 'authorization',
    function ($scope, $location, authorization) {
      $scope.model = {
        data: { username: '', password: '' },
        error: ''
      }

      $scope.login = () => {
        const { username, password } = $scope.model.data
        const successRedirect = () => {
          const targetUrl = $location.search().r
            ? decodeURIComponent($location.search().r)
            : '/dashboard'
          $location.url(targetUrl)
        }
        authorization.login(username, password)
          .then(successRedirect)
          .catch(err => {
            if (err.data && err.data.error) $scope.model.error = err.data.error
            else $scope.model.error = 'server error'
          })
      }
    }])
