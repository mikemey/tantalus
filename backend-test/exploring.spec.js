/* global describe before beforeEach it */
const requests = require('../backend/utils/requests')
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

  it('coinfloor selling price finder', () => {
    const sell = 2551.81
    const targetRate = 3605
    const variant = 10

    console.log('  selling amount: £ %s', sell)
    console.log('================================================')
    const cents = 100
    const btcbits = 10000
    const available = sell * cents

    const start = targetRate - variant
    const prices = Array.from({ length: variant * 2 + 1 }, (_, i) => (start + i) * cents)

    const checkPrice = price => {
      const exactBtc = available / price
      const buyBtcBits = Math.floor(exactBtc * btcbits)
      const cost = Math.floor((buyBtcBits * price) / btcbits)
      const diff = available - cost

      // console.log('{ price: %s, buy: %d, cost: %s, diff: %s },',
      console.log('price: £ %s \t== buy: %d \t== cost: %s \t== diff: £ %s',
        price / cents, (buyBtcBits / btcbits), (cost / cents).toFixed(2), (diff / cents).toFixed(2))
    }
    prices.forEach(checkPrice)
  })
})
