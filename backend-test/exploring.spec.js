/* global describe before beforeEach it */
const requests = require('../backend/utils/requests')
const helpers = require('./helpers')
require('chai').should()

xdescribe('exploring', () => {
  describe('lakebtc', () => {
    it('orders', () => requests
      .getJson('https://api.LakeBTC.com/api_v2/bcorderbook?symbol=btcgbp')
      .then(body => {
        console.log(JSON.stringify(body))
      }))

    it('trades', () => requests
      .getJson('https://api.lakebtc.com/api_v2/bctrades?symbol=btcgbp')
      .then(body => {
        console.log(body)
      }))

    it('trades', () => requests
      .getJson('https://api.lakebtc.com/api_v2/bctrades?symbol=btcgbp')
      .then(body => {
        console.log(body)
      }))
  })

  describe('migrating data', () => {
    xit('insert', () => {
      const tickerData = [{
        created: new Date(),
        tickers: [
          { name: 'solidi', buy: 3675.14, sell: 'N/A', duration: 601 },
          { name: 'lakebtc', buy: 3815.68, duration: 194 },
          { name: 'coinfloor', buy: 3755, sell: 3753, duration: 194 },
          { name: 'coindesk', buy: 3757.99, sell: 999.71, duration: 238 }
        ]
      }]
      return helpers.dropDatabase()
        .then(() => helpers.insertTickers(tickerData))
    })

    it('CHECK', () => {
      const expectedTicker = [
        { name: 'solidi', bid: 3675.14, ask: 'N/A' },
        { name: 'lakebtc', bid: 'N/A', ask: 3815.68 },
        { name: 'coinfloor', bid: 3753, ask: 3755 },
        { name: 'coindesk', ask: 3757.99 }
      ]
      return helpers.getTickers().then(tickers => {
        tickers.should.have.length(1)
        const actualTicker = tickers[0]
        actualTicker.tickers.should.deep.equal(expectedTicker)
      })
    })
  })
})
