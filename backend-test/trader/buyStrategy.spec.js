/* global describe before beforeEach it */
const nock = require('nock')
const should = require('chai').should()

const BuyStrategy = require('../../backend/trader/buyStrategy')

describe('Order issuer', () => {
  const testHost = 'http://localhost:14147'
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

  let buyStrategy, openOrdersMock

  const createOpenOrdersMock = () => {
    const receivedOrders = []
    const addOpenOrder = order => {
      receivedOrders.push(order)
    }
    return { addOpenOrder, receivedOrders }
  }

  beforeEach(() => {
    openOrdersMock = createOpenOrdersMock()
    buyStrategy = BuyStrategy(console, testConfig, openOrdersMock)
  })

  afterEach(() => nock.cleanAll())

  // order type: (0 - buy; 1 - sell)
  const openOrder = (id, type, amount, price) => { return { id, type, price, amount } }
  const buyOrder = (id, amount, price) => openOrder(id, 0, amount, price)
  const sellOrder = (id, amount, price) => openOrder(id, 1, amount, price)

  const expectBuyOrder = (amount, price, buyResponse) => nock(testHost)
    .post(`/${testId}/buy`, { amount, price })
    .reply(200, buyResponse)

  const expectSellOrder = (amount, price, buyResponse) => nock(testHost)
    .post(`/${testId}/sell`, { amount, price })
    .reply(200, buyResponse)

  describe('buy strategy', () => {
    const surgingTrend = { isPriceSurging: true }
    const notSurgingTrend = { isPriceSurging: false }

    it('should issue a buy order when price surges', () => {
      const latestTransactionPrice = 510300
      const accounts = { availableVolume: 30202 }
      const exchangeOrderResponse = buyOrder(100, 592, latestTransactionPrice)

      const buyScope = expectBuyOrder(591, latestTransactionPrice, exchangeOrderResponse)
      return buyStrategy.issueOrders(surgingTrend, latestTransactionPrice, accounts)
        .then(() => {
          buyScope.isDone().should.equal(true)
          openOrdersMock.receivedOrders.should.deep.equal([exchangeOrderResponse])
        })
    })

    it('should throw error when available volume larger than maximum volume', () => {
      const accounts = { availableVolume: testVolumeLimit + 1 }
      return buyStrategy.issueOrders(surgingTrend, 123, accounts)
        .then(() => should.fail(0, 1, 'expected exception not thrown!'))
        .catch(err => {
          console.log(err)
          err.message.should.equal('available volume higher than allowed: £ 1000.01 > £ 1000.00')
        })
    })

    it('should NOT issue a buy order when available volume under lower limit', () => {
      const accounts = { availableVolume: testLowerLimit - 1 }
      return buyStrategy.issueOrders(surgingTrend, 510300, accounts)
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })

    it('should NOT issue a buy order when price not surging', () => {
      const accounts = { availableVolume: 30202 }

      return buyStrategy.issueOrders(notSurgingTrend, 500000, accounts)
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })
  })

  describe('sell strategy', () => {
    const underSellRatioTrend = { isUnderSellRatio: true }
    const overSellRatioTrend = { isUnderSellRatio: false }

    it('should issue a sell order when trend under sell ratio', () => {
      const latestTransactionPrice = 510300
      const accounts = { availableAmount: 123 }
      const exchangeOrderResponse = sellOrder(100, 125, latestTransactionPrice)

      const sellScope = expectSellOrder(123, latestTransactionPrice, exchangeOrderResponse)
      return buyStrategy.issueOrders(underSellRatioTrend, latestTransactionPrice, accounts)
        .then(() => {
          sellScope.isDone().should.equal(true)
          openOrdersMock.receivedOrders.should.deep.equal([exchangeOrderResponse])
        })
    })

    it('should NOT issue a sell order when no amount left', () => {
      const accounts = { availableAmount: 0 }
      return buyStrategy.issueOrders(underSellRatioTrend, 500000, accounts)
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })

    it('should NOT issue a sell order trend is over sell ratio', () => {
      const accounts = { availableAmount: 999 }
      return buyStrategy.issueOrders(overSellRatioTrend, 500000, accounts)
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })
  })
})
