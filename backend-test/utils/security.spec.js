/* global describe before beforeEach it */
const request = require('supertest')
require('chai')
const setCookieParser = require('set-cookie-parser')

const helpers = require('../helpers')
const { setupCSRFAgent } = require('../agents')

describe('server security configuration', () => {
  let app, server

  const startTestServer = disabled => () => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }, disabled)

  describe('csrf disabled', () => {
    before(startTestServer(true))
    after(() => helpers.closeAll(server))

    it('response without csrf header', () => request.agent(app).get('/tantalus/')
      .then(res => {
        const cookies = setCookieParser.parse(res)
        cookies.filter(c => c.name === 'XSRF-TOKEN').should.have.length(0)
      })
    )
  })

  describe('csrf enabled', () => {
    before(startTestServer(false))
    after(() => helpers.closeAll(server))

    const expectCsrfTokens = page => request.agent(app).get(page)
      .then(res => {
        const cookies = setCookieParser.parse(res)
        const xsrfToken = cookies.find(c => c.name === 'XSRF-TOKEN')
        xsrfToken.value.should.have.length(36)
      })

    it('response with csrf header on index page', () => expectCsrfTokens('/tantalus/'))

    it('response with csrf header on api endpoint', () => expectCsrfTokens('/api/version'))
  })

  describe('endpoints requiring authorization', () => {
    let csrfAgent

    before(startTestServer(false))
    after(() => helpers.closeAll(server))

    beforeEach(() => setupCSRFAgent(app)
      .then(agent => { csrfAgent = agent })
    )

    const unauthorizedResponseGET = page => expectUnauthorized(csrfAgent.get(page).withCredentials())
    const unauthorizedResponsePOST = page => expectUnauthorized(csrfAgent.post(page).withCredentials().send({}))
    const unauthorizedResponsePUT = page => expectUnauthorized(csrfAgent.put(page).withCredentials().send({}))

    const expectUnauthorized = result => result.expect(401, {
      error: 'Authorization required'
    })

    it('rejects unauthorized account request', () => unauthorizedResponseGET('/api/users/account'))
    it('rejects unauthorized keys POST request', () => unauthorizedResponsePOST('/api/users/logout'))
    it('rejects unauthorized keys PUT request', () => unauthorizedResponsePUT('/api/users/keys'))
  })

  describe('endpoints without authorization', () => {
    const simexConfig = {
      simex: {
        transactionsServiceUrl: 'https://webapi.coinfloor.co.uk:8090/bist/XBT/GBP/transactions/',
        transactionsTTLminutes: 1,
        transactionsUpateSchedule: '1 1 1 1 *'
      }
    }
    before(() => helpers.startTestServer((_app, _server) => {
      app = _app
      server = _server
    }, false, {}, simexConfig))

    after(() => helpers.closeAll(server))

    it('allows POST on /api/simex enpoint', () => request(app)
      .post('/api/simex/sec-test/buy')
      .send({ amount: 10, price: 10 })
      .expect(200)
    )
  })
})
