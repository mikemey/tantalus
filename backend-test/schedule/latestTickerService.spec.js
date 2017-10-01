/* global describe before beforeEach it */
const nock = require('nock')
require('chai').should()
const fs = require('fs')
const moment = require('moment')

const helpers = require('../helpers')
const LatestTickerService = require('../../backend/schedule/latestTickerService')

const solidiResponse = fs.readFileSync('backend-test/example_responses/solidi.html', 'utf8')
const lakebtcResponse = fs.readFileSync('backend-test/example_responses/lakebtc.json', 'utf8')
const coinfloorResponse = fs.readFileSync('backend-test/example_responses/coinfloor.json', 'utf8')
const coindeskResponse = fs.readFileSync('backend-test/example_responses/coindesk.json', 'utf8')
const cexResponse = fs.readFileSync('backend-test/example_responses/cex.json', 'utf8')

const tickerUrls = {
  solidi: { host: 'https://www.solidi.co', path: '/index' },
  lakebtc: { host: 'https://api.LakeBTC.com', path: '/api_v2/ticker' },
  coinfloor: { host: 'https://webapi.coinfloor.co.uk:8090', path: '/bist/XBT/GBP/ticker/' },
  coindesk: { host: 'https://api.coindesk.com', path: '/site/headerdata.json?currency=BTC' },
  cex: { host: 'https://cex.io', path: '/api/ticker/BTC/GBP' }
}

describe('Latest ticker service', () => {
  const latestTickerService = LatestTickerService(console)

  const nockget = tickerUrl => nock(tickerUrl.host).get(tickerUrl.path)

  const expectValidDate = date => {
    moment.utc(date).isValid().should.equal(true)
  }

  describe('valid responses', () => {
    beforeEach(() => {
      nockget(tickerUrls.solidi).reply(200, solidiResponse)
      nockget(tickerUrls.lakebtc).reply(200, lakebtcResponse)
      nockget(tickerUrls.coinfloor).reply(200, coinfloorResponse)
      nockget(tickerUrls.coindesk).reply(200, coindeskResponse)
      nockget(tickerUrls.cex).reply(200, cexResponse)

      return helpers.dropDatabase()
    })

    const expectedData = [
      { name: 'solidi', bid: 3755.49, ask: 'N/A' },
      { name: 'lakebtc', bid: 3809.08, ask: 3815.75 },
      { name: 'coinfloor', bid: 3751.00, ask: 3759.00 },
      { name: 'coindesk', ask: 3577.58 },
      { name: 'cex', bid: 2850.00, ask: 2900.00 }
    ]

    it('stores all tickers', () => latestTickerService.storeTickers()
      .then(() => helpers.getTickers())
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
      emptyTicker('solidi'),
      emptyTicker('lakebtc'),
      emptyTicker('coinfloor'),
      emptyTicker('coindesk'),
      emptyTicker('cex')
    ]

    it('stores unset tickers', () => latestTickerService.storeTickers()
      .then(() => helpers.getTickers())
      .then(docs => {
        docs.length.should.equal(1)
        const doc = docs[0]
        expectValidDate(doc.created)
        doc.tickers.should.deep.equal(expectedData)
      }))
  })
})
