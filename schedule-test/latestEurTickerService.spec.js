/* global describe beforeEach it */
const nock = require('nock')
const fs = require('fs')
const path = require('path')

const helpers = require('../utils-test/helpers')
const LatestEurTickerService = require('../schedule/latestEurTickerService')

const testExchangeResponse = filename => fs.readFileSync(
  path.join(__dirname, `example_responses/${filename}`),
  'utf8'
)

const gdaxResponse = testExchangeResponse('gdax_eur.json')
const binanceResponse = testExchangeResponse('binance_eur.json')
const coindeskResponse = testExchangeResponse('coindesk_eur.json')

const tickerUrls = {
  gdax: { host: 'https://api.gdax.com', path: '/products/BTC-EUR/ticker' },
  binance: { host: 'https://api.binance.com', path: '/api/v3/ticker/bookTicker?symbol=BTCEUR' },
  coindesk: { host: 'https://api.coindesk.com', path: '/v1/bpi/currentprice.json' }
}

describe('Latest EUR ticker service ', () => {
  const creationDate = new Date()
  const eurTickerService = LatestEurTickerService(console)

  const nockget = tickerUrl => nock(tickerUrl.host).get(tickerUrl.path)

  afterEach(() => nock.cleanAll())

  describe('valid responses', () => {
    beforeEach(() => {
      nockget(tickerUrls.gdax).reply(200, gdaxResponse)
      nockget(tickerUrls.binance).reply(200, binanceResponse)
      nockget(tickerUrls.coindesk).reply(200, coindeskResponse)

      return helpers.dropDatabase()
    })

    const expectedData = [
      { name: 'gdax', bid: 21529.21, ask: 21547.84 },
      { name: 'binance', bid: 21494.76, ask: 21497.02 },
      { name: 'coindesk', ask: 21654.16 }
    ]

    it('stores all tickers', () => eurTickerService.storeTickers(creationDate)
      .then(helpers.getEurTickers)
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        doc.created.getTime().should.equal(creationDate.getTime())
        doc.tickers.should.deep.equal(expectedData)
      }))
  })

  describe('invalid responses', () => {
    beforeEach(() => {
      const twiceNockGet = tickerUrl => nockget(tickerUrl).twice().reply(429, 'retry later')
      Object.keys(tickerUrls).forEach(tickerName => twiceNockGet(tickerUrls[tickerName]))

      return helpers.dropDatabase()
    })

    const emptyTicker = name => { return { name, bid: 'N/A', ask: 'N/A' } }
    const expectedData = [
      emptyTicker('gdax'),
      emptyTicker('binance'),
      emptyTicker('coindesk')
    ]

    it('stores unset tickers', () => eurTickerService.storeTickers(creationDate)
      .then(helpers.getEurTickers)
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        doc.created.getTime().should.equal(creationDate.getTime())
        doc.tickers.should.deep.equal(expectedData)
      }))
  })
})
