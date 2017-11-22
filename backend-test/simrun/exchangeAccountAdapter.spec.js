const expect = require('chai').expect

const ExchangeAccountAdapter = require('../../backend/simrun/exchangeAccountAdapter')

describe('Account adapter', () => {
  const testTxs = [{ abc: 'def' }, { ghi: 'jkl' }]
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

  let mockTradeAccount = createMockTradeAccount()
  let adapter = ExchangeAccountAdapter(mockTradeAccount)

  beforeEach(() => {
    mockTradeAccount = createMockTradeAccount()
    adapter = ExchangeAccountAdapter(mockTradeAccount)
  })

  it('getAllAccounts throws error', () => {
    expect(adapter.getAllAccounts)
      .to.throw(Error, 'AccountAdapter: unexpected call to getAllAccounts()')
  })

  it('getTransactions returns empty array when no data', () => {
    const txs = adapter.getTransactions()
    txs.should.deep.equal([])
  })

  it('getTransactions returns transactions when set', () => {
    adapter.setTransactions(testTxs)
    const txs = adapter.getTransactions()
    txs.should.deep.equal(testTxs)
  })

  it('setTransactions', () => {
    adapter.setTransactions(testTxs)
    mockTradeAccount.receivedTransactionsUpdate().should.deep.equal(testTxs)
  })

  it('getAccount', () => {
    const account = adapter.getAccount()
    account.should.deep.equal(mockTradeAccount.account)
  })

  it('getOpenOrders', () => {
    const openOrders = adapter.getOpenOrders()
    openOrders.should.deep.equal(mockTradeAccount.openOrders)
  })

  it('buyLimitOrder', () => {
    const result = adapter.buyLimitOrder(1, 5)
    result.amount.should.equal(2)
    result.price.should.equal(7)
  })

  it('sellLimitOrder', () => {
    const result = adapter.sellLimitOrder(10, 15)
    result.amount.should.equal(13)
    result.price.should.equal(19)
  })

  it('cancelOrder', () => {
    const result = adapter.cancelOrder(666)
    result.should.equal(true)
  })
})
