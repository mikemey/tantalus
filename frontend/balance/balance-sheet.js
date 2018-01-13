
const balanceSheetControllerName = 'BalanceSheetController'

angular
  .module('tantalus.account')
  .component('balanceSheet', {
    controller: balanceSheetControllerName,
    templateUrl: 'balance/balance-sheet.html'
  })
  .controller(balanceSheetControllerName, ['$scope', '$interval', 'balanceService',
    function ($scope, $interval, balanceService) {
      const BTCGPB_ASSET = 'BTCGBP'

      const EMPTY_INPUTS = { asset: '', amount: null, price: null }

      $scope.ADD_MODE = -1
      $scope.inputs = EMPTY_INPUTS
      $scope.model = {
        balanceEntries: [],
        prices: [],
        pricesDate: null,
        sums: null,
        editEntryIndex: $scope.ADD_MODE,
        errorMessage: ''
      }

      const getPriceSymbol = asset => $scope.model.prices.find(symbolPrice => symbolPrice.symbol === asset)

      const errorHandler = error => {
        console.log('error:')
        console.log(error)
        if (error.data && error.data.error) $scope.model.errorMessage += `${error.data.error}\n`
      }
      const resetErrorMessage = () => { $scope.model.errorMessage = '' }

      const recalculateBalanceData = () => {
        const currentBtcSymbol = getPriceSymbol(BTCGPB_ASSET)
        $scope.model.balanceEntries.forEach(recalculateBalanceEntry(currentBtcSymbol))
        if ($scope.model.balanceEntries.length > 1) {
          $scope.model.sums = summarizeBalance()
        }
      }

      const recalculateBalanceEntry = currentBtcSymbol => balanceEntry => {
        const amount = balanceEntry.amount
        const buyingPrice = balanceEntry.price
        balanceEntry.priceDigits = getPriceDigits(buyingPrice)

        const isBtcAsset = balanceEntry.asset === BTCGPB_ASSET
        if (isBtcAsset) {
          balanceEntry.gbpInvest = buyingPrice * amount
        } else {
          balanceEntry.btcInvest = buyingPrice * amount
        }

        const currentSymbol = getPriceSymbol(balanceEntry.asset)
        if (currentSymbol !== undefined) {
          const currentPrice = currentSymbol.price
          balanceEntry.currentPrice = currentPrice
          balanceEntry.changePercentage = (currentPrice - buyingPrice) / buyingPrice * 100

          if (isBtcAsset) {
            balanceEntry.btcValue = amount
          } else {
            balanceEntry.btcValue = currentPrice * amount
            balanceEntry.btcDiff = balanceEntry.btcValue - balanceEntry.btcInvest
          }
          if (currentBtcSymbol !== undefined) {
            const currentBtcPrice = currentBtcSymbol.price
            balanceEntry.gbpValue = currentBtcPrice * balanceEntry.btcValue
            balanceEntry.gbpDiff = isBtcAsset
              ? balanceEntry.gbpValue - balanceEntry.gbpInvest
              : currentBtcPrice * balanceEntry.btcDiff
          }
        }
      }

      const getPriceDigits = price => {
        const pstr = String(price)
        return pstr.includes('.')
          ? pstr.split('.')[1].length - pstr.indexOf('.') + 1
          : 0
      }

      const summarizeBalance = () => $scope.model.balanceEntries.reduce((sums, entry) => {
        if (entry.btcInvest) sums.btcInvest += entry.btcInvest
        if (entry.gbpInvest) sums.gbpInvest += entry.gbpInvest
        if (entry.btcDiff) sums.btcDiff += entry.btcDiff
        if (entry.gbpDiff) sums.gbpDiff += entry.gbpDiff
        if (entry.btcValue) sums.btcValue += entry.btcValue
        if (entry.gbpValue) sums.gbpValue += entry.gbpValue
        return sums
      }, { btcInvest: 0, gbpInvest: 0, btcDiff: 0, gbpDiff: 0, btcValue: 0, gbpValue: 0 })

      const loadBalance = () => balanceService.getBalance()
        .then(balance => {
          $scope.model.balanceEntries = balance.entries
          recalculateBalanceData()
        })

      const updatePrices = () => Promise.all([
        balanceService.getMarketPrices(),
        balanceService.getLatestBitcoinPrice()
      ]).then(([prices, btcPrice]) => {
        $scope.model.pricesDate = new Date()
        prices.unshift({ symbol: BTCGPB_ASSET, price: btcPrice })
        $scope.model.prices = prices
        recalculateBalanceData()
        $scope.$apply()
      }).catch(errorHandler)

      $scope.addAsset = () => {
        resetErrorMessage()
        return balanceService.addBalanceEntry({
          amount: $scope.inputs.amount,
          price: $scope.inputs.price,
          asset: $scope.inputs.asset
        }).then(loadBalance)
          .catch(errorHandler)
      }

      $scope.setEditEntryIndex = entryIndex => {
        $scope.model.editEntryIndex = entryIndex
        $scope.inputs = $scope.model.balanceEntries[entryIndex]
      }

      $scope.updateAssets = () => {
        const balances = $scope.model.balanceEntries.map(entry => {
          return (({ asset, amount, price }) => ({ asset, amount, price }))(entry)
        })

        resetErrorMessage()
        return balanceService.updateBalance(balances)
          .then($scope.resetAssetInputs)
          .then(loadBalance)
          .catch(errorHandler)
      }

      $scope.resetAssetInputs = () => {
        $scope.model.editEntryIndex = $scope.ADD_MODE
        $scope.inputs = EMPTY_INPUTS
      }

      $interval(updatePrices, 20000)
      return Promise.all([loadBalance(), updatePrices()])
    }])
  .service('balanceService', ['$http', 'tickerService', function ($http, tickerService) {
    const BALANCE_ENDPOINT = '/api/balance'
    const BINANCE_MARKET_ENDPOINT = '/api/markets/binance'

    const getMarketPrices = () => $http.get(BINANCE_MARKET_ENDPOINT)
      .then(response => response.data)

    const getBalance = () => $http.get(BALANCE_ENDPOINT)
      .then(response => response.data)

    const addBalanceEntry = newBalanceEntry => $http.post(BALANCE_ENDPOINT, newBalanceEntry)

    const updateBalance = newBalance => $http.put(BALANCE_ENDPOINT, newBalance)

    const getLatestBitcoinPrice = () => tickerService.getLatestBitcoinPrice()

    return {
      getMarketPrices,
      getBalance,
      addBalanceEntry,
      updateBalance,
      getLatestBitcoinPrice
    }
  }])
