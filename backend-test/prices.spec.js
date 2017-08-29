/* global describe before beforeEach it */
const request = require('supertest')
const nock = require('nock')
const { expect } = require('chai')

const helpers = require('./helpers')

describe('Prices', () => {
  let app, server

  const getPriceData = () => request(app).get('/prices')

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  after(done => helpers.close(server, done))

  beforeEach(() => nock('https://www.solidi.co')
    .get('/index')
    .replyWithFile(200, 'backend-test/solidi/example_response')
  )

  afterEach(() => nock.restore())

  describe('first section', () => {
    it('response with 200 and solidi prices.', () => getPriceData()
      .expect(200)
      .then(({ body }) => {
        const duration = body.solidi.duration
        expect(duration).to.be.within(10, 100)
        expect(body).to.deep.equal({
          solidi: {
            buy: '3626',
            sell: '3448',
            duration
          }
        })
      }))
  })
})
