/* global angular Chart $ */

const chartCtrlName = 'ChartController'

angular.module('tantalus.ticker')
  .component('tickerChart', {
    controller: chartCtrlName,
    templateUrl: 'ticker/ticker-chart.html'
  })
  .controller(chartCtrlName, ['$scope', '$location', 'tickerService', function ($scope, $location, tickerService) {
    const colorHelper = Chart.helpers.color
    const chartColors = {
      blue: 'rgb(39, 101, 223)',
      lightblue: 'rgb(54, 162, 235)',
      green: 'rgb(18, 107, 62)',
      lightgreen: 'rgb(67, 156, 111)',
      orange: 'rgb(255, 159, 64)',
      yellow: 'rgb(255, 205, 86)',
      lightturq: 'rgb(1, 127, 133)',
      turq: 'rgb(30, 192, 200)',
      grey: 'rgb(181, 183, 187)'
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
              displayFormats: {
                hour: 'H:mm',
                day: 'ddd DD.MM'
              },
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

    const lineOptions = (borderColor, backgroundColor, hidden) => {
      return {
        borderColor, lineTension: 0, spanGaps: false, backgroundColor, fill: false, hidden
      }
    }

    const updatePeriodQuery = period => $location.search('period', period)
    const getPeriodQuery = period => $location.search()['period']
    const updateFillQuery = fill => $location.search('fill', fill)
    const getFillQuery = () => $location.search()['fill']

    const lineParamName = lineLabel => 'hide_' + lineLabel.replace(/\s/, '_')
    const updateHiddenLineQuery = (lineLabel, hidden) => $location.search(lineParamName(lineLabel), hidden)
    const getHiddenLineQuery = lineLabel => $location.search()[lineParamName(lineLabel)]

    $scope.model = {
      tickerChart,
      data: tickerChart.data,
      chartFill: getFillQuery() === true,
      activeButtons: []
    }
    const updateActiveButton = period => {
      $scope.model.activeButtons = $('.toggle-group').toArray()
        .map(el => el.getAttribute('ng-click').includes(period))
    }

    const updateDatasetFillings = () => $scope.model.data.datasets.forEach((dataset, ix) => {
      dataset.fill = $scope.model.chartFill && (ix % 2 > 0) ? (ix - 1) : false
    })

    $scope.toggleFilling = () => {
      $scope.model.chartFill = !$scope.model.chartFill
      updateFillQuery($scope.model.chartFill)
      updateDatasetFillings()
      $scope.model.tickerChart.update(0)
    }

    $scope.updateTicker = period => tickerService.getGraphData(period)
      .then(graphData => {
        const fullGraphData = graphData.map((dataset, ix) => {
          const colorName = colorNames[ix % colorNames.length]
          const borderColor = chartColors[colorName]
          const backgroundColor = colorHelper(chartColors[colorName]).alpha(0.5).rgbString()
          const hidden = getHiddenLineQuery(dataset.label)

          return Object.assign(dataset, lineOptions(borderColor, backgroundColor, hidden))
        })
        $scope.model.data.datasets = fullGraphData
        if ($scope.model.tickerChart.ctx) {
          updateDatasetFillings()
          updateActiveButton(period)
          updatePeriodQuery(period)
          $scope.model.tickerChart.update(0)
        }
      })

    updateHiddenLineQuery('solidi ask', true)
    updateHiddenLineQuery('solidi bid', true)
    updateHiddenLineQuery('coindesk', true)
    const initialPeriod = getPeriodQuery() || '1d'
    return $scope.updateTicker(initialPeriod)
  }])
