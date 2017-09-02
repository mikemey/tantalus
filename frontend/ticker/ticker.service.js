/* global angular */

const UPDATE_PERIOD = 20000
const EMPTY_TICKER = { created: null, tickers: [] }

angular.module('tantalus.ticker')
  .service('tickerService', ['$rootScope', '$http', '$interval', function ($rootScope, $http, $interval) {
    const $scope = $rootScope.$new()
    $scope.watchCounter = 0
    $scope.latestTicker = EMPTY_TICKER

    const getLatestTicker = () => $http.get('/api/tickers/latest')
      .then(response => { $scope.latestTicker = response.data })
      .catch(error => {
        $scope.latestTicker = EMPTY_TICKER
        console.log('error fetching latest ticker [%s] %s', error.status, error.statusText)
      })
      .then(() => $scope.latestTicker)

    const startUpdate = () => {
      $scope.stop = $interval(getLatestTicker, UPDATE_PERIOD)
    }

    const stopUpdate = () => {
      if ($scope.stop) $interval.cancel($scope.stop)
    }

    const increaseWatchers = () => {
      if ($scope.watchCounter <= 0) startUpdate()
      $scope.watchCounter++
    }

    const decreaseWatcher = () => {
      $scope.watchCounter--
      if ($scope.watchCounter <= 0) stopUpdate()
    }

    const watchTicker = (watcherScope, callback) => {
      increaseWatchers()
      $scope.$watch('latestTicker', (newValue, _) => callback(newValue), true)
      watcherScope.$on('$destroy', decreaseWatcher)
    }

    const getGraphData = () => Promise.resolve([{
      label: 'solidi ask',
      data: [
        { x: '2017-08-10T00:26:00.256Z', y: 3856.08 },
        { x: '2017-08-02T00:26:00.256Z', y: 3454.12 }
      ]
    }, {
      label: 'lakebtc bid',
      data: [
        { x: '2017-08-05T00:26:00.256Z', y: 3856.08 },
        { x: '2017-08-02T00:26:00.256Z', y: 3490 }
      ]
    }])

    // real implementation:
    // const getGraphData = () => $http.get('/api/tickers/graph')
    //   .then(response => response.data)
    //   .catch(error => {
    //     console.log('error fetching graph data [%s] %s', error.status, error.statusText)
    //   })

    $scope.$on('$destroy', stopUpdate)
    return {
      getLatestTicker,
      watchTicker,
      getGraphData
    }
  }])
