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
      orange: 'rgb(255, 159, 64)',
      yellow: 'rgb(255, 205, 86)',
      green: 'rgb(18, 107, 62)',
      lightgreen: 'rgb(67, 156, 111)',
      grey: 'rgb(181, 183, 187)'
    }
    const colorNames = Object.keys(chartColors)

    const tickerChart = new Chart('tickerChart', {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: {
        legend: { display: true },
        scales: {
          xAxes: [{ type: 'time', time: { tooltipFormat: 'll HH:mm' } }],
          yAxes: [{ scaleLabel: { display: true, labelString: 'GBP/Ƀ' }, position: 'right' }]
        }
      }
    })

    const lineOptions = (borderColor, backgroundColor) => {
      return {
        borderColor, lineTension: 0, spanGaps: false, backgroundColor, fill: false
      }
    }

    $scope.model = {
      tickerChart,
      data: tickerChart.data,
      chartFill: $location.search()['fill'] === true,
      activeButtons: []
    }
    const updateActiveButton = period => {
      $scope.model.activeButtons = $('.toggle-group').toArray()
        .map(el => el.getAttribute('ng-click').includes(period))
    }

    const updateDatasetFillings = () => $scope.model.data.datasets.forEach((dataset, ix) => {
      dataset.fill = $scope.model.chartFill && (ix % 2 > 0) ? (ix - 1) : false
    })

    const updatePeriodQuery = period => $location.search('period', period)
    const updateFillQuery = fill => $location.search('fill', fill)

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

          return Object.assign(dataset, lineOptions(borderColor, backgroundColor))
        })
        $scope.model.data.datasets = fullGraphData
        if ($scope.model.tickerChart.ctx) {
          updateDatasetFillings()
          updateActiveButton(period)
          updatePeriodQuery(period)
          $scope.model.tickerChart.update(600)
        }
      })

    const initialPeriod = $location.search()['period'] || '1d'
    return $scope.updateTicker(initialPeriod)
  }])
