const { TantalusLogger } = require('../utils/tantalusLogger')
const { roundVolume } = require('../utils/ordersHelper')

const ExchangeAccountAdapter = require('./exchangeAccountAdapter')
const TradeAccount = require('../simex/tradeAccount')
const TraderJob = require('../trader/traderJob')

const baseLogger = console

const quietLogger = {
  errorOnly: true,
  error: baseLogger.error,
  log: baseLogger.log
}

const createSimulatedTrader = config => {
  const tradeAccount = TradeAccount(quietLogger, config.clientId)
  const exchangeAdapter = ExchangeAccountAdapter(tradeAccount)
  const trader = TraderJob(quietLogger, config, exchangeAdapter)
  return { trader, exchangeAdapter }
}

class PartitionWorker {
  constructor (simulatedTraderFunc = createSimulatedTrader) {
    this.traderPairs = []
    this.lastTransactionPrice = 0
    this.simulatedTraderFunc = simulatedTraderFunc
    this.logger = TantalusLogger(baseLogger, `WRK-${process.pid}`)
  }

  createTraders (workerConfigObject) {
    this.lastTransactionPrice = 0
    this.traderPairs = workerConfigObject.traderConfigs.map(this.simulatedTraderFunc)
    this.logger.info(`created ${this.traderPairs.length} traders`)
  }

  drainTransactions (transactionsSlice) {
    const txs = transactionsSlice.transactions
    this.setLastTransactionsPrice(txs)
    this.traderPairs.map(({ trader, exchangeAdapter }) => {
      exchangeAdapter.setTransactions(txs)
      trader.tick(transactionsSlice.unixNow)
    })
  }

  setLastTransactionsPrice (transactions) {
    if (transactions.length) {
      this.lastTransactionPrice = transactions[0].price
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
