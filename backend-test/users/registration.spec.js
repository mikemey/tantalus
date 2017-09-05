/* global describe before beforeEach it */
const request = require('supertest')
const setCookieParser = require('set-cookie-parser')
require('chai').should()

const helpers = require('../helpers')

describe('/api/users/register endpoint', () => {
  let app, server

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }, false))

  after(() => helpers.closeAll(server))

  beforeEach(() => helpers.dropDatabase())

  const username = 'new_user'
  const password = 'ladida'
  const confirmation = 'ladida'
  const testUser = { username, password, confirmation }

  const registerPost = requestAgent => requestAgent.post('/api/users/register')
  const xsrfRequestHeader = 'X-XSRF-TOKEN'

  describe('error cases', () => {
    it('rejects when no csrf token', () => registerPost(request(app))
      .send(testUser)
      .expect(403, { error: 'invalid csrf token' })
    )

    it('rejects when invalid csrf token', () => registerPost(request(app))
      .set(xsrfRequestHeader, 'LADIDA')
      .send(testUser)
      .expect(403, { error: 'invalid csrf token' })
    )
  })

  describe('register user', () => {
    let agent, xsrfValue

    beforeEach(done => {
      agent = request.agent(app)
      agent.get('/tantalus/').expect(200)
        .then(res => {
          xsrfValue = extractXSRFValue(res)
          setTimeout(done, 100) // waiting for session to be stored
        })
    })

    const extractXSRFValue = res => setCookieParser.parse(res)
      .find(cookie => cookie.name === 'XSRF-TOKEN').value

    const postUserWithCSRF = (userAccount = testUser) => registerPost(agent)
      .set(xsrfRequestHeader, xsrfValue)
      .send(userAccount)

    it('store the user account', () => postUserWithCSRF()
      .expect(201)
      .then(helpers.getAccounts)
      .then(accounts => {
        accounts.should.have.length(1)
        accounts[0].username.should.equal(testUser.username)
        accounts[0].salt.should.have.length(64)
        accounts[0].hash.should.have.length(1024)
      })
    )

    it('reject when username not set', () => postUserWithCSRF({ password, confirmation })
      .expect(400, { error: 'username missing' })
    )

    it('reject when password not set', () => postUserWithCSRF({ username, confirmation })
      .expect(400, { error: 'password missing' })
    )

    it('reject when password confirmation not set', () => postUserWithCSRF({ username, password })
      .expect(400, { error: 'password confirmation missing' })
    )

    it('reject when password and confirmation do not match', () =>
      postUserWithCSRF({ username, password, confirmation: 'no-match' })
        .expect(400, { error: 'password does not match confirmation' })
    )

    it('reject when user already stored', () => postUserWithCSRF()
      .expect(201)
      .then(() => postUserWithCSRF().expect(400, { error: 'username already registered' }))
    )
  })
})
