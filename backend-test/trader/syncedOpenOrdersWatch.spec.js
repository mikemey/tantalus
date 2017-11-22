/* global describe before beforeEach it */
const { OrderLogger } = require('../../backend/utils/ordersHelper')
const OpenOrdersWatch = require('../../backend/trader/openOrdersWatch')

describe('Synced open orders watch', () => {
  const testId = 234

  const testConfig = {
    clientId: testId,
    syncedMode: true
  }

  const SyncExchangeMock = () => {
    const data = {
      openOrders: [],
      getOpenOrdersCalled: false,
      receivedCancelIds: [],
      cancelResponse: true
    }

    const setOpenOrdersResponse = oo => { data.openOrders = oo }
    const getOpenOrders = () => {
      data.getOpenOrdersCalled = true
      return data.openOrders
    }

    const setCancelOrderResponse = response => { data.cancelResponse = response }
    const cancelOrder = id => {
      data.receivedCancelIds.push(id)
      return data.cancelResponse
    }
    const getReceivedCancelIds = () => data.receivedCancelIds

    return {
      getOpenOrders,
      setOpenOrdersResponse,
      getOpenOrdersCalled: () => data.getOpenOrdersCalled,

      setCancelOrderResponse,
      cancelOrder,
      getReceivedCancelIds
    }
  }

  const logger = OrderLogger(console)

  let openOrdersWatch, exchangeMock

  beforeEach(() => {
    exchangeMock = SyncExchangeMock()
    openOrdersWatch = OpenOrdersWatch(logger, testConfig, exchangeMock)
  })

  // order type: (0 - buy; 1 - sell)
  const openOrder = (id, type, amount, price) => { return { id, type, price, amount } }
  const buyOrder = (id, amount, price) => openOrder(id, 0, amount, price)
  const sellOrder = (id, amount, price) => openOrder(id, 1, amount, price)

  const resolveOpenOrders = exchangeOpenOrders => {
    exchangeMock.setOpenOrdersResponse(exchangeOpenOrders)
    openOrdersWatch.resolveOpenOrders()
    exchangeMock.getOpenOrdersCalled().should.equal(true, 'getOpenOrders not called')
  }

  describe('common scenarios', () => {
    it('should do nothing when no local or exchange orders', () => {
      resolveOpenOrders([])
      exchangeMock.getReceivedCancelIds().should.deep.equal([])
    })

    it('should cancel order when order only in exchange (ie trader restarted)', () => {
      resolveOpenOrders([buyOrder(1234, 100, 100), sellOrder(5678, 100, 100)])
      exchangeMock.getReceivedCancelIds().should.deep.equal([1234, 5678])
    })

    it('full cycle with partial amounts', () => {
      openOrdersWatch.addOpenOrder(buyOrder(100, 2000, 500000))

      resolveOpenOrders([buyOrder(100, 199, 500000)])
      exchangeMock.getReceivedCancelIds().should.deep.equal([100])

      resolveOpenOrders([buyOrder(100, 199, 500000)])
      exchangeMock.getReceivedCancelIds().should.deep.equal([100, 100])

      openOrdersWatch.addOpenOrder(sellOrder(102, 1801, 500500))

      resolveOpenOrders([sellOrder(102, 1700, 500500)])
      exchangeMock.getReceivedCancelIds().should.deep.equal([100, 100, 102])

      openOrdersWatch.addOpenOrder(buyOrder(104, 298, 500800))
      openOrdersWatch.addOpenOrder(sellOrder(106, 1700, 501100))
      resolveOpenOrders([])
      resolveOpenOrders([])

      openOrdersWatch.addOpenOrder(sellOrder(108, 298, 501500))
      resolveOpenOrders([])
      exchangeMock.getReceivedCancelIds().should.deep.equal([100, 100, 102])
    })
  })

  describe('BUY order', () => {
    it('NOT cancelled when completely bought', () => {
      openOrdersWatch.addOpenOrder(buyOrder(123, 2000, 500000))
      resolveOpenOrders([])
      exchangeMock.getReceivedCancelIds().should.deep.equal([])
    })

    it('cancels order when still open', () => {
      const order = buyOrder(540, 1500, 500000)
      openOrdersWatch.addOpenOrder(order)

      resolveOpenOrders([order])
      exchangeMock.getReceivedCancelIds().should.deep.equal([540])
    })

    it('cancels order when partially bought', () => {
      openOrdersWatch.addOpenOrder(buyOrder(124, 1980, 505000))
      resolveOpenOrders([buyOrder(124, 481, 505000)])
      exchangeMock.getReceivedCancelIds().should.deep.equal([124])
    })

    it('ignores cancel order failed', () => {
      exchangeMock.setCancelOrderResponse(false)
      openOrdersWatch.addOpenOrder(buyOrder(125, 2000, 500000))

      resolveOpenOrders([buyOrder(125, 500, 500000)])
      exchangeMock.getReceivedCancelIds().should.deep.equal([125])
    })
  })

  describe('SELL order', () => {
    it('NOT cancelled when completely sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(555, 2000, 500000))
      resolveOpenOrders([])
      exchangeMock.getReceivedCancelIds().should.deep.equal([])
    })

    it('cancels order when still open', () => {
      const order = sellOrder(222, 1500, 550000)
      openOrdersWatch.addOpenOrder(order)

      resolveOpenOrders([order])
      exchangeMock.getReceivedCancelIds().should.deep.equal([222])
    })

    it('cancels order when partially sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(666, 2000, 550100))

      resolveOpenOrders([sellOrder(666, 1507, 550100)])
      exchangeMock.getReceivedCancelIds().should.deep.equal([666])
    })

    it('ignores cancel order failed', () => {
      exchangeMock.setCancelOrderResponse(false)
      openOrdersWatch.addOpenOrder(sellOrder(777, 2000, 500000))

      resolveOpenOrders([sellOrder(777, 500000, 100)])
      exchangeMock.getReceivedCancelIds().should.deep.equal([777])
    })
  })
})
