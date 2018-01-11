/* global angular */

const ticker = 'TickerController'

angular.module('tantalus.ticker')
  .component('tickerBox', {
    controller: ticker,
    templateUrl: 'ticker/ticker-box.html'
  })
  .controller(ticker, ['$scope', '$http', '$interval', 'tickerService', function ($scope, $http, $interval, tickerService) {
    $scope.model = { created: '', tickers: [] }
    $scope.markets = []
    $scope.marketDate = null

    const setMarkets = () => $http.get('/api/markets')
      .then(result => {
        $scope.marketDate = new Date()
        $scope.markets = result.data.sort((a, b) => b.trading.localeCompare(a.trading))
      })
      .catch(error => console.log(error))

    const setTicker = latestTicker => {
      $scope.model = latestTicker
    }

    $interval(setMarkets, 60000)
    tickerService.getLatestTicker().then(setTicker)
    tickerService.watchTicker($scope, setTicker)
    return setMarkets()
  }])
