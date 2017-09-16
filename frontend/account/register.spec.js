/* global inject */

describe('Register controller', () => {
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

  const username = 'new_user'
  const password = 'ladida'
  const confirmation = 'ladida'
  const testUser = { username, password, confirmation }

  const expectRegisterRequest = () => $httpBackend
    .expectPOST('/api/users/register', testUser)

  it('posts registration and forward to account', () => {
    expectRegisterRequest().respond(204)

    const locationRecorder = () => {
      let currentPath = null
      return {
        path: newPath => { currentPath = newPath },
        currentPath: () => currentPath
      }
    }

    const $scope = $rootScope.$new()
    const $location = locationRecorder()
    $controller('RegisterController', { $scope, $location })

    $scope.model.data = { username, password, confirmation }
    $scope.register()
    $httpBackend.flush()

    $location.currentPath().should.equal('/account')
  })

  it('shows error from registration response', () => {
    const errorMsg = 'Username missing'
    expectRegisterRequest().respond(400, { error: errorMsg })

    const $scope = $rootScope.$new()
    $controller('RegisterController', { $scope })

    $scope.model.data = { username, password, confirmation }
    $scope.register()
    $httpBackend.flush()

    $scope.model.error.should.equal(errorMsg)
  })

  it('shows generic error when server error', () => {
    expectRegisterRequest().respond(400, 'something wrong')

    const $scope = $rootScope.$new()
    $controller('RegisterController', { $scope })

    $scope.model.data = { username, password, confirmation }
    $scope.register()
    $httpBackend.flush()

    $scope.model.error.should.equal('server error')
  })
})
