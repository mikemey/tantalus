/* global angular */

const sellController = 'CoinfloorSellController'

angular
  .module('tantalus.coinfloor')
  .component('coinfloorSell', {
    controller: sellController,
    templateUrl: 'coinfloor/sell.comp.html'
  })
  .controller(sellController, ['$scope', 'tickerService', function ($scope, tickerService) {
    $scope.inputs = {
      sell: 2000,
      targetRate: 0,
      variant: 100,
      distance: 0.03
    }
    $scope.results = []

    $scope.updateTargetRate = () => tickerService.getLatestTicker().then(latestTicker => {
      const coinfloorTicker = latestTicker.tickers.find(ticker => ticker.name === 'coinfloor')
      $scope.inputs.targetRate = coinfloorTicker.sell
    })

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
        const cost = (buyBtcBits * rate) / btcbits
        const diff = available - cost

        return {
          rate: (rate / cents).toFixed(0),
          buy: (buyBtcBits / btcbits).toFixed(4),
          cost: (cost / cents).toFixed(3),
          diff: (diff / cents).toFixed(3)
        }
      }).filter(result => result.diff <= newInputs.distance)
    }, true)

    return $scope.updateTargetRate()
  }])
