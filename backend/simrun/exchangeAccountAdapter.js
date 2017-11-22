const ExchangeAccountAdapter = tradeAccount => {
  const data = {
    transactions: []
  }

  const setTransactions = txs => {
    data.transactions = txs
    tradeAccount.transactionsUpdate(txs)
  }

  return {
    getTransactions: () => data.transactions,
    setTransactions,
    getAllAccounts: () => {
      throw Error('AccountAdapter: unexpected call to getAllAccounts()')
    },
    getAccount: tradeAccount.getAccount,
    getOpenOrders: tradeAccount.getOpenOrders,
    buyLimitOrder: tradeAccount.newBuyOrder,
    sellLimitOrder: tradeAccount.newSellOrder,
    cancelOrder: tradeAccount.cancelOrder
  }
}

module.exports = ExchangeAccountAdapter
