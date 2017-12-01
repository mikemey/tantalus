
const SimulatedTrader = traderConfig => {
  const data = {
    previousUnix: 0
  }

  const runTick = (unixNow, transactions) => {
    console.log('simulating runtime: ' + unixNow)
  }
  // const createSimulatedTrader = config => {
  //   const tradeAccount = TradeAccount(quietLogger, config.clientId, config.buying.volumeLimitPence)
  //   const exchangeAdapter = ExchangeAccountAdapter(tradeAccount)
  //   const trader = TraderJob(quietLogger, config, exchangeAdapter)
  //   return { trader, exchangeAdapter }
  // }

  // send transactions:
  // eslint-disable-next-line space-before-function-paren
  // runThroughTrader(transactionsSlice) {
  //   const txs = transactionsSlice.transactions
  //   if (txs.length) {
  //     this.lastTransactionPrice = txs[0].price
  //     this.traderPairs.map(({ trader, exchangeAdapter }) => {
  //       exchangeAdapter.setTransactions(txs)
  //       trader.tick(transactionsSlice.unixNow)
  //     })
  //   }
  // }


  return {
    runTick
  }
}

module.exports = SimulatedTrader
