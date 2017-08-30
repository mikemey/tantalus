/* global describe before beforeEach it */
const requests = require('../backend/utils/requests')

describe.only('exploring', () => {
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
  })
})
