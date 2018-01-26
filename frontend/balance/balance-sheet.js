
const balanceSheetControllerName = 'BalanceSheetController'

angular
  .module('tantalus.account')
  .component('balanceSheet', {
    controller: balanceSheetControllerName,
    templateUrl: 'balance/balance-sheet.html',
    bindings: {
      editable: '='
    }
  })
  .controller(balanceSheetControllerName, ['$scope', '$interval', 'balanceService',
    function ($scope, $interval, balanceService) {
      const BTCGPB_ASSET = 'BTCGBP'
      const BINANCE_TRADING_FEE = 0.001
      const COINFLOOR_TRADING_FEE = 0.003

      const EMPTY_INPUTS = { asset: '', amount: null, price: null, link: null }

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
          recalculateInvestmentPercentage()
        } else {
          $scope.model.sums = null
        }
      }

      const recalculateBalanceEntry = currentBtcSymbol => balanceEntry => {
        const amount = balanceEntry.amount
        const buyingPrice = balanceEntry.price
        balanceEntry.priceDigits = getPriceDigits(buyingPrice)

        const isBtcAsset = balanceEntry.asset === BTCGPB_ASSET
        if (isBtcAsset) {
          balanceEntry.investmentGbp = buyingPrice * amount
        } else {
          balanceEntry.investmentBtc = buyingPrice * amount
        }

        const currentSymbol = getPriceSymbol(balanceEntry.asset)
        if (currentSymbol !== undefined) {
          const currentPrice = isBtcAsset
            ? currentSymbol.price - (currentSymbol.price * COINFLOOR_TRADING_FEE)
            : currentSymbol.price - (currentSymbol.price * BINANCE_TRADING_FEE)
          balanceEntry.currentPrice = currentPrice
          balanceEntry.changePercentage = (currentPrice - buyingPrice) / buyingPrice * 100

          if (isBtcAsset) {
            balanceEntry.volumeBtc = amount
          } else {
            balanceEntry.volumeBtc = currentPrice * amount
            balanceEntry.changeBtc = balanceEntry.volumeBtc - balanceEntry.investmentBtc
          }
          if (currentBtcSymbol !== undefined) {
            const currentBtcPrice = currentBtcSymbol.price
            balanceEntry.volumeGbp = currentBtcPrice * balanceEntry.volumeBtc
            balanceEntry.changeGbp = isBtcAsset
              ? balanceEntry.volumeGbp - balanceEntry.investmentGbp
              : currentBtcPrice * balanceEntry.changeBtc
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
        if (entry.investmentBtc) sums.investmentBtc += entry.investmentBtc
        if (entry.investmentGbp) sums.investmentGbp += entry.investmentGbp
        if (entry.changeBtc) sums.changeBtc += entry.changeBtc
        if (entry.changeGbp) sums.changeGbp += entry.changeGbp
        if (entry.volumeBtc) sums.volumeBtc += entry.volumeBtc
        if (entry.volumeGbp) sums.volumeGbp += entry.volumeGbp

        if (sums.changeBtc) sums.changePercentage = sums.changeBtc / sums.investmentBtc * 100
        return sums
      }, { investmentBtc: 0, investmentGbp: 0, changeBtc: 0, changeGbp: 0, volumeBtc: 0, volumeGbp: 0 })

      const recalculateInvestmentPercentage = () => $scope.model.balanceEntries.forEach(entry => {
        entry.investmentBtcPct = entry.investmentBtc / $scope.model.sums.investmentBtc * 100
      })

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
          asset: $scope.inputs.asset,
          link: $scope.inputs.link
        }).then(loadBalance)
          .catch(errorHandler)
      }

      $scope.setEditEntryIndex = entryIndex => {
        $scope.model.editEntryIndex = entryIndex
        $scope.inputs = $scope.model.balanceEntries[entryIndex]
      }

      $scope.storeBalanceEntries = () => {
        const balances = $scope.model.balanceEntries.map(entry => {
          return (({
            asset,
            amount,
            price,
            link
          }) => ({ asset, amount, price, link }))(entry)
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
        resetErrorMessage()
      }

      $scope.deleteEditAsset = () => {
        $scope.model.balanceEntries.splice($scope.model.editEntryIndex, 1)
        return $scope.storeBalanceEntries()
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
