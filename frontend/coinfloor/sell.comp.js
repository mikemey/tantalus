/* global angular */

const sellController = 'CoinfloorSellController'

angular
  .module('tantalus.coinfloor')
  .component('coinfloorSell', {
    controller: sellController,
    templateUrl: 'coinfloor/sell.comp.html'
  })
  .controller(sellController, ['$scope', ($scope) => {
    $scope.calculatePrices = () => {
      return []
    }
  }])
