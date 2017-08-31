/* global angular */

const ticker = 'TickerController'

angular.module('tantalus.tickers')
  .component('latestTicker', {
    controller: ticker,
    templateUrl: 'tickers/latest.comp.html'
  })
  .controller(ticker, ['$scope', '$http', '$interval', ($scope, $http, $interval) => {
    $scope.model = { created: '', tickers: [] }

    const updateTicker = () => {
      $http.get('/api/tickers/latest')
        .then(response => {
          $scope.model.created = response.data.created
          $scope.model.tickers = response.data.tickers
        })
        .catch(error => {
          $scope.model.error = error
        })
    }

    updateTicker()
    const stop = $interval(updateTicker, 20000)
    $scope.$on('$destroy', () => $interval.cancel(stop))
  }])
