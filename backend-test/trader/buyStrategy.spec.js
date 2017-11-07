/* global describe before beforeEach it */
const nock = require('nock')

const BuyStrategy = require('../../backend/trader/buyStrategy')

describe('BUY strategy', () => {
  const testHost = 'http://localhost:14146'
  const testId = 234
  const testVolumeLimit = 100000
  const testLowerLimit = 10000
  const testConfig = {
    clientId: testId,
    exchangeHost: testHost,
    buying: {
      volumeLimitPence: testVolumeLimit,
      lowerLimitPence: testLowerLimit
    }
  }

  let buyStrategy

  beforeEach(() => {
    buyStrategy = BuyStrategy(console, testConfig)
  })

  afterEach(() => nock.cleanAll())

  const expectBuyOrder = (amount, price, buyResponse) => nock(testHost)
    .post(`/${testId}/buy`, { amount, price })
    .reply(200, buyResponse)

  const expectCancelOrder = (id, boolResponse) => nock(testHost)
    .post(`/${testId}/cancel_order`, { id })
    .reply(200, `${boolResponse}`)

  const priceSurge = { isPriceSurging: true }
  const priceUnderSurge = { isPriceSurging: false }

  const cycleBuyOrder = (trend, expectedAmount, expectedPrice, volumeSold, openOrders, buyOrderResponse) => {
    const scope = expectBuyOrder(expectedAmount, expectedPrice, buyOrderResponse)
    return buyStrategy.getAmountBought(trend, openOrders, expectedPrice, volumeSold)
      .then(amountBought => {
        scope.isDone().should.equal(true)
        return amountBought
      })
  }

  describe('when price surges', () => {
    it('should issue a buy order for the full amount', () => {
      const price = 500100
      const amount = 1999
      const buyOrderResponse = { id: 123, price, amount }
      const openOrders = []

      return cycleBuyOrder(priceSurge, amount, price, 0, openOrders, buyOrderResponse)
        .then(amountBought => { amountBought.should.equal(0) })
    })

    it('should issue a buy order for remaining volume', () => {
      const firstTxPrice = 500000
      const firstOrderAmount = 2000
      const firstBuyOrderResponse = { id: 123, price: firstTxPrice, amount: firstOrderAmount }
      const firstOpenOrders = [
        { id: 999, price: firstTxPrice, amount: firstOrderAmount }
      ]

      return cycleBuyOrder(priceSurge, firstOrderAmount, firstTxPrice, 0, firstOpenOrders, firstBuyOrderResponse)
        .then(amountBought => {
          amountBought.should.equal(0)
          const amountLeft = 1200 // 0800 mBTCs have been bought

          const secondTxPrice = 400000
          const secondOrderAmount = 1500 // == amountLeft * firstTxPrice / secondTxPrice
          const secondBuyOrderResponse = { id: 127, price: secondTxPrice, amount: secondOrderAmount }
          const secondOpenOrders = firstOpenOrders.concat([
            Object.assign(firstBuyOrderResponse, { amount: amountLeft })
          ])

          const cancelScope = expectCancelOrder(123, true)
          return cycleBuyOrder(priceSurge, secondOrderAmount, secondTxPrice, 0, secondOpenOrders, secondBuyOrderResponse)
            .then(amountBought => {
              cancelScope.isDone().should.equal(true)
              amountBought.should.equal(firstOrderAmount - amountLeft)
            })
        })
    })

    it('should issue a buy order for increased amount after volume update', () => {
      const firstTxPrice = 500000
      const soldVolume = 70000
      const secondTxPrice = 400000
      const expectedSecondAmount = 2000
      return orderBoughtAndSoldCycle(firstTxPrice, soldVolume, secondTxPrice, expectedSecondAmount)
    })

    it('should issue a buy order for maximum amount after volume update', () => {
      const firstTxPrice = 500000
      const soldVolume = 90100
      const secondTxPrice = 400000
      const expectedSecondAmount = 2500
      return orderBoughtAndSoldCycle(firstTxPrice, soldVolume, secondTxPrice, expectedSecondAmount)
    })

    const orderBoughtAndSoldCycle = (firstTxPrice, soldVolume, secondTxPrice, expectedSecondAmount) => {
      const firstOrderAmount = 2000
      const firstBuyOrderResponse = { id: 123, price: firstTxPrice, amount: firstOrderAmount }
      const firstOpenOrders = []

      return cycleBuyOrder(priceSurge, firstOrderAmount, firstTxPrice, 0, firstOpenOrders, firstBuyOrderResponse)
        .then(amountBought => {
          const amountLeft = 200 // 1800 mBTCs have been bought

          const secondBuyOrderResponse = { id: 127, price: secondTxPrice, amount: expectedSecondAmount }
          const secondOpenOrders = [{ id: 123, price: firstTxPrice, amount: amountLeft }]

          const cancelScope = expectCancelOrder(123, true)
          return cycleBuyOrder(priceSurge, expectedSecondAmount, secondTxPrice, soldVolume, secondOpenOrders, secondBuyOrderResponse)
            .then(amountBought => {
              cancelScope.isDone().should.equal(true)
              amountBought.should.equal(firstOrderAmount - amountLeft)
            })
        })
    }

    it('should NOT issue a buy order when canceling existing order failed', () => {
      const txPrice = 500000
      const orderAmount = 2000
      const buyOrderResponse = { id: 123, price: txPrice, amount: orderAmount }
      const openOrders = []

      return cycleBuyOrder(priceSurge, orderAmount, txPrice, 0, openOrders, buyOrderResponse)
        .then(amountBought => {
          const amountLeft = 2000

          const secondOpenOrders = [Object.assign(buyOrderResponse, { amount: amountLeft })]
          const cancelScope = expectCancelOrder(123, false)

          return buyStrategy.getAmountBought(priceSurge, secondOpenOrders, txPrice, 0)
            .then(amountBought => {
              cancelScope.isDone().should.equal(true)
              amountBought.should.equal(orderAmount)
            })
        })
    })

    it('should NOT issue a buy order when remaining volume under lower limit', () => {
      const txPrice = 500000
      const orderAmount = 2000
      const buyOrderResponse = { id: 123, price: txPrice, amount: orderAmount }
      const openOrders = []

      return cycleBuyOrder(priceSurge, orderAmount, txPrice, 0, openOrders, buyOrderResponse)
        .then(amountBought => {
          const amountLeft = 199

          const secondOpenOrders = [Object.assign(buyOrderResponse, { amount: amountLeft })]
          const cancelScope = expectCancelOrder(123, true)

          return buyStrategy.getAmountBought(priceSurge, secondOpenOrders, txPrice, 0)
            .then(amountBought => {
              cancelScope.isDone().should.equal(true)
              amountBought.should.equal(orderAmount - amountLeft)
            })
        })
    })
  })

  describe('when price UNDER surge', () => {
    it('should NOT issue a buy order when price under surge', () => {
      const latestTransactionPrice = 500100
      const openOrders = []

      return buyStrategy.getAmountBought(priceUnderSurge, openOrders, latestTransactionPrice, 0)
        .then(amountBought => { amountBought.should.equal(0) })
    })

    it('should NOT issue a buy order for remaining open amount', () => {
      const txPrice = 500000
      const orderAmount = 2000
      const buyOrderResponse = { id: 123, price: txPrice, amount: orderAmount }
      const openOrders = []

      return cycleBuyOrder(priceSurge, orderAmount, txPrice, 0, openOrders, buyOrderResponse)
        .then(amountBought => {
          const amountLeft = 500

          const secondOpenOrders = [Object.assign(buyOrderResponse, { amount: amountLeft })]
          const cancelScope = expectCancelOrder(123, true)

          return buyStrategy.getAmountBought(priceUnderSurge, secondOpenOrders, txPrice, 0)
            .then(amountBought => {
              cancelScope.isDone().should.equal(true)
              amountBought.should.equal(orderAmount - amountLeft)
            })
        })
    })
  })
})
