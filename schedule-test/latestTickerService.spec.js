/* global describe before beforeEach it */const nock = require('nock')
const fs = require('fs')
const path = require('path')
const moment = require('moment')

const helpers = require('../utils-test/helpers')
const LatestTickerService = require('../schedule/latestTickerService')

const testExchangeResponse = filename => fs.readFileSync(
  path.join(__dirname, `example_responses/${filename}`),
  'utf8'
)

const gdaxResponse = testExchangeResponse('gdax.json')
const coinfloorResponse = testExchangeResponse('coinfloor.json')
const coindeskResponse = testExchangeResponse('coindesk.json')

const tickerUrls = {
  gdax: { host: 'https://api.gdax.com', path: '/products/BTC-GBP/ticker' },
  coinfloor: { host: 'https://webapi.coinfloor.co.uk:8090', path: '/bist/XBT/GBP/ticker/' },
  coindesk: { host: 'https://api.coindesk.com', path: '/site/headerdata.json?currency=BTC' }
}

describe('Latest ticker service', () => {
  const latestTickerService = LatestTickerService(console)

  const nockget = tickerUrl => nock(tickerUrl.host).get(tickerUrl.path)

  const expectValidDate = date => {
    moment.utc(date).isValid().should.equal(true)
  }

  afterEach(() => nock.cleanAll())

  describe('valid responses', () => {
    beforeEach(() => {
      nockget(tickerUrls.gdax).reply(200, gdaxResponse)
      nockget(tickerUrls.coinfloor).reply(200, coinfloorResponse)
      nockget(tickerUrls.coindesk).reply(200, coindeskResponse)

      return helpers.dropDatabase()
    })

    const expectedData = [
      { name: 'gdax', bid: 11920.04, ask: 11964.61 },
      { name: 'coinfloor', bid: 3751.00, ask: 3759.00 },
      { name: 'coindesk', ask: 3577.58 }
    ]

    it('stores all tickers', () => latestTickerService.storeTickers()
      .then(helpers.getTickers)
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        expectValidDate(doc.created)
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
      emptyTicker('coinfloor'),
      emptyTicker('coindesk')
    ]

    it('stores unset tickers', () => latestTickerService.storeTickers()
      .then(helpers.getTickers)
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        expectValidDate(doc.created)
        doc.tickers.should.deep.equal(expectedData)
      }))
  })
})
