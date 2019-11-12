/* global inject */

describe('Login controller', () => {
  let $rootScope, $httpBackend, $controller

  beforeEach(module('tantalus.account'))

  beforeEach(inject((_$rootScope_, _$httpBackend_, _$controller_) => {
    $rootScope = _$rootScope_
    $httpBackend = _$httpBackend_
    $controller = _$controller_
  }))

  afterEach(() => {
    $httpBackend.verifyNoOutstandingExpectation()
    $httpBackend.verifyNoOutstandingRequest()
  })

  const username = 'my_name'
  const password = 'ladida'
  const testUser = { username, password }

  const expectLoginPost = () => $httpBackend.expectPOST('/api/users/login', testUser)

  const LocationRecorder = (searchParams = {}) => {
    let currentUrl = null
    const currentSearch = searchParams
    return {
      url: newUrl => { currentUrl = newUrl },
      search: () => currentSearch,
      currentUrl: () => currentUrl
    }
  }

  const componentsAfterLogin = ($location = LocationRecorder()) => {
    const $scope = $rootScope.$new()
    const params = { $scope, $location }
    $controller('LoginController', params)

    $scope.model.data = { username, password }
    $scope.login()
    $httpBackend.flush()
    return { $scope, $location }
  }

  it('posts login and forwards to dashboard (no redirect param)', () => {
    expectLoginPost().respond(204)
    componentsAfterLogin().$location.currentUrl().should.equal('/dashboard')
  })

  it('posts login and forwards to redirect url', () => {
    expectLoginPost().respond(204)
    const redirectUrl = '/dashboard?period=3mo'
    componentsAfterLogin(LocationRecorder({ r: encodeURIComponent(redirectUrl) }))
      .$location.currentUrl().should.equal(redirectUrl)
  })

  it('shows error during login', () => {
    const errorMsg = 'login failed'
    expectLoginPost().respond(401, { error: errorMsg })
    componentsAfterLogin().$scope.model.error.should.equal(errorMsg)
  })

  it('shows generic error when server error', () => {
    expectLoginPost().respond(400, 'something wrong')
    componentsAfterLogin().$scope.model.error.should.equal('server error')
  })
})
