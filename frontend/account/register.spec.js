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

  const componentsAfterRegister = ($location = {}) => {
    const $scope = $rootScope.$new()
    const components = { $scope, $location }
    $controller('RegisterController', components)

    $scope.model.data = { username, password, confirmation }
    $scope.register()
    $httpBackend.flush()
    return components
  }

  it('posts registration and forward to account', () => {
    expectRegisterRequest().respond(204)

    const locationRecorder = () => {
      let currentPath = null
      return {
        path: newPath => { currentPath = newPath },
        currentPath: () => currentPath
      }
    }
    componentsAfterRegister(locationRecorder())
      .$location.currentPath().should.equal('/dashboard')
  })

  it('shows error from registration response', () => {
    const errorMsg = 'Username missing'
    expectRegisterRequest().respond(400, { error: errorMsg })
    componentsAfterRegister().$scope.model.error.should.equal(errorMsg)
  })

  it('shows generic error when server error', () => {
    expectRegisterRequest().respond(400, 'something wrong')
    componentsAfterRegister().$scope.model.error.should.equal('server error')
  })
})
