const { TantalusLogger } = require('../utils/tantalusLogger')
const { roundVolume, amountString, priceString, volumeString } = require('../utils/ordersHelper')

const TraderConfigsGenerator = require('./traderConfigsGenerator')

const ExchangeAccountAdapter = require('./exchangeAccountAdapter')
const TradeAccount = require('../simex/tradeAccount')
const TraderJob = require('../trader/traderJob')

const baseLogger = console

const quietLogger = {
  info: () => { },
  error: baseLogger.error,
  log: baseLogger.log
}

const createSimulatedTrader = config => {
  const tradeAccount = TradeAccount(TantalusLogger(quietLogger), config.clientId)
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

  createTraders (workerConfig) {
    const configsGenerator = TraderConfigsGenerator()
      .createGenerator(workerConfig.generatorConfig)

    this.logger.info(`creating traders ix [${workerConfig.configsStartIx}] to [${workerConfig.configsEndIx}]`)
    const length = workerConfig.configsEndIx - workerConfig.configsStartIx + 1
    this.traderPairs = Array.from({ length }, (_, ix) => {
      const traderConfig = configsGenerator.nth(workerConfig.configsStartIx + ix)
      return this.simulatedTraderFunc(traderConfig)
    })
    this.logger.info(`created ${this.traderPairs.length} traders`)
  }

  drainTransactions (transactionsSlice) {
    const txs = transactionsSlice.transactions
    this.setLastTransactionsPrice(txs)
    return Promise.all(this.traderPairs.map(({ trader, exchangeAdapter }) => {
      exchangeAdapter.setTransactions(txs)
      return trader.tick(transactionsSlice.unixNow)
    }))
  }

  setLastTransactionsPrice (transactions) {
    if (transactions.length) {
      this.lastTransactionPrice = transactions[transactions.length - 1].price
    }
  }

  getAccounts () {
    return this.traderPairs.map(({ trader, exchangeAdapter }) => {
      const account = exchangeAdapter.getAccount()
      const clientId = account.clientId
      const amount = amountString(account.balances.xbt_balance)
      const price = priceString(this.lastTransactionPrice)
      const volume = volumeString(account.balances.gbp_balance)

      const fullValue = account.balances.gbp_balance +
        roundVolume(account.balances.xbt_balance, this.lastTransactionPrice)
      const fullVolume = volumeString(fullValue)

      return { clientId, amount, price, volume, fullValue, fullVolume }
    })
  }
}

module.exports = PartitionWorker
