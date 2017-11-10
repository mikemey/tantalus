/* global describe before beforeEach it */
const nock = require('nock')
const should = require('chai').should()

const OrderIssuer = require('../../backend/trader/orderIssuer')
const ExchangeConnector = require('../../backend/trader/exchangeConnector')

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

  let orderIssuer, openOrdersMock

  const createOpenOrdersMock = () => {
    const receivedOrders = []
    const addOpenOrder = order => {
      receivedOrders.push(order)
    }
    return { addOpenOrder, receivedOrders }
  }

  beforeEach(() => {
    openOrdersMock = createOpenOrdersMock()
    const exchange = ExchangeConnector(testConfig)
    orderIssuer = OrderIssuer(console, testConfig, openOrdersMock, exchange)
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

  const issueOrder = (trends, accounts) => orderIssuer.issueOrders([trends, accounts])

  describe('buy strategy', () => {
    const surgingTrend = (latestPrice = 123) => { return { latestPrice, isPriceSurging: true } }

    it('should issue a buy order when price surges', () => {
      const latestPrice = 510300
      const accounts = { availableVolume: 30202 }
      const exchangeOrderResponse = buyOrder(100, 592, latestPrice)

      const buyScope = expectBuyOrder(591, latestPrice, exchangeOrderResponse)
      return issueOrder(surgingTrend(latestPrice), accounts)
        .then(() => {
          buyScope.isDone().should.equal(true)
          openOrdersMock.receivedOrders.should.deep.equal([exchangeOrderResponse])
        })
    })

    it('should throw error when available volume larger than maximum volume', () => {
      const accounts = { availableVolume: testVolumeLimit + 1 }
      return issueOrder(surgingTrend(), accounts)
        .then(() => should.fail(0, 1, 'expected exception not thrown!'))
        .catch(err => err.message.should.equal('available volume higher than allowed: £ 1000.01 > £ 1000.00'))
    })

    it('should NOT issue a buy order when available volume under lower limit', () => {
      const accounts = { availableVolume: testLowerLimit - 1 }
      return issueOrder(surgingTrend(510300), accounts)
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })

    it('should NOT issue a buy order when price not surging (and ignores missing latestPrice)', () => {
      const accounts = { availableVolume: 30202 }
      const notSurgingTrend = { isPriceSurging: false }

      return issueOrder(notSurgingTrend, accounts)
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })
  })

  describe('sell strategy', () => {
    const underSellRatioTrend = (latestPrice = 123) => { return { latestPrice, isUnderSellRatio: true } }

    it('should issue a sell order when trend under sell ratio', () => {
      const latestTransactionPrice = 510300
      const accounts = { availableAmount: 123 }
      const exchangeOrderResponse = sellOrder(100, 125, latestTransactionPrice)

      const sellScope = expectSellOrder(123, latestTransactionPrice, exchangeOrderResponse)
      return issueOrder(underSellRatioTrend(latestTransactionPrice), accounts)
        .then(() => {
          sellScope.isDone().should.equal(true)
          openOrdersMock.receivedOrders.should.deep.equal([exchangeOrderResponse])
        })
    })

    it('should NOT issue a sell order when no amount left', () => {
      const accounts = { availableAmount: 0 }
      return issueOrder(underSellRatioTrend(), accounts)
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })

    it('should NOT issue a sell order trend is over sell ratio (and ignores missing latestPrice)', () => {
      const accounts = { availableAmount: 999 }
      const overSellRatioTrend = { isUnderSellRatio: false }
      return issueOrder(overSellRatioTrend, accounts)
        .then(() => openOrdersMock.receivedOrders.should.deep.equal([]))
    })
  })
})
