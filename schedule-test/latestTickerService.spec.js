/* global describe beforeEach it */
const nock = require('nock')
const fs = require('fs')
const path = require('path')

const helpers = require('../utils-test/helpers')
const LatestTickerService = require('../schedule/latestTickerService')

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

const createMetadataMock = () => {
  const received = { count: 0 }
  const setTickerCount = count => {
    received.count = count
  }
  return { received, setTickerCount }
}

describe('Latest EUR ticker service ', () => {
  const creationDate = new Date()
  const metadataMock = createMetadataMock()
  const tickerService = LatestTickerService(console, metadataMock)

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

    it('stores all tickers', () => tickerService.storeTickers(creationDate)
      .then(helpers.getTickers)
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        doc.created.getTime().should.equal(creationDate.getTime())
        doc.tickers.should.deep.equal(expectedData)
      }))

    it('sends metadata to service', () => tickerService.storeTickers(creationDate)
      .then(() => metadataMock.received.count.should.equal(expectedData.length))
    )
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

    it('stores unset tickers', () => tickerService.storeTickers(creationDate)
      .then(helpers.getTickers)
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        doc.created.getTime().should.equal(creationDate.getTime())
        doc.tickers.should.deep.equal(expectedData)
      }))
  })
})
