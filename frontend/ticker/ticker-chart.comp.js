/* global angular Chart */

const chartCtrlName = 'ChartController'

angular.module('tantalus.ticker')
  .component('tickerChart', {
    controller: chartCtrlName,
    templateUrl: 'ticker/ticker-chart.comp.html'
  })
  .controller(chartCtrlName, ['$scope', 'tickerService', function ($scope, tickerService) {
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

    $scope.options = {
      legend: { display: true, position: 'top' },
      scales: {
        xAxes: [{ type: 'time', time: { tooltipFormat: 'll HH:mm' } }],
        yAxes: [{ scaleLabel: { display: true, labelString: 'GBP/Ƀ' } }]
      }
    }

    $scope.data = { labels: [], datasets: [] }
    $scope.tickerChart = new Chart('tickerChart', {
      type: 'line', data: $scope.data, options: $scope.options
    })

    $scope.updateTicker = period => tickerService.getGraphData(period)
      .then(graphData => {
        const fullGraphData = graphData.map((graph, ix) => {
          const colorName = colorNames[ix % colorNames.length]
          const borderColor = chartColors[colorName]
          const backgroundColor = colorHelper(chartColors[colorName]).alpha(0.5).rgbString()
          return Object.assign(graph, {
            borderColor,
            backgroundColor,
            fill: false
          })
        })
        $scope.data.datasets = fullGraphData
        if ($scope.tickerChart.ctx) $scope.tickerChart.update(500)
      })

    return $scope.updateTicker('1w')
  }])
