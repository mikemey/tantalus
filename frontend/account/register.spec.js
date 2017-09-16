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

    $scope.model = { username, password, confirmation }
    $scope.register()
    $httpBackend.flush()

    $location.currentPath().should.equal('/account')
  })

  it('shows error during registration', () => {
    const errorMsg = 'Username missing'
    expectRegisterRequest().respond(400, { error: errorMsg })

    const $scope = $rootScope.$new()
    $controller('RegisterController', { $scope })

    $scope.model = { username, password, confirmation }
    $scope.register()
    $httpBackend.flush()

    $scope.model.error.should.equal(errorMsg)
  })
})
