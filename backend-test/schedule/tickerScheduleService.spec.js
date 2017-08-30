/* global describe before beforeEach it */
const nock = require('nock')
require('chai').should()
const fs = require('fs')
const moment = require('moment')

const helpers = require('../helpers')
const createTickerScheduleService = require('../../backend/schedule/tickerScheduleService')

const solidiResponse = fs.readFileSync('backend-test/example_responses/solidi.html', 'utf8')
const lakebtcResponse = fs.readFileSync('backend-test/example_responses/lakebtc.json', 'utf8')
const coinfloorResponse = fs.readFileSync('backend-test/example_responses/coinfloor.json', 'utf8')
const coindeskResponse = fs.readFileSync('backend-test/example_responses/coindesk.json', 'utf8')

const tickerUrls = {
  solidi: { host: 'https://www.solidi.co', path: '/index' },
  lakebtc: { host: 'https://api.LakeBTC.com', path: '/api_v2/ticker' },
  coinfloor: { host: 'https://webapi.coinfloor.co.uk:8090', path: '/bist/XBT/GBP/ticker/' },
  coindesk: { host: 'https://api.coindesk.com', path: '/site/headerdata.json?currency=BTC' }
}

describe('tickers schedule service', () => {
  const tickerScheduleService = createTickerScheduleService()

  const nockget = tickerUrl => nock(tickerUrl.host).get(tickerUrl.path)

  beforeEach(() => helpers.dropDatabase())

  const expectTickers = (tickers, expectedData) => {
    const fullTickerExpectation = expectedData.map((ticker, ix) => {
      const duration = tickers[ix].duration
      duration.should.be.a('number')
      return Object.assign(ticker, { duration })
    })
    tickers.should.deep.equal(fullTickerExpectation)
  }

  const expectValidDate = date => {
    date.should.be.ok
    moment.utc(date).isValid().should.equal(true)
  }

  describe('valid responses', () => {
    beforeEach(done => {
      nockget(tickerUrls.solidi).reply(200, solidiResponse)
      nockget(tickerUrls.lakebtc).reply(200, lakebtcResponse)
      nockget(tickerUrls.coinfloor).reply(200, coinfloorResponse)
      nockget(tickerUrls.coindesk).reply(200, coindeskResponse)

      done()
    })

    const testData = [
      { name: 'solidi', buy: 3625.95, sell: 3448.17 },
      { name: 'lakebtc', buy: 2699.87, sell: 2689.96 },
      { name: 'coinfloor', buy: 3553.9, sell: 3545 },
      { name: 'coindesk', buy: 3577.58, sell: 3577.58 }
    ]

    it('stores all tickers', () => tickerScheduleService.storeTickers()
      .then(() => helpers.getTickers())
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        expectValidDate(doc.created)
        expectTickers(doc.tickers, testData)
      }))
  })

  describe('invalid responses', () => {
    beforeEach(done => {
      const twiceNockGet = tickerUrl => nockget(tickerUrl).twice().reply(429, 'retry later')
      Object.keys(tickerUrls).forEach(tickerName => twiceNockGet(tickerUrls[tickerName]))

      done()
    })

    const emptyTicker = name => { return { name, buy: null, sell: null } }
    const testData = [
      emptyTicker('solidi'),
      emptyTicker('lakebtc'),
      emptyTicker('coinfloor'),
      emptyTicker('coindesk')
    ]

    it('stores unset tickers', () => tickerScheduleService.storeTickers()
      .then(() => helpers.getTickers())
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        expectValidDate(doc.created)
        expectTickers(doc.tickers, testData)
      }))
  })
})
