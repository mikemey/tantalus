const expect = require('chai').expect

const ExchangeAccountAdapter = require('../../backend/simrun/exchangeAccountAdapter')

describe('Account adapter', () => {
  const testTxs = [{ abc: 'def' }, { ghi: 'jkl' }]

  describe('general functions', () => {
    const adapter = ExchangeAccountAdapter()

    it('getAllAccounts throws error', () => {
      expect(adapter.getAllAccounts)
        .to.throw(Error, 'AccountAdapter: unexpected call to getAllAccounts()')
    })

    it('getTransactions returns empty array when no data', () => {
      return adapter.getTransactions()
        .then(txs => txs.should.deep.equal([]))
    })
  })

  describe('forwards TradeAccount functions', () => {
    const createMockTradeAccount = () => {
      const account = { ladida: 123 }
      const openOrders = [{ bibi: 'babb' }]
      let receivedTransactions, updateHasBeenCalled

      const testOrder = (ainc, pinc) => (amount, price) => {
        return {
          amount: amount + ainc,
          price: price + pinc
        }
      }

      const transactionsUpdate = txUpdate => {
        updateHasBeenCalled = true
        receivedTransactions = txUpdate
      }

      const receivedTransactionsUpdate = () => {
        if (updateHasBeenCalled) return receivedTransactions
        throw Error('transactionsUpdate() was never called!')
      }

      return {
        account,
        openOrders,
        transactionsUpdate,
        receivedTransactionsUpdate,
        getAccount: () => account,
        getOpenOrders: () => openOrders,
        newBuyOrder: testOrder(1, 2),
        newSellOrder: testOrder(3, 4),
        cancelOrder: orderId => orderId === 666
      }
    }

    const mockTradeAccount = createMockTradeAccount()
    const adapter = ExchangeAccountAdapter(mockTradeAccount)

    it('getTransactions returns transactions when set', () => {
      adapter.setTransactions(testTxs)
      return adapter.getTransactions()
        .then(txs => txs.should.deep.equal(testTxs))
    })

    it('setTransactions', () => {
      adapter.setTransactions(testTxs)
      mockTradeAccount.receivedTransactionsUpdate().should.deep.equal(testTxs)
    })

    it('getAccount', () => {
      return adapter.getAccount()
        .then(res => res.should.deep.equal(mockTradeAccount.account))
    })

    it('getOpenOrders', () => {
      return adapter.getOpenOrders()
        .then(res => res.should.deep.equal(mockTradeAccount.openOrders))
    })

    it('buyLimitOrder', () => {
      return adapter.buyLimitOrder(1, 5)
        .then(res => {
          res.amount.should.equal(2)
          res.price.should.equal(7)
        })
    })

    it('sellLimitOrder', () => {
      return adapter.sellLimitOrder(10, 15)
        .then(res => {
          res.amount.should.equal(13)
          res.price.should.equal(19)
        })
    })

    it('cancelOrder', () => {
      return adapter.cancelOrder(666)
        .then(res => res.should.equal(true))
    })
  })
})
