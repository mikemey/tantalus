/* global describe before beforeEach it */
const request = require('supertest')
const nock = require('nock')
require('chai').should()
const fs = require('fs')

const helpers = require('./helpers')

const solidiResponse = fs.readFileSync('backend-test/example_responses/solidi.html', 'utf8')
const lakebtcResponse = fs.readFileSync('backend-test/example_responses/lakebtc.json', 'utf8')
const coinfloorResponse = fs.readFileSync('backend-test/example_responses/coinfloor.json', 'utf8')
const coindeskResponse = fs.readFileSync('backend-test/example_responses/coindesk.json', 'utf8')

const priceUrls = {
  solidi: { host: 'https://www.solidi.co', path: '/index' },
  lakebtc: { host: 'https://api.LakeBTC.com', path: '/api_v2/ticker' },
  coinfloor: { host: 'https://webapi.coinfloor.co.uk:8090', path: '/bist/XBT/GBP/ticker/' },
  coindesk: { host: 'https://api.coindesk.com', path: '/site/headerdata.json?currency=BTC' }
}

describe('GET /prices endpoint', () => {
  let app, server

  const getPriceData = () => request(app).get('/api/prices')
  const coinfloorDelayMs = 50

  before(() => helpers.startTestServer((_app, _server) => {
    app = _app
    server = _server
  }))

  after(done => helpers.close(server, done))

  afterEach(() => nock.cleanAll())

  const expectTicker = (actualJson, { ticker, buy, sell }, durMin = 1, durMax = 100) => {
    const duration = actualJson.duration
    duration.should.be.within(durMin, durMax)
    actualJson.should.deep.equal({ ticker, buy, sell, duration })
  }

  const nockget = priceUrl => nock(priceUrl.host).get(priceUrl.path)

  describe('valid responses', () => {
    beforeEach(done => {
      nockget(priceUrls.solidi).reply(200, solidiResponse)
      nockget(priceUrls.lakebtc).reply(200, lakebtcResponse)
      nockget(priceUrls.coinfloor).delay(coinfloorDelayMs).reply(200, coinfloorResponse)
      nockget(priceUrls.coindesk).reply(200, coindeskResponse)

      done()
    })

    it('SOLIDI page prices', () => getPriceData()
      .expect(200)
      .then(({ body }) => expectTicker(body[0], {
        ticker: 'solidi',
        buy: '3626',
        sell: '3448'
      })))

    it('LakeBTC api prices', () => getPriceData()
      .expect(200)
      .then(({ body }) => expectTicker(body[1], {
        ticker: 'lakebtc',
        buy: '2700',
        sell: '2690'
      })))

    it('Coinfloor api prices', () => getPriceData()
      .expect(200)
      .then(({ body }) => expectTicker(body[2], {
        ticker: 'coinfloor',
        buy: '3554',
        sell: '3545'
      }, coinfloorDelayMs)))

    it('Coindesk api prices', () => getPriceData()
      .expect(200)
      .then(({ body }) => expectTicker(body[3], {
        ticker: 'coindesk',
        buy: '3578',
        sell: '3578'
      })))
  })

  describe('invalid responses', () => {
    beforeEach(done => {
      const twiceNockGet = priceUrl => nockget(priceUrl).twice().reply(429, 'retry later')
      Object.keys(priceUrls).forEach(tickerName => twiceNockGet(priceUrls[tickerName]))

      done()
    })

    it('expect unset prices', () => getPriceData()
      .expect(200)
      .then(({ body }) => {
        const unsetPrices = ticker => {
          return { ticker, buy: null, sell: null }
        }
        Object.keys(priceUrls)
          .forEach((tickerName, ix) => expectTicker(body[ix], unsetPrices(tickerName), 10, 200))
      }))
  })
})
