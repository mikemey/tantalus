/* global angular */

const ticker = 'TickerController'
const defaultTitle = 'Tantalus'

angular.module('tantalus.ticker')
  .component('tickerBox', {
    controller: ticker,
    templateUrl: 'ticker/ticker-box.html'
  })
  .controller(ticker, ['$scope', 'tickerService', '$document', function ($scope, tickerService, $document) {
    $scope.model = { created: '', tickers: [] }

    const setTitle = title => { $document[0].title = title }

    const setTicker = latestTicker => {
      const titleTicker = latestTicker.tickers.find(ticker => ticker.name === 'coinfloor')
      if (titleTicker) setTitle(`${defaultTitle} [£ ${titleTicker.bid} / £ ${titleTicker.ask}]`)
      $scope.model = latestTicker
    }

    $scope.$on('$destroy', () => setTitle(defaultTitle))

    tickerService.getLatestTicker().then(setTicker)
    tickerService.watchTicker($scope, setTicker)
  }])
