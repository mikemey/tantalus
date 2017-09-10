/* global inject */

describe('Authorization factory', () => {
  let $httpBackend, $location, authorization

  beforeEach(module('tantalus.account'))

  beforeEach(inject((_$httpBackend_, _$location_, _authorization_) => {
    $httpBackend = _$httpBackend_
    $location = _$location_
    authorization = _authorization_
  }))

  afterEach(() => {
    $httpBackend.verifyNoOutstandingExpectation()
    $httpBackend.verifyNoOutstandingRequest()
  })

  const accountData = { username: 'test-user' }

  const expectGetAccountRequest = () => $httpBackend
    .expectGET('/api/users/account').respond(200, accountData)

  const expectLogoutRequest = () => $httpBackend
    .expectPOST('/api/users/logout').respond(204)

  const loginLogoutCycle = () => {
    expectGetAccountRequest()
    authorization.getAccount()
    $httpBackend.flush()

    expectLogoutRequest()
    authorization.logout()
    $httpBackend.flush()
  }

  it('requests account data', () => {
    expectGetAccountRequest()
    let result
    authorization.getAccount().then(account => { result = account })

    $httpBackend.flush()
    result.should.deep.equal(accountData)
  })

  it('should not re-request account data', () => {
    expectGetAccountRequest()
    authorization.getAccount()
    $httpBackend.flush()

    return authorization.getAccount()
      .then(account => {
        account.should.deep.equal(accountData)
      })
  })

  it('should forward logout', () => loginLogoutCycle())

  it('should re-request account data after logout', () => {
    loginLogoutCycle()
    expectGetAccountRequest()

    let result
    authorization.getAccount().then(account => { result = account })
    $httpBackend.flush()
    result.should.deep.equal(accountData)
  })

  it('should redirect to login when unauthorized', () => {
    $httpBackend.expectGET('/api/users/account')
      .respond(401, { error: 'Unauthorized' })

    authorization.getAccount()

    $httpBackend.flush()
    $location.path().should.equal('/account/login')
  })
})
