const { TantalusLogger } = require('../utils/tantalusLogger')

const TraderConfigsGenerator = require('./traderConfigsGenerator')

const ExchangeAccountAdapter = require('./exchangeAccountAdapter')
const TradeAccount = require('../simex/tradeAccount')
const TraderJob = require('../trader/traderJob')

const quietLogger = {
  info: () => { },
  error: console.error,
  log: console.log
}

// let lastTransactionPrice = 0
// const printBalance = () => doSome()
//   .then(() => tradePairs
//     .map(({ trader, exchangeAdapter }) => {
//       const account = exchangeAdapter.getAccountSync()
//       const clientId = account.clientId
//       const amount = amountString(account.balances.xbt_balance)
//       const price = priceString(lastTransactionPrice)
//       const volume = volumeString(account.balances.gbp_balance)
//       const fullValue = account.balances.gbp_balance + roundVolume(account.balances.xbt_balance, lastTransactionPrice)
//       const fullVolume = volumeString(fullValue)

//       return { clientId, amount, price, volume, fullValue, fullVolume }
//     })

const createSimulatedTrader = config => {
  const tradeAccount = TradeAccount(TantalusLogger(quietLogger), config.clientId)
  const exchangeAdapter = ExchangeAccountAdapter(tradeAccount)
  const trader = TraderJob(quietLogger, config, exchangeAdapter)
  return { trader, exchangeAdapter }
}

class PartitionWorker {
  constructor (simulatedTraderFunc = createSimulatedTrader) {
    this.traderPairs = []
    this.simulatedTraderFunc = simulatedTraderFunc
  }

  createTraders (workerConfig) {
    const configsGenerator = TraderConfigsGenerator()
      .createGenerator(workerConfig.generatorConfig)

    const length = workerConfig.configsEndIx - workerConfig.configsStartIx + 1
    this.traderPairs = Array.from({ length }, (_, ix) => {
      const traderConfig = configsGenerator.nth(workerConfig.configsStartIx + ix)
      return this.simulatedTraderFunc(traderConfig)
    })
  }

  drainTransactions (transactionsSlice) {
    return Promise.resolve()
  }

  getAccounts () {
    return {}
  }
}

module.exports = PartitionWorker
