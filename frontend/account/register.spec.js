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
    .expectPOST('/api/users/register', testUser).respond(204)

  it('posts registration and forward to account', () => {
    expectRegisterRequest()

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
})
