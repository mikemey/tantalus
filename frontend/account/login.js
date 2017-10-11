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
        authorization.login(username, password)
          .then(() => $location.path('/dashboard'))
          .catch(err => {
            if (err.data && err.data.error) $scope.model.error = err.data.error
            else $scope.model.error = 'server error'
          })
      }
    }])
