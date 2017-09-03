/* global angular Chart $ */

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

    const updateActiveButton = period => {
      angular.forEach($('a.toggle-group'), el => {
        const button = angular.element(el)
        return button.attr('ng-click').includes(period)
          ? button.addClass('disabled')
          : button.removeClass('disabled')
      })
    }

    const options = {
      legend: { display: true, position: 'top' },
      scales: {
        xAxes: [{ type: 'time', time: { tooltipFormat: 'll HH:mm' } }],
        yAxes: [{ scaleLabel: { display: true, labelString: 'GBP/Ƀ' } }]
      }
    }

    const data = { labels: [], datasets: [] }
    const tickerChart = new Chart('tickerChart', {
      type: 'line', data, options
    })

    $scope.model = {
      tickerChart,
      data,
      chartFilled: false
    }

    const updateDatasetFillings = () => $scope.model.data.datasets.forEach((dataset, ix) => {
      dataset.fill = $scope.model.chartFilled && (ix % 2 > 0) ? (ix - 1) : false
    })

    $scope.toggleFilling = (updateChart = true) => {
      $scope.model.chartFilled = !$scope.model.chartFilled
      updateDatasetFillings()
      if (updateChart) $scope.model.tickerChart.update(0)
    }

    $scope.updateTicker = period => {
      tickerService.getGraphData(period)
        .then(graphData => {
          const fullGraphData = graphData.map((dataset, ix) => {
            const colorName = colorNames[ix % colorNames.length]
            const borderColor = chartColors[colorName]
            const backgroundColor = colorHelper(chartColors[colorName]).alpha(0.5).rgbString()

            return Object.assign(dataset, {
              borderColor,
              backgroundColor,
              fill: false
            })
          })
          $scope.model.data.datasets = fullGraphData
          if ($scope.model.tickerChart.ctx) {
            updateDatasetFillings()
            updateActiveButton(period)
            $scope.model.tickerChart.update(600)
          }
        })
    }

    return $scope.updateTicker('1w')
  }])
