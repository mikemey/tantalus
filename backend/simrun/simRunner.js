const { timestamp } = require('./simrunUtils')
const { TantalusLogger } = require('../utils/tantalusLogger')

const ExchangeAccountAdapter = require('./exchangeAccountAdapter')
const TradeAccount = require('../simex/tradeAccount')
const TraderJob = require('../trader/traderJob')
const { amountString, priceString, volumeString, roundVolume } = require('../utils/ordersHelper')

const quietLogger = {
  info: console.info,
  error: console.error,
  log: console.log
}

const TransactionPartitioner = (tradePairs, startDate, txsUpdateSeconds) => {
  const data = {
    latestSliceTransactions: [],
    nextSliceStartDate: startDate + txsUpdateSeconds
  }

  const runBatch = transactions => {
    const slices = sliceTransactions(transactions)
    if (slices.length) return sendToTraders(slices, 0)
    return Promise.resolve()
  }

  const drainLastSlice = () => drainTransactions(
    createNextTransactionsSlice()
  )

  const sliceTransactions = transactions => transactions.reduce((allSlices, tx) => {
    if (tx.date >= data.nextSliceStartDate) {
      const simulatedNow = data.nextSliceStartDate - 1
      allSlices.push(...emptySlicesBetween(tx.date, simulatedNow))
      allSlices.push(createNextTransactionsSlice())
    }
    data.latestSliceTransactions.push(tx)
    return allSlices
  }, [])

  const emptySlicesBetween = (txDate, simulatedNow) => {
    const length = (txDate - simulatedNow) / txsUpdateSeconds
    if (length >= 1) {
      return Array.from({ length }, (_0, _1) => createNextTransactionsSlice())
    }
    return []
  }

  const createNextTransactionsSlice = () => {
    const newSlice = {
      unixNow: data.nextSliceStartDate - 1,
      transactions: data.latestSliceTransactions
    }
    data.nextSliceStartDate += txsUpdateSeconds
    data.latestSliceTransactions = []
    return newSlice
  }

  const sendToTraders = (slices, sliceIx) => {
    return drainTransactions(slices[sliceIx])
      .then(() => {
        sliceIx += 1
        if (sliceIx < slices.length) {
          return sendToTraders(slices, sliceIx)
        }
      })
  }

  const drainTransactions = slice => Promise.all(
    tradePairs.map(({ trader, exchangeAdapter }) => {
      exchangeAdapter.setTransactions(slice.transactions)
      return trader.tick(slice.unixNow)
    })
  )

  return { runBatch, drainLastSlice }
}

const SimRunner = (baseLogger, transactionsSource, traderConfigs, txsUpdateSeconds) => {
  const runnerLog = TantalusLogger(baseLogger, 'SimRun')
  let partitioner

  const run = () => {
    runnerLog.info('creating traders...')
    const tradePairs = traderConfigs.map(createTradePair)
    return simulateNextBatch(tradePairs)
  }

  const createTradePair = config => {
    const tradeAccount = TradeAccount(TantalusLogger(quietLogger), config.clientId)
    const exchangeAdapter = ExchangeAccountAdapter(tradeAccount)
    const trader = TraderJob(quietLogger, config, exchangeAdapter)
    return { trader, exchangeAdapter }
  }

  const simulateNextBatch = tradePairs => {
    if (transactionsSource.hasNext()) {
      runnerLog.info('next DB batch...')
      return transactionsSource.next()
        .then(({ from, to, transactions }) => {
          runnerLog.info(`processing DB batch: ${timestamp(from)} -> ${timestamp(to)}`)
          if (!partitioner) {
            partitioner = TransactionPartitioner(tradePairs, from, txsUpdateSeconds)
          }
          if (transactions.length) {
            lastTransactionPrice = transactions[transactions.length - 1].price
          }
          return partitioner.runBatch(transactions)
            .then(() => simulateNextBatch(tradePairs))
        })
    }
    runnerLog.info('no more batches, draining last transactions...')
    return partitioner.drainLastSlice()
      .then(() => tradePairs.forEach(({ trader, exchangeAdapter }) => {
        const account = exchangeAdapter.getAccountSync()

        const amount = amountString(account.balances.xbt_balance)
        const price = priceString(lastTransactionPrice)
        const volume = volumeString(account.balances.gbp_balance)
        const fullValue = account.balances.gbp_balance +
          roundVolume(account.balances.xbt_balance, lastTransactionPrice)

        runnerLog.info(`[${account.clientId}]:`)
        runnerLog.info(`\t${volumeString(fullValue)} = ${volume} + ${amount} (${price})`)
      }))
  }

  return {
    run
  }
}

module.exports = SimRunner
