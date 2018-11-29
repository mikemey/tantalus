/* global angular */
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
  .controller(balanceSheetControllerName, ['$scope', '$interval', '$window', 'balanceService',
    function ($scope, $interval, $window, balanceService) {
      const BTC_SYMBOL = 'BTC'
      const BTCGPB_ASSET = `${BTC_SYMBOL}GBP`
      const COINFLOOR_TRADING_FEE = 0.003
      const COLLAPSE_WIDTH = 1000

      const EMPTY_INPUTS = { asset: '', amount: null, invest: null, price: null, link: null }

      $scope.ADD_MODE = -1
      $scope.inputs = EMPTY_INPUTS
      $scope.refreshInvestInput = () => { $scope.inputs.invest = $scope.inputs.price * $scope.inputs.amount }
      $scope.refreshPriceInput = () => { $scope.inputs.price = $scope.inputs.invest / $scope.inputs.amount }

      $scope.model = {
        availableAssets: null,
        balanceEntries: [],
        pricesDate: null,
        assetPrices: [],
        sums: null,
        editEntryIndex: $scope.ADD_MODE,
        errorMessage: '',
        collapseTable: false,
        expandOverwrite: false,
        showCollapseToggle: false
      }

      const window = angular.element($window)
      const updateTableCollapse = () => {
        $scope.model.showCollapseToggle = window.width() < COLLAPSE_WIDTH
        $scope.model.collapseTable = $scope.model.showCollapseToggle && !$scope.model.expandOverwrite
      }

      $scope.toggleTableCollapse = () => {
        $scope.model.expandOverwrite = !$scope.model.expandOverwrite
        updateTableCollapse()
      }

      window.bind('resize', () => {
        updateTableCollapse()
        $scope.$apply()
      })
      updateTableCollapse()

      const getPriceSymbol = asset => $scope.model.assetPrices.find(symbolPrice => symbolPrice.symbol === asset)

      const errorHandler = error => {
        console.log('error:')
        console.log(error)
        if (error.data && error.data.error) $scope.model.errorMessage += `${error.data.error}\n`
      }
      const resetErrorMessage = () => { $scope.model.errorMessage = '' }

      const recalculateBalanceData = () => {
        const currentBtcSymbol = getPriceSymbol(BTCGPB_ASSET)
        $scope.model.balanceEntries.forEach(calculateBalanceEntry(currentBtcSymbol))
        $scope.model.balanceEntries.forEach(colorizeBalanceEntry)
        if ($scope.model.balanceEntries.length > 1) {
          $scope.model.sums = summarizeBalance()
          recalculateInvestmentPercentage()
        } else {
          $scope.model.sums = null
        }
      }

      const calculateBalanceEntry = currentBtcSymbol => balanceEntry => {
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
            : currentSymbol.price
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

      const colorizeBalanceEntry = balanceEntry => {
        balanceEntry.changePercentageStyle = getStyleForPercentage(balanceEntry.changePercentage)
      }

      const percentageCellStyle = (red, green) => alpha => `background-color: rgba(${red}, ${green}, 0, ${alpha});`
      const greenCellStyle = percentageCellStyle(0, 255)
      const redCellStyle = percentageCellStyle(255, 0)

      const getStyleForPercentage = percentage => {
        const alpha = Math.min(1.0, Math.abs(percentage) / 50)
        return percentage > 0 ? greenCellStyle(alpha) : redCellStyle(alpha)
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

      const recalculateInvestmentPercentage = () => {
        const btcAltcoinSum = $scope.model.balanceEntries.reduce((sum, current) => {
          return current.investmentBtc
            ? sum + current.investmentBtc
            : sum + current.amount
        }, 0)
        $scope.model.balanceEntries.forEach(entry => {
          entry.investmentBtcPct = entry.investmentBtc
            ? entry.investmentBtc / btcAltcoinSum * 100
            : entry.amount / btcAltcoinSum * 100
        })
      }

      const loadBalance = () => balanceService.getBalance()
        .then(balance => { $scope.model.balanceEntries = balance.entries })
        .then(updatePrices)

      const updatePrices = () => {
        const userAssets = $scope.model.balanceEntries
          .filter(entry => entry.asset !== BTCGPB_ASSET)
          .map(entry => entry.asset)
        return Promise.all([
          balanceService.getMarketPrices(userAssets),
          balanceService.getLatestBitcoinPrice()
        ]).then(([assetPrices, btcPrice]) => {
          $scope.model.pricesDate = new Date()
          assetPrices.unshift({ symbol: BTCGPB_ASSET, price: btcPrice })
          $scope.model.assetPrices = assetPrices
          recalculateBalanceData()
          $scope.$apply()
        }).catch(errorHandler)
      }

      $scope.setEditEntryIndex = entryIndex => {
        $scope.model.editEntryIndex = entryIndex
        $scope.inputs = $scope.model.balanceEntries[entryIndex]
        $scope.refreshInvestInput()
      }

      $scope.storeBalanceEntries = () => {
        resetErrorMessage()
        const storePromise = $scope.model.editEntryIndex === $scope.ADD_MODE
          ? addEntry
          : updateEntries
        return storePromise()
          .then($scope.resetAssetInputs)
          .then(loadBalance)
          .catch(errorHandler)
      }

      const addEntry = () => balanceService.addBalanceEntry({
        amount: $scope.inputs.amount,
        price: $scope.inputs.price,
        asset: $scope.inputs.asset,
        link: $scope.inputs.link
      })

      const cleanBalanceEntry = ({ asset, amount, price, link }) => ({ asset, amount, price, link })
      const updateEntries = () => balanceService.updateBalance(
        $scope.model.balanceEntries.map(cleanBalanceEntry)
      )

      $scope.resetAssetInputs = () => {
        $scope.model.editEntryIndex = $scope.ADD_MODE
        $scope.inputs = EMPTY_INPUTS
        resetErrorMessage()
      }

      $scope.deleteEditAsset = () => {
        $scope.model.balanceEntries.splice($scope.model.editEntryIndex, 1)
        return $scope.storeBalanceEntries()
      }

      $scope.loadAvailableSymbols = () => {
        if ($scope.model.availableAssets) {
          return Promise.resolve()
        }
        return balanceService.getAvailableSymbols()
          .then(response => {
            const btcPrices = response.symbols.filter(symbol => symbol.endsWith(BTC_SYMBOL))
            btcPrices.unshift(BTCGPB_ASSET)
            $scope.model.availableAssets = btcPrices
          })
          .catch(errorHandler)
      }

      $scope.stop = $interval(updatePrices, 20000)
      $scope.$on('$destroy', () => $interval.cancel($scope.stop))
      return loadBalance()
    }])
  .service('balanceService', ['$http', 'tickerService', function ($http, tickerService) {
    const BALANCE_ENDPOINT = '/api/balance'
    const BINANCE_MARKET = '/api/markets/binance'
    const BINANCE_SYMBOLS_ENDPOINT = `${BINANCE_MARKET}/symbols`
    const binancePricesEndpoint = query => `${BINANCE_MARKET}?symbols=${query}`

    const getAvailableSymbols = () => $http.get(BINANCE_SYMBOLS_ENDPOINT)
      .then(response => response.data)

    const getMarketPrices = symbols => {
      if (!symbols.length) return Promise.resolve([])
      const query = symbols.join(',')
      return $http.get(binancePricesEndpoint(query))
        .then(response => response.data)
    }

    const getBalance = () => $http.get(BALANCE_ENDPOINT)
      .then(response => response.data)

    const addBalanceEntry = newBalanceEntry => $http.post(BALANCE_ENDPOINT, newBalanceEntry)

    const updateBalance = newBalance => $http.put(BALANCE_ENDPOINT, newBalance)

    const getLatestBitcoinPrice = () => tickerService.getLatestBitcoinPrice()

    return {
      getAvailableSymbols,
      getMarketPrices,
      getBalance,
      addBalanceEntry,
      updateBalance,
      getLatestBitcoinPrice
    }
  }])
