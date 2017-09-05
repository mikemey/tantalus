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

  const testUser = {
    username: 'new_user',
    password: 'ladida'
  }

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
          setTimeout(done, 80) // waiting for session to be stored
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

    it('reject when username not set', () => postUserWithCSRF({ password: testUser.password })
      .expect(400, { error: 'username or password missing' })
    )

    it('reject when password not set', () => postUserWithCSRF({ username: testUser.username })
      .expect(400, { error: 'username or password missing' })
    )
  })
})
