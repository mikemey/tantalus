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

  it('posts login and forwards to account', () => {
    const locationRecorder = () => {
      let currentPath = null
      return {
        path: newPath => { currentPath = newPath },
        currentPath: () => currentPath
      }
    }

    const $scope = $rootScope.$new()
    const $location = locationRecorder()
    $controller('LoginController', { $scope, $location })

    $scope.model.data = { username, password }

    expectLoginPost().respond(204)

    $scope.login()
    $httpBackend.flush()

    $location.currentPath().should.equal('/account')
  })

  it('shows error during login', () => {
    const errorMsg = 'login failed'
    expectLoginPost().respond(401, { error: errorMsg })

    const $scope = $rootScope.$new()
    $controller('LoginController', { $scope })

    $scope.model.data = { username, password }
    $scope.login()
    $httpBackend.flush()

    $scope.model.error.should.equal(errorMsg)
  })

  it('shows generic error when server error', () => {
    expectLoginPost().respond(400, 'something wrong')

    const $scope = $rootScope.$new()
    $controller('LoginController', { $scope })

    $scope.model.data = { username, password }
    $scope.login()
    $httpBackend.flush()

    $scope.model.error.should.equal('server error')
  })
})
