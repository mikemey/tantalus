/* global angular Chart moment */

const investControllerName = 'CoinfloorInvestController'

angular
  .module('tantalus.coinfloor')
  .component('coinfloorInvest', {
    controller: investControllerName,
    templateUrl: 'coinfloor/coinfloor-invest.html'
  })
  .controller(investControllerName, ['$scope', '$interval', '$http',
    function ($scope, $interval, $http) {
      const priceChart = new Chart('priceChart', {
        type: 'horizontalBar',
        data: {
          labels: [],
          datasets: [{
            data: []
          }]
        },
        options: {
          responsive: true,
          scales: {
            xAxes: [{
              barPercentage: 1.0,
              categoryPercentage: 1.0
            }],
            yAxes: [{
              position: 'right',
              ticks: {
                fontSize: 11,
                fontFamily: 'Courier, monospace',
                fontColor: '#000'
              }
            }]
          }
        }
      })

      const transactionChart = new Chart('transactionChart', {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          scales: {
            xAxes: [{
              type: 'time',
              time: {
                displayFormats: {
                  minute: 'H:mm'
                }
              }
            }],
            yAxes: [{
              position: 'right',
              ticks: {
                fontFamily: 'Courier, monospace',
                fontColor: '#000'
              }
            }]
          }
        }
      })

      $scope.model = {
        priceChart,
        priceChartData: priceChart.data,
        transactionChart,
        transactionChartData: transactionChart.data,
        latestTransactions: [],
        dateLimit: 0
      }

      const requestTransactions = () => $http.get('/api/invest/transactions')
        .then(response => response.data)
        .catch(error => {
          console.log('error fetching transactions: [%s] %s', error.status, error.statusText)
          return []
        })

      const fillPriceGaps = priceGroups => {
        const start = priceGroups[0].label
        const end = priceGroups[priceGroups.length - 1].label
        const priceRange = Array.from({ length: end - start + 1 }, (_, k) => k + start)

        return priceRange.map(price => {
          const priceGroup = priceGroups.find(group => group.label === price)
          return priceGroup || { label: price, weighted: 0 }
        })
      }

      const updateTransactionsChart = () => requestTransactions()
        .then(txs => {
          $scope.model.dateLimit = txs.cutoffTimestamp
          $scope.model.latestTransactions = txs.transactionList

          const filledPriceGroups = fillPriceGaps(txs.priceGroups).reverse()
          $scope.model.priceChartData.labels = filledPriceGroups.map(group => group.label)
          $scope.model.priceChartData.datasets = [{
            data: filledPriceGroups.map(group => group.weighted),
            borderWidth: 0,
            backgroundColor: filledPriceGroups.map(group =>
              group.label === txs.latestPrice
                ? 'rgba(255,120,120,0.5)'
                : 'rgba(151,187,255,0.7)'
            )
          }]
          $scope.model.priceChart.update(0)

          $scope.model.transactionChartData.datasets = [{
            data: txs.transactionList.map(tx => {
              const x = moment.unix(tx.date)
              const y = tx.price
              return { x, y }
            }),
            fill: false,
            borderColor: 'rgb(151,187,255)',
            backgroundColor: 'rgb(151,187,255)',
            borderWidth: 4
          }]
          $scope.model.transactionChart.update(0)
        })

      $scope.stop = $interval(updateTransactionsChart, 1500)
      $scope.$on('$destroy', () => $interval.cancel($scope.stop))
      return updateTransactionsChart()
    }])
