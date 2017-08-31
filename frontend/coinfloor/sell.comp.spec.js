/* global inject */

describe('coinfloor sell component', () => {
  let $rootScope, $controller

  beforeEach(module('tantalus'))
  beforeEach(module('testTemplates'))

  beforeEach(inject((_$controller_, _$rootScope_, _$compile_) => {
    $controller = _$controller_
    $rootScope = _$rootScope_
  }))

  const controllerScope = () => {
    const $scope = $rootScope.$new()
    $controller('CoinfloorSellController', { $scope })
    return $scope
  }

  it('render template', () => {
    const $scope = controllerScope()
    $scope.inputs = { sell: 2551.81, targetRate: 3605, variant: 10 }

    $scope.$digest()
    $scope.results.should.have.length(expectedResult.length)
    $scope.results.should.deep.equal(expectedResult)
  })
})

const expectedResult = [
  { price: 3595, buy: 0.7098, cost: 2551.73, diff: 0.08 },
  { price: 3596, buy: 0.7096, cost: 2551.72, diff: 0.09 },
  { price: 3597, buy: 0.7094, cost: 2551.71, diff: 0.10 },
  { price: 3598, buy: 0.7092, cost: 2551.70, diff: 0.11 },
  { price: 3599, buy: 0.709, cost: 2551.69, diff: 0.12 },
  { price: 3600, buy: 0.7088, cost: 2551.68, diff: 0.13 },
  { price: 3601, buy: 0.7086, cost: 2551.66, diff: 0.15 },
  { price: 3602, buy: 0.7084, cost: 2551.65, diff: 0.16 },
  { price: 3603, buy: 0.7082, cost: 2551.64, diff: 0.17 },
  { price: 3604, buy: 0.708, cost: 2551.63, diff: 0.18 },
  { price: 3605, buy: 0.7078, cost: 2551.61, diff: 0.20 },
  { price: 3606, buy: 0.7076, cost: 2551.60, diff: 0.21 },
  { price: 3607, buy: 0.7074, cost: 2551.59, diff: 0.22 },
  { price: 3608, buy: 0.7072, cost: 2551.57, diff: 0.24 },
  { price: 3609, buy: 0.707, cost: 2551.56, diff: 0.25 },
  { price: 3610, buy: 0.7068, cost: 2551.54, diff: 0.27 },
  { price: 3611, buy: 0.7066, cost: 2551.53, diff: 0.28 },
  { price: 3612, buy: 0.7064, cost: 2551.51, diff: 0.30 },
  { price: 3613, buy: 0.7062, cost: 2551.50, diff: 0.31 },
  { price: 3614, buy: 0.706, cost: 2551.48, diff: 0.33 },
  { price: 3615, buy: 0.7058, cost: 2551.46, diff: 0.35 }
]
