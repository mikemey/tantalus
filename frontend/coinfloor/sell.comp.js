/* global angular */

const sellController = 'CoinfloorSellController'

angular
  .module('tantalus.coinfloor')
  .component('coinfloorSell', {
    controller: sellController,
    templateUrl: 'coinfloor/sell.comp.html'
  })
  .controller(sellController, ['$scope', function ($scope) {
    $scope.inputs = {
      sell: 2551.81,
      targetRate: 3600,
      variant: 30,
      distance: 0.08
    }
    $scope.results = []
    $scope.$watch('inputs', (newInputs, _) => {
      if (!newInputs.sell || !newInputs.targetRate || !newInputs.variant) return

      const cents = 100
      const btcbits = 10000
      const available = newInputs.sell * cents

      const start = newInputs.targetRate - newInputs.variant
      const rates = Array.from({ length: newInputs.variant * 2 + 1 }, (_, i) => (start + i) * cents)

      $scope.results = rates.map(rate => {
        const exactBtc = available / rate
        const buyBtcBits = Math.floor(exactBtc * btcbits)
        const cost = Math.floor((buyBtcBits * rate) / btcbits)
        const diff = available - cost

        return {
          rate: (rate / cents).toFixed(0),
          buy: (buyBtcBits / btcbits).toFixed(4),
          cost: (cost / cents).toFixed(2),
          diff: (diff / cents).toFixed(2)
        }
      }).filter(result => result.diff <= newInputs.distance)
    }, true)
  }])
