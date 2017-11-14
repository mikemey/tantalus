/* global describe before beforeEach it */
const nock = require('nock')
const chai = require('chai')
const expect = chai.expect
const should = chai.should()

const { OrderLogger } = require('../../backend/utils/ordersHelper')
const OpenOrdersWatch = require('../../backend/trader/openOrdersWatch')
const ExchangeConnector = require('../../backend/trader/exchangeConnector')

describe('Open orders watch', () => {
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

  const logger = OrderLogger(console)

  let openOrdersWatch

  beforeEach(() => {
    const exchange = ExchangeConnector(testConfig)
    openOrdersWatch = OpenOrdersWatch(logger, testConfig, exchange)
  })

  afterEach(() => nock.cleanAll())

  const expectGetOpenOrders = openOrders => nock(testHost)
    .get(`/${testId}/open_orders`)
    .reply(200, openOrders)

  const expectCancelOrder = (id, boolResponse = true) => nock(testHost)
    .post(`/${testId}/cancel_order`, { id })
    .reply(200, `${boolResponse}`)

  // order type: (0 - buy; 1 - sell)
  const openOrder = (id, type, amount, price) => { return { id, type, price, amount } }
  const buyOrder = (id, amount, price) => openOrder(id, 0, amount, price)
  const sellOrder = (id, amount, price) => openOrder(id, 1, amount, price)

  const resolveOpenOrders = exchangeOpenOrders => {
    const getOrderScope = expectGetOpenOrders(exchangeOpenOrders)
    return openOrdersWatch.resolveOpenOrders()
      .then(() => getOrderScope.isDone().should.equal(true, 'getOrderScope'))
  }

  describe('orders safety checks', () => {
    it('throw error when local order type not recognised', () => {
      expect(openOrdersWatch.addOpenOrder.bind(openOrdersWatch, openOrder(99, 3, 100, 200000)))
        .to.throw(Error, 'unknown local order type: 3')
    })

    it('throw error when remote order type not recognised', () => {
      return resolveOpenOrders([openOrder(99, 'new', 200000, 100)], 0, 2000)
        .then(() => should.fail('expected exception not thrown'))
        .catch(err => err.message.should.equal('unknown exchange order type: new'))
    })
  })

  describe('common scenarios', () => {
    it('should do nothing when no local or exchange orders', () => {
      return resolveOpenOrders([])
    })

    it('should cancel order when order only in exchange (ie trader restarted)', () => {
      const cancel1 = expectCancelOrder(1234)
      const cancel2 = expectCancelOrder(5678)
      return resolveOpenOrders([buyOrder(1234, 100, 100), sellOrder(5678, 100, 100)])
        .then(() => {
          cancel1.isDone().should.equal(true)
          cancel2.isDone().should.equal(true)
        })
    })

    it('full cycle with partial amounts', () => {
      openOrdersWatch.addOpenOrder(buyOrder(100, 2000, 500000))
      expectCancelOrder(100)

      return resolveOpenOrders([buyOrder(100, 199, 500000)])
        .then(() => {
          openOrdersWatch.addOpenOrder(sellOrder(102, 1801, 500500))
          expectCancelOrder(102)
          return resolveOpenOrders([sellOrder(102, 1700, 500500)])
        })
        .then(() => {
          openOrdersWatch.addOpenOrder(buyOrder(104, 298, 500800))
          openOrdersWatch.addOpenOrder(sellOrder(106, 1700, 501100))
          return resolveOpenOrders([])
        })
        .then(() => resolveOpenOrders([]))
        .then(() => {
          openOrdersWatch.addOpenOrder(sellOrder(108, 298, 501500))
          return resolveOpenOrders([])
        })
    })
  })

  describe('BUY order', () => {
    it('NOT cancelled when completely bought', () => {
      openOrdersWatch.addOpenOrder(buyOrder(123, 2000, 500000))
      return resolveOpenOrders([])
    })

    it('cancels order when still open', () => {
      const order = buyOrder(540, 1500, 500000)
      openOrdersWatch.addOpenOrder(order)
      const cancelScope = expectCancelOrder(540)
      return resolveOpenOrders([order])
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('cancels order when partially bought', () => {
      openOrdersWatch.addOpenOrder(buyOrder(124, 1980, 505000))
      const cancelScope = expectCancelOrder(124)
      return resolveOpenOrders([buyOrder(124, 481, 505000)])
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('ignores cancel order failed', () => {
      openOrdersWatch.addOpenOrder(buyOrder(125, 2000, 500000))
      const cancelScope = expectCancelOrder(125, false)
      return resolveOpenOrders([buyOrder(125, 500, 500000)])
        .then(() => cancelScope.isDone().should.equal(true))
    })
  })

  describe('SELL order', () => {
    it('NOT cancelled when completely sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(555, 2000, 500000))
      return resolveOpenOrders([])
    })

    it('cancels order when still open', () => {
      const order = sellOrder(222, 1500, 550000)
      openOrdersWatch.addOpenOrder(order)
      const cancelScope = expectCancelOrder(222)
      return resolveOpenOrders([order])
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('cancels order when partially sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(666, 2000, 550100))
      const cancelScope = expectCancelOrder(666)
      return resolveOpenOrders([sellOrder(666, 1507, 550100)])
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('ignores cancel order failed', () => {
      openOrdersWatch.addOpenOrder(sellOrder(777, 2000, 500000))
      const cancelScope = expectCancelOrder(777, false)
      return resolveOpenOrders([sellOrder(777, 500000, 100)])
        .then(() => cancelScope.isDone().should.equal(true))
    })
  })
})
