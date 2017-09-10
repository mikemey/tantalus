/* global inject */

describe.only('account details component', () => {
  let $rootScope, $compile

  beforeEach(module('testTemplates'))
  beforeEach(module('tantalus.account'))

  beforeEach(inject((_$rootScope_, _$compile_) => {
    $rootScope = _$rootScope_
    $compile = _$compile_
  }))

  const accountData = { username: 'test-user' }

  const createAccountDetailsComponent = () => {
    const $scope = $rootScope.$new()
    $scope.account = accountData
    const component = $compile('<account-details account="account"></account-details>')($scope)

    $scope.$apply()
    return component
  }

  it('shows user data', () => {
    const component = createAccountDetailsComponent()

    component.find('p').text().should.equal(accountData.username)
  })
})
