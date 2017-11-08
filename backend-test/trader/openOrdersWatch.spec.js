/* global describe before beforeEach it */
const nock = require('nock')
const chai = require('chai')
const expect = chai.expect
const should = chai.should()

const OpenOrdersWatch = require('../../backend/trader/openOrdersWatch')

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
    openOrdersWatch = OpenOrdersWatch(console, testConfig)
  })

  afterEach(() => nock.cleanAll())

  const expectGetOpenOrders = openOrders => nock(testHost)
    .get(`/${testId}/open_orders`)
    .reply(200, openOrders)

  const expectCancelOrder = (id, boolResponse = true) => nock(testHost)
    .post(`/${testId}/cancel_order`, { id })
    .reply(200, `${boolResponse}`)

  // order type: (0 - buy; 1 - sell)
  const openOrder = (id, type, price, amount) => { return { id, type, price, amount } }
  const buyOrder = (id, price, amount) => openOrder(id, 0, price, amount)
  const sellOrder = (id, price, amount) => openOrder(id, 1, price, amount)

  const resolveOpenOrders = (newOpenOrders, expectedAvailableVolume, expectedAvailableAmount) => {
    const getOrderScope = expectGetOpenOrders(newOpenOrders)
    return openOrdersWatch.resolveOpenOrders()
      .then(result => {
        getOrderScope.isDone().should.equal(true, 'getOrderScope')
        result.availableAmount.should.equal(expectedAvailableAmount, 'availableAmount')
        result.availableVolume.should.equal(expectedAvailableVolume, 'availableVolume')
      })
  }

  describe('orders safety checks', () => {
    it('throws error when volume in buy order is higher than available', () => {
      expect(openOrdersWatch.addOpenOrder.bind(openOrdersWatch, buyOrder(123, 500000, 2001)))
        .to.throw(Error, 'buying with more volume than available: £ 1000.50 > £ 1000.00')
    })

    it('throws error when amount in sell order is larger than available', () => {
      openOrdersWatch.addOpenOrder(buyOrder(444, 500000, 2000))
      return resolveOpenOrders([], 0, 2000).then(() => {
        expect(openOrdersWatch.addOpenOrder.bind(openOrdersWatch, sellOrder(555, 500000, 2001)))
          .to.throw(Error, 'selling more btcs than available: Ƀ 0.2001 > Ƀ 0.2000')
      })
    })

    it('throw error when local order type not recognised', () => {
      expect(openOrdersWatch.addOpenOrder.bind(openOrdersWatch, openOrder(99, 3, 200000, 100)))
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
      return resolveOpenOrders([], testVolumeLimit, 0)
    })

    it('full cycle with partial amounts', () => {
      openOrdersWatch.addOpenOrder(buyOrder(100, 500000, 2000))
      expectCancelOrder(100)

      return resolveOpenOrders([buyOrder(100, 500000, 199)], 0, 1801)
        .then(() => {
          openOrdersWatch.addOpenOrder(sellOrder(102, 500500, 1801))
          expectCancelOrder(102)
          return resolveOpenOrders([sellOrder(102, 500500, 1700)], 15005, 1700)
        })
        .then(() => {
          openOrdersWatch.addOpenOrder(buyOrder(104, 500800, 298))
          openOrdersWatch.addOpenOrder(sellOrder(106, 501100, 1700))
          return resolveOpenOrders([], 85269, 298)
        })
        .then(() => resolveOpenOrders([], 85269, 298))
        .then(() => {
          openOrdersWatch.addOpenOrder(sellOrder(108, 501500, 298))
          return resolveOpenOrders([], testVolumeLimit, 0)
        })
    })
  })

  describe('volume -> amount', () => {
    it('fully when order bought fully', () => {
      openOrdersWatch.addOpenOrder(buyOrder(123, 500000, 2000))
      return resolveOpenOrders([], 0, 2000)
    })

    it('partially when order partially bought', () => {
      openOrdersWatch.addOpenOrder(buyOrder(124, 505000, 1980))
      const cancelScope = expectCancelOrder(124)

      return resolveOpenOrders([buyOrder(124, 505000, 481)], 24300, 1499)
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('fully when order partially bought and cancel order failed', () => {
      openOrdersWatch.addOpenOrder(buyOrder(125, 500000, 2000))
      const cancelScope = expectCancelOrder(125, false)

      return resolveOpenOrders([buyOrder(125, 500000, 500)], 0, 2000)
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('none when order partially bought remaining volume under lower limit', () => {
      openOrdersWatch.addOpenOrder(buyOrder(128, 500000, 2000))
      const cancelScope = expectCancelOrder(128)

      const amountUnderLimit = 199
      return resolveOpenOrders([buyOrder(128, 500000, amountUnderLimit)], 0, 1801)
        .then(() => cancelScope.isDone().should.equal(true))
    })
  })

  describe('amount -> volume', () => {
    beforeEach(() => {
      openOrdersWatch.addOpenOrder(buyOrder(444, 500000, 2000))
      return resolveOpenOrders([], 0, 2000)
    })

    it('fully when amount sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(555, 500000, 2000))
      return resolveOpenOrders([], 100000, 0)
    })

    it('partially when part of amount sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(666, 550100, 2000))
      const cancelScope = expectCancelOrder(666)

      return resolveOpenOrders([sellOrder(666, 550100, 1507)], 27119, 1507)
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('fully when part of amount sold and cancel order failed', () => {
      openOrdersWatch.addOpenOrder(sellOrder(777, 500000, 2000))
      const cancelScope = expectCancelOrder(777, false)

      return resolveOpenOrders([sellOrder(777, 500000, 100)], testVolumeLimit, 0)
        .then(() => cancelScope.isDone().should.equal(true))
    })

    it('maximum amount when larger volume sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(888, 600000, 2000))
      const cancelScope = expectCancelOrder(888)

      return resolveOpenOrders([sellOrder(888, 550000, 100)], testVolumeLimit, 100)
        .then(() => cancelScope.isDone().should.equal(true))
    })
  })
})
