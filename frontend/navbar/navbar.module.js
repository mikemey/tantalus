/* global angular */

const navbarController = 'NavbarController'

angular
  .module('tantalus.navbar', [])
  .component('navbar', {
    controller: navbarController,
    templateUrl: 'navbar/navbar.html'
  })
  .controller(navbarController, ['$scope', '$location', '$rootScope', 'authorization',
    function ($scope, $location, $rootScope, authorization) {
      $scope.model = {}

      $scope.isActive = currentPath => $location.path().startsWith(currentPath)
      $scope.logout = () => authorization.logout()

      const refreshAccount = () => authorization.reloadAccount()
        .then(() => { $scope.model.account = authorization.getAccount() })

      $rootScope.$on('$routeChangeStart', event => {
        if (!authorization.getAccount()) {
          const currentPath = $location.path()
          if (currentPath !== '/account/register' && currentPath !== '/account/login') {
            return refreshAccount()
          }
        }
      })

      return refreshAccount()
    }
  ])
