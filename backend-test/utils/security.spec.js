/* global describe before beforeEach it */
const request = require('supertest')
const should = require('chai').should()
const setCookieParser = require('set-cookie-parser')

const helpers = require('../helpers')

describe('server security configuration', () => {
  let app, server

  const startTestServer = disabled => () => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }, disabled)

  const getRequest = (page = '/tantalus/') => request.agent(app).get(page).expect(200)

  describe('when disabled', () => {
    before(startTestServer(true))
    after(() => helpers.closeAll(server))

    it('response without csrf header', () => getRequest()
      .then(res => should.not.exist(res.header['XSRF-TOKEN']))
    )
  })

  describe('when enabled', () => {
    before(startTestServer(false))
    after(() => helpers.closeAll(server))

    const expectCsrfHeader = page => getRequest(page)
      .then(res => {
        const cookies = setCookieParser.parse(res)
        const xsrfToken = cookies.find(c => c.name === 'XSRF-TOKEN')
        should.exist(xsrfToken)
        xsrfToken.value.should.have.length(36)
      })

    it('response with csrf header on index page', () => expectCsrfHeader('/tantalus/'))

    it('response with csrf header on api endpont', () => expectCsrfHeader('/api/version'))
  })
})
