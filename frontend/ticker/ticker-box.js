/* global angular */

const ticker = 'TickerController'
const defaultTitle = 'Tantalus'

const CF_NAME = 'coinfloor'
const tickerLinks = [
  { name: CF_NAME, linkto: 'https://coinfloor.co.uk/exchange' },
  { name: 'gdax', linkto: 'https://pro.coinbase.com/trade/BTC-GBP' }
]

angular.module('tantalus.ticker')
  .component('tickerBox', {
    controller: ticker,
    templateUrl: 'ticker/ticker-box.html'
  })
  .controller(ticker, ['$scope', 'tickerService', '$document', function ($scope, tickerService, $document) {
    $scope.model = { created: '', tickers: [] }

    const setTitle = title => { $document[0].title = title }

    const setTicker = latestTickerData => {
      const titleTicker = latestTickerData.tickers.find(ticker => ticker.name === CF_NAME)
      if (titleTicker) setTitle(`[£ ${titleTicker.bid} /£ ${titleTicker.ask}] ${defaultTitle}`)

      $scope.model = updateTickerLinks(latestTickerData)
    }

    const updateTickerLinks = tickerData => {
      tickerData.tickers = tickerData.tickers.map(ticker => {
        const link = tickerLinks.find(link => ticker.name === link.name)
        if (link) ticker.linkto = link.linkto
        return ticker
      })
      return tickerData
    }

    $scope.$on('$destroy', () => setTitle(defaultTitle))

    tickerService.getLatestTicker().then(setTicker)
    tickerService.watchTicker($scope, setTicker)
  }])
