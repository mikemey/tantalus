/* global angular */

const registerControllerName = 'RegisterController'
angular.module('tantalus.account')
  .config(['$routeProvider', $routeProvider => $routeProvider
    .when('/account/register', {
      templateUrl: 'account/register.html',
      controller: registerControllerName
    })
  ]).controller(registerControllerName, ['$scope', '$http', '$location', function ($scope, $http, $location) {
    $scope.model = {
      data: { username: '', password: '', confirmation: '' }
    }

    $scope.register = () => $http.post('/api/users/register', $scope.model.data)
      .then(() => $location.path('/account'))
  }])
