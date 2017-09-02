/* global inject */

describe('ticker chart component', () => {
  let $rootScope, $httpBackend, $controller, $compile

  beforeEach(module('tantalus.ticker'))

  beforeEach(inject((_$rootScope_, _$httpBackend_, _$controller_, _$compile_) => {
    $rootScope = _$rootScope_
    $httpBackend = _$httpBackend_
    $controller = _$controller_
    $compile = _$compile_
  }))

  afterEach(() => {
    $httpBackend.verifyNoOutstandingExpectation()
    $httpBackend.verifyNoOutstandingRequest()
  })

  const backendData = [{
    label: 'solidi ask',
    data: [
      { x: '2017-08-02T00:26:00.256Z', y: 3454.12 }
    ]
  }, {
    label: 'lakebtc bid',
    data: [
      { x: '2017-08-05T00:26:00.256Z', y: 3856.08 },
      { x: '2017-08-02T00:26:00.256Z', y: 3490 }
    ]
  }]

  const expectedDatasets = [{
    label: 'solidi ask',
    backgroundColor: 'rgba(39, 101, 223, 0.5)',
    borderColor: 'rgb(39, 101, 223)',
    fill: false,
    data: [
      { x: '2017-08-02T00:26:00.256Z', y: 3454.12 }
    ]
  }, {
    label: 'lakebtc bid',
    backgroundColor: 'rgba(54, 162, 235, 0.5)',
    borderColor: 'rgb(54, 162, 235)',
    fill: false,
    data: [
      { x: '2017-08-05T00:26:00.256Z', y: 3856.08 },
      { x: '2017-08-02T00:26:00.256Z', y: 3490 }
    ]
  }]

  const defaultPeriod = '1w'

  const createChartComponent = () => {
    const $scope = $rootScope.$new()

    const controller = $controller('ChartController', { $scope })
    $scope['chartController'] = controller
    $compile('<tickerChart></tickerChart>')($scope)
    $scope.$apply()
    return $scope
  }

  it('transforms ticker data', () => {
    $httpBackend.expectGET('/api/tickers/graph?period=' + defaultPeriod).respond(200, backendData)
    const $scope = createChartComponent()

    $httpBackend.flush()
    $scope.model.data.datasets.should.deep.equal(expectedDatasets)
  })
})
