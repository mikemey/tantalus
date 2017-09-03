/* global angular */

const ticker = 'TickerController'

angular.module('tantalus.ticker')
  .component('tickerBox', {
    controller: ticker,
    templateUrl: 'ticker/ticker-box.html'
  })
  .controller(ticker, ['$scope', 'tickerService', function ($scope, tickerService) {
    $scope.model = { created: '', tickers: [] }

    const setTicker = latestTicker => {
      $scope.model = latestTicker
    }

    tickerService.getLatestTicker().then(setTicker)
    tickerService.watchTicker($scope, setTicker)
  }])
