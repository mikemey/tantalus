/* global inject */

describe('coinfloor sell component', () => {
  let $rootScope, $controller

  beforeEach(module('tantalus'))
  beforeEach(module('testTemplates'))

  beforeEach(inject((_$controller_, _$rootScope_, _$compile_) => {
    $controller = _$controller_
    $rootScope = _$rootScope_
  }))

  const expectedResult = [
    { rate: '3595', buy: '0.7098', cost: '2551.731', diff: '0.079' },
    { rate: '3596', buy: '0.7096', cost: '2551.722', diff: '0.088' },
    { rate: '3597', buy: '0.7094', cost: '2551.712', diff: '0.098' },
    { rate: '3598', buy: '0.7092', cost: '2551.702', diff: '0.108' },
    { rate: '3599', buy: '0.7090', cost: '2551.691', diff: '0.119' },
    { rate: '3600', buy: '0.7088', cost: '2551.680', diff: '0.130' },
    { rate: '3601', buy: '0.7086', cost: '2551.669', diff: '0.141' },
    { rate: '3602', buy: '0.7084', cost: '2551.657', diff: '0.153' },
    { rate: '3603', buy: '0.7082', cost: '2551.645', diff: '0.165' },
    { rate: '3604', buy: '0.7080', cost: '2551.632', diff: '0.178' },
    { rate: '3605', buy: '0.7078', cost: '2551.619', diff: '0.191' },
    { rate: '3606', buy: '0.7076', cost: '2551.606', diff: '0.204' },
    { rate: '3607', buy: '0.7074', cost: '2551.592', diff: '0.218' },
    { rate: '3608', buy: '0.7072', cost: '2551.578', diff: '0.232' },
    { rate: '3609', buy: '0.7070', cost: '2551.563', diff: '0.247' },
    { rate: '3610', buy: '0.7068', cost: '2551.548', diff: '0.262' },
    { rate: '3611', buy: '0.7066', cost: '2551.533', diff: '0.277' },
    { rate: '3612', buy: '0.7064', cost: '2551.517', diff: '0.293' },
    { rate: '3613', buy: '0.7062', cost: '2551.501', diff: '0.309' },
    { rate: '3614', buy: '0.7060', cost: '2551.484', diff: '0.326' },
    { rate: '3615', buy: '0.7058', cost: '2551.467', diff: '0.343' }
  ]

  const mockTicker = ask => {
    return { tickers: [{ name: 'coinfloor', sell: ask }] }
  }

  const controllerScope = (latestTicker = mockTicker(1)) => {
    const $scope = $rootScope.$new()
    const tickerService = {
      getLatestTicker: () => Promise.resolve(latestTicker)
    }
    const ctrl = $controller('CoinfloorSellController', { $scope, tickerService })
    return { $scope, ctrl }
  }

  it('calculate new rates', () => {
    const { $scope } = controllerScope()
    $scope.inputs = { sell: 2551.81, targetRate: 3605, variant: 10, distance: 0.4 }
    $scope.$digest()

    $scope.results.should.have.length(expectedResult.length)
    $scope.results.should.deep.equal(expectedResult)
  })

  it('filters rates', () => {
    const { $scope } = controllerScope()
    $scope.inputs = { sell: 2551.81, targetRate: 3605, variant: 10, distance: 0.15 }
    $scope.$digest()

    $scope.results.should.deep.equal(expectedResult.slice(0, 7))
  })

  it('sets target rate from coinfloor ticker', () => {
    const coinfloorAsk = 3232
    const { $scope, ctrl } = controllerScope(mockTicker(coinfloorAsk))

    return ctrl.then(() => $scope.inputs.targetRate.should.equal(coinfloorAsk))
  })
})
