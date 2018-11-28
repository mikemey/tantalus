const sinon = require('sinon')

const { OrderLogger } = require('../utils/ordersHelper')
const OpenOrdersWatch = require('../trader/openOrdersWatch')

describe('Synced open orders watch', () => {
  const testId = 234

  const testConfig = {
    clientId: testId,
    syncedMode: true
  }

  const SyncExchangeMock = () => {
    return {
      getOpenOrders: sinon.stub(),
      cancelOrder: sinon.stub()
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
    exchangeMock.getOpenOrders.returns(exchangeOpenOrders)
    openOrdersWatch.resolveOpenOrders()
    exchangeMock.getOpenOrders.called.should.equal(true, 'getOpenOrders not called')
  }

  describe('common scenarios', () => {
    it('should do nothing when no local or exchange orders', () => {
      resolveOpenOrders([])
      exchangeMock.cancelOrder.called.should.equal(false)
    })

    it('should cancel order when order only in exchange (ie trader restarted)', () => {
      resolveOpenOrders([buyOrder(1234, 100, 100), sellOrder(5678, 100, 100)])

      const cancelStub = exchangeMock.cancelOrder
      sinon.assert.callOrder(cancelStub.withArgs(1234), cancelStub.withArgs(5678))
    })

    it('full cycle with partial amounts', () => {
      const cancelStub = exchangeMock.cancelOrder
      openOrdersWatch.addOpenOrder(buyOrder(100, 2000, 500000))

      resolveOpenOrders([buyOrder(100, 199, 500000)])
      cancelStub.withArgs(100).called.should.equal(true)

      resolveOpenOrders([buyOrder(100, 199, 500000)])
      cancelStub.withArgs(100).calledTwice.should.equal(true)

      openOrdersWatch.addOpenOrder(sellOrder(102, 1801, 500500))

      resolveOpenOrders([sellOrder(102, 1700, 500500)])
      cancelStub.withArgs(102).called.should.equal(true)

      openOrdersWatch.addOpenOrder(buyOrder(104, 298, 500800))
      openOrdersWatch.addOpenOrder(sellOrder(106, 1700, 501100))
      resolveOpenOrders([])
      resolveOpenOrders([])

      openOrdersWatch.addOpenOrder(sellOrder(108, 298, 501500))
      resolveOpenOrders([])
      cancelStub.callCount.should.equal(3)
    })
  })

  describe('BUY order', () => {
    it('NOT cancelled when completely bought', () => {
      openOrdersWatch.addOpenOrder(buyOrder(123, 2000, 500000))
      resolveOpenOrders([])
      exchangeMock.cancelOrder.called.should.equal(false)
    })

    it('cancels order when still open', () => {
      const order = buyOrder(540, 1500, 500000)
      openOrdersWatch.addOpenOrder(order)

      resolveOpenOrders([order])
      exchangeMock.cancelOrder.withArgs(540).called.should.equal(true)
    })

    it('cancels order when partially bought', () => {
      openOrdersWatch.addOpenOrder(buyOrder(124, 1980, 505000))
      resolveOpenOrders([buyOrder(124, 481, 505000)])
      exchangeMock.cancelOrder.withArgs(124).called.should.equal(true)
    })

    it('ignores cancel order failed', () => {
      exchangeMock.cancelOrder.returns(false)
      openOrdersWatch.addOpenOrder(buyOrder(125, 2000, 500000))

      resolveOpenOrders([buyOrder(125, 500, 500000)])
      exchangeMock.cancelOrder.withArgs(125).called.should.equal(true)
    })
  })

  describe('SELL order', () => {
    it('NOT cancelled when completely sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(555, 2000, 500000))
      resolveOpenOrders([])
      exchangeMock.cancelOrder.called.should.equal(false)
    })

    it('cancels order when still open', () => {
      const order = sellOrder(222, 1500, 550000)
      openOrdersWatch.addOpenOrder(order)

      resolveOpenOrders([order])
      exchangeMock.cancelOrder.withArgs(222).called.should.equal(true)
    })

    it('cancels order when partially sold', () => {
      openOrdersWatch.addOpenOrder(sellOrder(666, 2000, 550100))

      resolveOpenOrders([sellOrder(666, 1507, 550100)])
      exchangeMock.cancelOrder.withArgs(666).called.should.equal(true)
    })

    it('ignores cancel order failed', () => {
      exchangeMock.cancelOrder.returns(false)
      openOrdersWatch.addOpenOrder(sellOrder(777, 2000, 500000))

      resolveOpenOrders([sellOrder(777, 500000, 100)])
      exchangeMock.cancelOrder.withArgs(777).called.should.equal(true)
    })
  })
})
