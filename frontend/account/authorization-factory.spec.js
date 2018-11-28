/* global inject expect */

describe('Authorization factory', () => {
  let $httpBackend, authorization

  beforeEach(module('tantalus.account'))

  beforeEach(inject((_$httpBackend_, _authorization_) => {
    $httpBackend = _$httpBackend_
    authorization = _authorization_
  }))

  afterEach(() => {
    $httpBackend.verifyNoOutstandingExpectation()
    $httpBackend.verifyNoOutstandingRequest()
  })

  const username = 'auth-factory-test-user'
  const password = 'abcd'
  const accountData = { username }

  const expectLoginRequest = () => $httpBackend.expectPOST('/api/users/login', { username, password })
    .respond(204)

  const expectGetAccountRequest = () => $httpBackend.expectGET('/api/users/account')
    .respond(200, accountData)

  const expectGetAccountLoginPage = () => $httpBackend.expectGET('account/login.html')
    .respond(200, '<html>some</html>')

  const expectLogoutRequest = () => $httpBackend
    .expectPOST('/api/users/logout').respond(204)

  it('returns empty account data when not logged in', () => {
    expect(authorization.getAccount()).to.equal(null)
  })

  it('forwards login', () => {
    expectLoginRequest()
    authorization.login(username, password)

    $httpBackend.flush()
  })

  it('reloads account data', () => {
    expectGetAccountRequest()
    authorization.reloadAccount()

    $httpBackend.flush()
    authorization.getAccount().should.deep.equal(accountData)
  })

  it('should forward logout and reset account data', () => {
    expectGetAccountRequest()
    authorization.reloadAccount()
    $httpBackend.flush()

    expectLogoutRequest()
    expectGetAccountLoginPage()
    authorization.logout()
    $httpBackend.flush()

    expect(authorization.getAccount()).to.equal(null)
  })

  it('returns empty account data when unauthorized', () => {
    const errorResponse = { error: 'Unauthorized' }
    $httpBackend.expectPOST('/api/users/login', { username, password })
      .respond(401, errorResponse)

    authorization.login(username, password)
      .catch(err => err.data.should.deep.equal(errorResponse))
    $httpBackend.flush()

    expect(authorization.getAccount()).to.equal(null)
  })
})
