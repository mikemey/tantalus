/* global describe before beforeEach it */
const nock = require('nock')
const chai = require('chai')
const expect = chai.expect
const should = chai.should()

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

  let openOrdersWatch

  beforeEach(() => {
    const exchange = ExchangeConnector(testConfig)
    openOrdersWatch = OpenOrdersWatch(console, testConfig, exchange)
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

  const resolveOpenOrders = (exchangeOpenOrders, expectedAvailableAmount, expectedAvailableVolume) => {
    const getOrderScope = expectGetOpenOrders(exchangeOpenOrders)
    return openOrdersWatch.resolveOpenOrders()
      .then(result => {
        getOrderScope.isDone().should.equal(true, 'getOrderScope')
        result.availableAmount.should.equal(expectedAvailableAmount, 'availableAmount')
        result.availableVolume.should.equal(expectedAvailableVolume, 'availableVolume')
      })
  }

  describe('orders safety checks', () => {
    it('throws error when volume in buy order is higher than available', () => {
      expect(openOrdersWatch.addOpenOrder.bind(openOrdersWatch, buyOrder(123, 2001, 500000)))
        .to.throw(Error, 'buying with more volume than available: £ 1000.50 > £ 1000.00')
    })

    it('throws error when amount in sell order is larger than available', () => {
      openOrdersWatch.addOpenOrder(buyOrder(444, 2000, 500000))
      return resolveOpenOrders([], 2000, 0).then(() => {
        expect(openOrdersWatch.addOpenOrder.bind(openOrdersWatch, sellOrder(555, 2001, 500000)))
          .to.throw(Error, 'selling more btcs than available: Ƀ 0.2001 > Ƀ 0.2000')
      })
    })

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
    it('should return full volume and no amount when nothing happens', () => {
      return resolveOpenOrders([], 0, testVolumeLimit)
    })

    it('full cycle with partial amounts', () => {
      openOrdersWatch.addOpenOrder(buyOrder(100, 2000, 500000))
      expectCancelOrder(100)

      return resolveOpenOrders([buyOrder(100, 199, 500000)], 1801, 0)
        .then(() => {
          openOrdersWatch.addOpenOrder(sellOrder(102, 1801, 500500))
          expectCancelOrder(102)
          return resolveOpenOrders([sellOrder(102, 1700, 500500)], 1700, 15005)
        })
        .then(() => {
          openOrdersWatch.addOpenOrder(buyOrder(104, 298, 500800))
          openOrdersWatch.addOpenOrder(sellOrder(106, 1700, 501100))
          return resolveOpenOrders([], 298, 85269)
        })
        .then(() => resolveOpenOrders([], 298, 85269))
        .then(() => {
          openOrdersWatch.addOpenOrder(sellOrder(108, 298, 501500))
          return resolveOpenOrders([], 0, testVolumeLimit)
        })
    })
  })

  describe('volume -> amount', () => {
    it('fully when order bought fully', () => {
      openOrdersWatch.addOpenOrder(buyOrder(123, 2000, 500000))
      return resolveOpenOrders([], 2000, 0)
    })

    it('revert when order still open', () => {
      const order = buyOrder(540, 1500, 500000)
      openOrdersWatch.addOpenOrder(order)
      expectCancelOrder(540)
      return resolveOpenOrders([order], 0, 100000)
    })

    it('partially when order partially bought', () => {
      openOrdersWatch.addOpenOrder(buyOrder(124, 1980, 505000))
      const cancelScope = expectCancelOrder(124)

      return resolveOpenOrders([buyOrder(124, 481, 505000)], 1499, 24300)
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('fully when order partially bought and cancel order failed', () => {
      openOrdersWatch.addOpenOrder(buyOrder(125, 2000, 500000))
      const cancelScope = expectCancelOrder(125, false)

      return resolveOpenOrders([buyOrder(125, 500, 500000)], 2000, 0)
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('none when order partially bought remaining volume under lower limit', () => {
      openOrdersWatch.addOpenOrder(buyOrder(128, 2000, 500000))
      const cancelScope = expectCancelOrder(128)

      const amountUnderLimit = 199
      return resolveOpenOrders([buyOrder(128, amountUnderLimit, 500000)], 1801, 0)
        .then(() => cancelScope.isDone().should.equal(true))
    })
  })

  describe('amount -> volume', () => {
    beforeEach(() => {
      openOrdersWatch.addOpenOrder(buyOrder(444, 2000, 500000))
      return resolveOpenOrders([], 2000, 0)
    })

    it('fully when amount sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(555, 2000, 500000))
      return resolveOpenOrders([], 0, 100000)
    })

    it('revert when order still open', () => {
      const order = sellOrder(222, 1500, 550000)
      openOrdersWatch.addOpenOrder(order)
      expectCancelOrder(222)
      return resolveOpenOrders([order], 2000, 0)
    })

    it('partially when part of amount sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(666, 2000, 550100))
      const cancelScope = expectCancelOrder(666)

      return resolveOpenOrders([sellOrder(666, 1507, 550100)], 1507, 27119)
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('fully when part of amount sold and cancel order failed', () => {
      openOrdersWatch.addOpenOrder(sellOrder(777, 2000, 500000))
      const cancelScope = expectCancelOrder(777, false)

      return resolveOpenOrders([sellOrder(777, 500000, 100)], 0, testVolumeLimit)
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('maximum amount when larger volume sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(888, 2000, 600000))
      const cancelScope = expectCancelOrder(888)

      return resolveOpenOrders([sellOrder(888, 100, 550000)], 100, testVolumeLimit)
        .then(() => cancelScope.isDone().should.equal(true))
    })
  })
})
