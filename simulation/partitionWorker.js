const { TantalusLogger } = require('../utils/tantalusLogger')
const { roundVolume } = require('../utils/ordersHelper')

const ExchangeAccountAdapter = require('./exchangeAccountAdapter')
const TradeAccount = require('../backend/simex/tradeAccount')
const TraderJob = require('../trader/traderJob')

const baseLogger = console

const quietLogger = {
  errorOnly: true,
  error: baseLogger.error,
  log: baseLogger.log
}

const createSimulatedTrader = config => {
  const tradeAccount = TradeAccount(quietLogger, config.clientId, config.buying.volumeLimitPence)
  const exchangeAdapter = ExchangeAccountAdapter(tradeAccount)
  const trader = TraderJob(quietLogger, config, exchangeAdapter)
  return { trader, exchangeAdapter }
}

class PartitionWorker {
  constructor (simulatedTraderFunc = createSimulatedTrader) {
    this.traderPairs = []
    this.lastTransactionPrice = 0
    this.simulatedTraderFunc = simulatedTraderFunc
    this.logger = TantalusLogger(baseLogger, `worker-${process.pid}`)
  }

  createTraders (workerConfigObject) {
    this.lastTransactionPrice = 0
    this.traderPairs = workerConfigObject.traderConfigs.map(this.simulatedTraderFunc)
  }

  drainTransactions (transactionsSlice) {
    const txs = transactionsSlice.transactions
    if (txs.length) {
      this.lastTransactionPrice = txs[0].price
      this.traderPairs.map(({ trader, exchangeAdapter }) => {
        exchangeAdapter.setTransactions(txs)
        trader.tick(transactionsSlice.unixNow)
      })
    }
  }

  getAccounts () {
    return this.traderPairs.map(({ trader, exchangeAdapter }) => {
      const account = exchangeAdapter.getAccount()
      return {
        clientId: account.clientId,
        amount: account.balances.xbt_balance,
        price: this.lastTransactionPrice,
        volume: account.balances.gbp_balance,
        fullVolume: account.balances.gbp_balance +
          roundVolume(account.balances.xbt_balance, this.lastTransactionPrice)
      }
    })
  }
}

module.exports = PartitionWorker
