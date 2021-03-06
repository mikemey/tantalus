/* global inject */

describe('ticker chart component', () => {
  let $rootScope, $httpBackend, $controller, $compile, $location

  beforeEach(module('tantalus.ticker'))

  beforeEach(inject((_$rootScope_, _$httpBackend_, _$controller_, _$compile_, _$location_) => {
    $rootScope = _$rootScope_
    $httpBackend = _$httpBackend_
    $controller = _$controller_
    $compile = _$compile_
    $location = _$location_
  }))

  afterEach(() => {
    $httpBackend.verifyNoOutstandingExpectation()
    $httpBackend.verifyNoOutstandingRequest()
  })

  const backendData = [{
    label: 'binance ask',
    data: [
      { x: '2017-08-02T00:26:00.256Z', y: 3454.12 }
    ]
  }, {
    label: 'gdax bid',
    data: [
      { x: '2017-08-05T00:26:00.256Z', y: 3856.08 },
      { x: '2017-08-02T00:26:00.256Z', y: 3490 }
    ]
  }, {
    label: 'this is ignored',
    data: [
      { x: '2017-08-05T00:26:00.256Z', y: 3856.08 },
      { x: '2017-08-02T00:26:00.256Z', y: 3490 }
    ]
  }]

  const datasetOptions = optionsOverride => Object.assign(
    { fill: false, lineTension: 0, spanGaps: false, hidden: undefined },
    optionsOverride
  )

  const expectedDatasets = [
    datasetOptions({
      label: 'binance ask',
      backgroundColor: 'rgba(18, 107, 62, 0.5)',
      borderColor: 'rgb(18, 107, 62)',
      data: [{ x: '2017-08-02T00:26:00.256Z', y: 3454.12 }]
    }),
    datasetOptions({
      label: 'gdax bid',
      backgroundColor: 'rgba(67, 156, 111, 0.5)',
      borderColor: 'rgb(67, 156, 111)',
      data: [
        { x: '2017-08-05T00:26:00.256Z', y: 3856.08 },
        { x: '2017-08-02T00:26:00.256Z', y: 3490 }
      ]
    })
  ]

  const createChartComponent = () => {
    const $scope = $rootScope.$new()

    const controller = $controller('ChartController', { $scope })
    $scope.chartController = controller
    $compile('<tickerChart></tickerChart>')($scope)
    return $scope
  }

  const expectGetRequest = (period = '1d') => $httpBackend
    .expectGET(`/api/tickers/graph?period=${period}`).respond(200, backendData)

  it('transforms ticker data', () => {
    expectGetRequest()
    const $scope = createChartComponent()

    $httpBackend.flush()
    $scope.model.chartFill.should.equal(false)
    $scope.model.data.datasets.should.deep.equal(expectedDatasets)
  })

  it('uses query params as model input', () => {
    const period = 'lala'
    $location.search('period', period)
    $location.search('fill', true)
    expectGetRequest(period)

    const $scope = createChartComponent()

    $httpBackend.flush()
    $scope.model.chartFill.should.equal(true)
  })

  it('converts filled query param when false', () => {
    $location.search('fill', false)
    expectGetRequest()

    const $scope = createChartComponent()

    $httpBackend.flush()
    $scope.model.chartFill.should.equal(false)
  })

  it('converts filled query param when "false"', () => {
    const chartFill = 'false'
    $location.search('fill', chartFill)
    expectGetRequest()

    const $scope = createChartComponent()

    $httpBackend.flush()
    $scope.model.chartFill.should.equal(false)
  })
})
