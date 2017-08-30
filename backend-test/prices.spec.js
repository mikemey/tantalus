/* global describe before beforeEach it */
const request = require('supertest')
const nock = require('nock')
require('chai').should()
const fs = require('fs')

const helpers = require('./helpers')

const solidiResponse = fs.readFileSync('backend-test/example_responses/solidi.html', 'utf8')
const lakebtcResponse = fs.readFileSync('backend-test/example_responses/lakebtc.json', 'utf8')
const coinfloorResponse = fs.readFileSync('backend-test/example_responses/coinfloor.json', 'utf8')

describe('GET /prices endpoint', () => {
  let app, server

  const getPriceData = () => request(app).get('/prices')
  const coinfloorDelayMs = 50

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

    nock('https://webapi.coinfloor.co.uk:8090')
      .get('/bist/XBT/GBP/ticker/')
      .delay(coinfloorDelayMs)
      .reply(200, coinfloorResponse)

    done()
  })

  afterEach(() => nock.cleanAll())

  const expectTicker = (actualJson, { ticker, buy, sell }, durMin = 1, durMax = 100) => {
    const duration = actualJson.duration
    duration.should.be.within(durMin, durMax)
    actualJson.should.deep.equal({ ticker, buy, sell, duration })
  }

  describe('SOLIDI page', () => {
    it('response with 200 and solidi prices', () => getPriceData()
      .expect(200)
      .then(({ body }) => expectTicker(body[0], {
        ticker: 'solidi',
        buy: '3626',
        sell: '3448'
      })))
  })

  describe('LakeBTC api', () => {
    it('response with 200 and lakebtc prices', () => getPriceData()
      .expect(200)
      .then(({ body }) => expectTicker(body[1], {
        ticker: 'lakebtc',
        buy: '2700',
        sell: '2690'
      })))
  })

  describe('Coinfloor api', () => {
    it('response with 200 and coinfloor prices', () => getPriceData()
      .expect(200)
      .then(({ body }) => expectTicker(body[2], {
        ticker: 'coinfloor',
        buy: '3554',
        sell: '3545'
      }, coinfloorDelayMs)))
  })
})
