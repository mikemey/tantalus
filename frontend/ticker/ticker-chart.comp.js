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
      red: 'rgb(255, 99, 132)',
      green: 'rgb(75, 192, 192)',
      orange: 'rgb(255, 159, 64)',
      blue: 'rgb(54, 162, 235)',
      yellow: 'rgb(255, 205, 86)',
      purple: 'rgb(153, 102, 255)',
      grey: 'rgb(201, 203, 207)'
    }
    const colorNames = Object.keys(chartColors)

    $scope.options = {
      scales: {
        xAxes: [{ type: 'time', time: { tooltipFormat: 'll HH:mm' } }],
        yAxes: [{ scaleLabel: { display: true, labelString: 'GBP/Ƀ' } }]
      }
    }

    $scope.data = { datasets: [] }
    $scope.tickerChart = new Chart('tickerChart', {
      type: 'line', data: $scope.data, options: $scope.options
    })

    tickerService.getGraphData().then(graphData => {
      const fullGraphData = graphData.map((graph, ix) => {
        const colorName = colorNames[ix % colorNames.length]
        const borderColor = chartColors[colorName]
        const backgroundColor = colorHelper(chartColors[colorName]).alpha(0.5).rgbString()
        return Object.assign(graph, {
          backgroundColor,
          borderColor,
          fill: false
        })
      })
      $scope.data.datasets = fullGraphData
      if ($scope.tickerChart.ctx) $scope.tickerChart.update(200)
    })
  }])
