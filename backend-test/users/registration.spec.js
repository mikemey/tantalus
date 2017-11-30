/* global describe before beforeEach it */
const request = require('supertest')

const helpers = require('../../utils-test/helpers')
const { setupCSRFAgent } = require('../agents')

describe('/api/users/register endpoint', function () {
  this.timeout(5000)

  let app, server

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }, false))

  after(() => helpers.closeAll(server))

  const username = 'new_user'
  const password = 'ladida'
  const confirmation = 'ladida'
  const testUser = { username, password, confirmation }

  const registerPost = requestAgent => requestAgent.post('/api/users/register')

  describe('error cases', () => {
    it('rejects when no csrf token', () => registerPost(request(app))
      .send(testUser)
      .expect(403, { error: 'invalid csrf token' })
    )

    it('rejects when invalid csrf token', () => registerPost(request(app))
      .set('Cookie', ['XSRF-TOKEN=aaaaaaaa-bbbbbbbbbbbb-cccccccccccccc'])
      .send(testUser)
      .expect(403, { error: 'invalid csrf token' })
    )
  })

  describe('register user', () => {
    let csrfAgent

    beforeEach(() => helpers.dropDatabase()
      .then(() => setupCSRFAgent(app))
      .then(agent => { csrfAgent = agent })
    )

    const postUserWithCSRF = (userAccount = testUser) => csrfAgent.post('/api/users/register')
      .send(userAccount)

    it('store the user account', () => postUserWithCSRF()
      .expect(204)
      .then(helpers.getAccounts)
      .then(accounts => {
        accounts.should.have.length(1)
        accounts[0].username.should.equal(testUser.username)
        accounts[0].salt.should.have.length(64)
        accounts[0].hash.should.have.length(1024)
      })
    )

    it('reject when username not set', () => postUserWithCSRF({ password, confirmation })
      .expect(400, { error: 'Username missing' })
    )

    it('reject when password not set', () => postUserWithCSRF({ username, confirmation })
      .expect(400, { error: 'Password missing' })
    )

    it('reject when password confirmation not set', () => postUserWithCSRF({ username, password })
      .expect(400, { error: 'Password confirmation missing' })
    )

    it('reject when password and confirmation do not match', () =>
      postUserWithCSRF({ username, password, confirmation: 'no-match' })
        .expect(400, { error: 'Password does not match confirmation' })
    )

    it('reject when user already stored', () => postUserWithCSRF()
      .expect(204)
      .then(() => postUserWithCSRF().expect(400, { error: 'Username is already registered' }))
    )
  })
})
