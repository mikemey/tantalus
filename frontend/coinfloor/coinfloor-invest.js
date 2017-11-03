/* global angular */

const investControllerName = 'CoinfloorInvestController'

angular
  .module('tantalus.coinfloor')
  .component('coinfloorInvest', {
    controller: investControllerName,
    templateUrl: 'coinfloor/coinfloor-invest.html'
  })
  .controller(investControllerName, ['$scope', '$interval', '$http',
    function ($scope, $interval, $http) {
      $scope.model = {
        latestTransactions: [],
        dateLimit: 0
      }

      const requestTransactions = () => $http.get('/api/invest/transactions')
        .then(response => response.data)
        .catch(error => {
          console.log('error fetching transactions: [%s] %s', error.status, error.statusText)
          return []
        })

      const updateTransactionsChart = () => requestTransactions()
        .then(txs => {
          $scope.model.dateLimit = txs.cutoffTimestamp
          $scope.model.latestTransactions = txs.data
        })

      $scope.stop = $interval(updateTransactionsChart, 1500)
      $scope.$on('$destroy', () => $interval.cancel($scope.stop))
      return updateTransactionsChart()
    }])
