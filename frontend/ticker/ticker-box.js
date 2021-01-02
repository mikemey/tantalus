/* global angular */

const ticker = 'TickerController'
const defaultTitle = 'Tantalus'

const BNC_NAME = 'binance'
const tickerLinks = [
  { name: BNC_NAME, linkto: 'https://www.binance.com/en/trade/BTC_EUR' },
  { name: 'gdax', linkto: 'https://pro.coinbase.com/trade/BTC-EUR' },
  { name: 'coindesk', linkto: 'https://www.coindesk.com/price/bitcoin' }
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
      const titleTicker = latestTickerData.tickers.find(ticker => ticker.name === BNC_NAME)
      if (titleTicker) {
        const titlePrice = titleTicker.bid.toLocaleString(undefined, { maximumFractionDigits: 0 })
        setTitle(`[€ ${titlePrice}] ${defaultTitle}`)
      }

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
