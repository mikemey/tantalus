/* global angular */
/* global angular */

const navbarController = 'NavbarController'

angular
  .module('tantalus.navbar', [])
  .component('navbar', {
    controller: navbarController,
    templateUrl: 'navbar/navbar.html'
  })
  .controller(navbarController, ['$scope', '$location', ($scope, $location) => {
    $scope.isActive = currentPath => currentPath === $location.path()
  }])
