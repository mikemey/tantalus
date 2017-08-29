/* global describe before beforeEach it */
const request = require('supertest')
const nock = require('nock')
const { expect } = require('chai')
const fs = require('fs')

const helpers = require('./helpers')

const solidiResponse = fs.readFileSync('backend-test/solidi/example_response.html', 'utf8')
const lakebtcResponse = fs.readFileSync('backend-test/lakebtc/ticker.json', 'utf8')

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
        expect(duration).to.be.within(1, 100)
        expect(body).to.deep.include({
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
        expect(duration).to.be.within(1, 100)
        expect(body).to.deep.include({
          lakebtc: {
            buy: '2700',
            sell: '2690',
            duration
          }
        })
      }))
  })
})
