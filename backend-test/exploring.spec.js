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
        created: new Date().toISOString(),
        tickers: [
          { name: 'solidi', buy: 3675.14, sell: 'N/A', duration: 601 },
          { name: 'lakebtc', buy: 3631.49, duration: 194 },
          { name: 'coinfloor', buy: 3565, sell: 3548, duration: 194 },
          { name: 'coindesk', buy: 3583.71, sell: 999.71, duration: 238 }
        ]
      }]
      return helpers.dropDatabase()
        .then(() => helpers.insertTickers(tickerData))
    })

    it('CHECK', () => {
      const expectedTicker = [
        { name: 'solidi', bid: 3675.14, ask: 'N/A' },
        { name: 'lakebtc', bid: 'N/A', ask: 3631.49 },
        { name: 'coinfloor', bid: 3548, ask: 3565 },
        { name: 'coindesk', ask: 3583.71 }
      ]
      return helpers.getTickers().then(tickers => {
        tickers.should.have.length(1)
        const actualTicker = tickers[0]
        actualTicker.tickers.should.deep.equal(expectedTicker)
      })
    })
  })
})
