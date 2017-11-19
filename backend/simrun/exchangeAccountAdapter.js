const ExchangeAccountAdapter = tradeAccount => {
  const data = {
    transactions: []
  }

  const setTransactions = txs => {
    data.transactions = txs
    tradeAccount.transactionsUpdate(txs)
  }

  return {
    getTransactions: () => Promise.resolve(data.transactions),
    setTransactions,
    getAllAccounts: () => {
      throw Error('AccountAdapter: unexpected call to getAllAccounts()')
    },
    getAccount: () => Promise.resolve(tradeAccount.getAccount()),
    getOpenOrders: () => Promise.resolve(tradeAccount.getOpenOrders()),
    buyLimitOrder: (amount, price) => Promise.resolve(tradeAccount.newBuyOrder(amount, price)),
    sellLimitOrder: (amount, price) => Promise.resolve(tradeAccount.newSellOrder(amount, price)),
    cancelOrder: id => Promise.resolve(tradeAccount.cancelOrder(id))
  }
}
module.exports = ExchangeAccountAdapter
