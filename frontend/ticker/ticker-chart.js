/* global angular Chart $ */

const chartCtrlName = 'ChartController'

const TICKERS = [
  'coinfloor bid',
  'coinfloor ask',
  'gdax bid',
  'gdax ask',
  'coindesk'
]

const FORCE_TIME = {
  '100min': 'minute',
  '1d': 'hour',
  '1w': 'day',
  '1m': 'day',
  '3m': 'day',
  '1y': 'month'
}

const QUERY_PERIOD = 'period'
const QUERY_FILL = 'fill'
const QUERY_HIDE = 'h_'

angular.module('tantalus.ticker')
  .component('tickerChart', {
    controller: chartCtrlName,
    templateUrl: 'ticker/ticker-chart.html'
  })
  .controller(chartCtrlName, ['$scope', '$location', '$interval', 'tickerService',
    function ($scope, $location, $interval, tickerService) {
      const colorHelper = Chart.helpers.color
      const chartColors = {
        green: 'rgb(18, 107, 62)',
        lightgreen: 'rgb(67, 156, 111)',
        blue: 'rgb(39, 101, 223)',
        lightblue: 'rgb(54, 162, 235)',
        grey: 'rgb(181, 183, 187)',
        orange: 'rgb(255, 159, 64)',
        yellow: 'rgb(255, 205, 86)',
        lightturq: 'rgb(1, 127, 133)',
        turq: 'rgb(30, 192, 200)'
      }
      const colorNames = Object.keys(chartColors)

      const tickerChart = new Chart('tickerChart', {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: {
          legend: {
            display: true,
            onClick: (_, legendItem) => {
              const meta = $scope.model.tickerChart.getDatasetMeta(legendItem.datasetIndex)

              const hiddenParam = getHiddenLineQuery(legendItem.text)
              meta.hidden = hiddenParam !== true

              const newHiddenParam = meta.hidden ? true : null
              updateHiddenLineQuery(legendItem.text, newHiddenParam)

              $scope.$apply()
              $scope.model.tickerChart.update(0)
            }
          },
          scales: {
            xAxes: [{
              type: 'time',
              time: {
                unit: '',
                displayFormats: {
                  minute: 'H:mm',
                  hour: 'H:mm',
                  day: 'DD. MMM',
                  week: 'DD. MMM',
                  month: 'MMM YYYY'
                },
                isoWeekday: true,
                tooltipFormat: 'll HH:mm'
              }
            }],
            yAxes: [{
              scaleLabel: { display: true, labelString: 'GBP/Ƀ' },
              position: 'right',
              ticks: {
                fontSize: 16,
                fontFamily: 'Courier, monospace',
                fontColor: '#000'
              }
            }]
          }
        }
      })

      const loadGraphData = () => {
        const initialPeriod = getPeriodQuery() || '1d'
        return $scope.updateTicker(initialPeriod)
      }

      const getPeriodQuery = () => $location.search()[QUERY_PERIOD]
      const updatePeriodQuery = period => $location.search(QUERY_PERIOD, period)

      const updateFillQuery = fill => $location.search(QUERY_FILL, fill)
      const getFillQuery = () => $location.search()[QUERY_FILL]

      const updateHiddenLineQuery = (lineLabel, hidden) => $location.search(lineParamName(lineLabel), hidden)
      const getHiddenLineQuery = lineLabel => $location.search()[lineParamName(lineLabel)]
      const lineParamName = lineLabel => QUERY_HIDE + lineLabel.replace(/\s/, '_')

      $scope.model = {
        tickerChart,
        data: tickerChart.data,
        setTimeUnit: timeUnit => { tickerChart.options.scales.xAxes[0].time.unit = timeUnit },
        chartFill: getFillQuery() === true,
        activeButtons: []
      }

      $scope.updateTicker = period => tickerService.getGraphData(period)
        .then(graphData => {
          $scope.model.data.datasets = enhanceGraphData(graphData)
          if ($scope.model.tickerChart.ctx) {
            updateDatasetFillings()
            updateActiveButton(period)
            updatePeriodQuery(period)
            updateChartTime(period)
            $scope.model.tickerChart.update(0)
          }
        })

      $scope.toggleFilling = () => {
        $scope.model.chartFill = !$scope.model.chartFill
        updateFillQuery($scope.model.chartFill)
        updateDatasetFillings()
        $scope.model.tickerChart.update(0)
      }

      const enhanceGraphData = datasets => datasets
        .filter(dataset => TICKERS.includes(dataset.label))
        .sort((datasetA, datasetB) => TICKERS.indexOf(datasetA.label) - TICKERS.indexOf(datasetB.label))
        .map((dataset, ix) => {
          const colorName = colorNames[ix % colorNames.length]
          const borderColor = chartColors[colorName]
          const backgroundColor = colorHelper(chartColors[colorName]).alpha(0.5).rgbString()
          const hidden = getHiddenLineQuery(dataset.label)

          return Object.assign(dataset, lineOptions(borderColor, backgroundColor, hidden))
        })

      const lineOptions = (borderColor, backgroundColor, hidden) => {
        return {
          borderColor, lineTension: 0, spanGaps: false, backgroundColor, fill: false, hidden
        }
      }

      const updateDatasetFillings = () => $scope.model.data.datasets.forEach((dataset, ix) => {
        dataset.fill = $scope.model.chartFill && (ix % 2 > 0) ? (ix - 1) : false
      })

      const updateActiveButton = period => {
        $scope.model.activeButtons = $('.toggle-group').toArray()
          .map(el => el.getAttribute('ng-click').includes(period))
      }

      const updateChartTime = period => {
        $scope.model.setTimeUnit(FORCE_TIME[period])
      }

      $scope.stop = $interval(loadGraphData, 20000)
      $scope.$on('$destroy', () => $interval.cancel($scope.stop))
      return loadGraphData()
    }])
