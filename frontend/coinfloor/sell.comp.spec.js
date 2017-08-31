/* global inject */

describe('coinfloor sell component', () => {
  let $rootScope, $compile

  beforeEach(module('tantalus'))
  beforeEach(module('testTemplates'))

  beforeEach(inject((_$rootScope_, _$compile_) => {
    $rootScope = _$rootScope_
    $compile = _$compile_
  }))

  const createComponent = () => {
    const $scope = $rootScope.$new()
    const componentElement = $compile('<coinfloor-sell></coinfloor-sell>')($scope)
    $scope.$apply()
    return componentElement
  }

  it('render template', () => {
    const div = createComponent().find('div')
    console.log(div.html())
    div.html().should.contain('hello')
  })
})