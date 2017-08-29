/* global describe before beforeEach it */
const request = require('supertest')
const nock = require('nock')
require('chai').should()
const fs = require('fs')

const helpers = require('./helpers')

const solidiResponse = fs.readFileSync('backend-test/example_responses/solidi.html', 'utf8')
const lakebtcResponse = fs.readFileSync('backend-test/example_responses/lakebtc.json', 'utf8')

describe('GET /prices endpoint', () => {
  let app, server

  const getPriceData = () => request(app).get('/prices')

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  after(done => helpers.close(server, done))

  beforeEach(done => {
    nock('https://www.solidi.co')
      .get('/index')
      .reply(200, solidiResponse)

    nock('https://api.LakeBTC.com')
      .get('/api_v2/ticker')
      .reply(200, lakebtcResponse)

    done()
  })

  afterEach(() => nock.cleanAll())

  describe('SOLIDI page', () => {
    it('response with 200 and solidi prices', () => getPriceData()
      .expect(200)
      .then(({ body }) => {
        const duration = body.solidi.duration
        duration.should.be.within(1, 100)
        body.should.deep.include({
          solidi: {
            buy: '3626',
            sell: '3448',
            duration
          }
        })
      }))
  })

  describe('LakeBTC page', () => {
    it('response with 200 and lakebtc prices', () => getPriceData()
      .expect(200)
      .then(({ body }) => {
        const duration = body.lakebtc.duration
        duration.should.be.within(1, 100)
        body.should.deep.include({
          lakebtc: {
            buy: '2700',
            sell: '2690',
            duration
          }
        })
      }))
  })
})
