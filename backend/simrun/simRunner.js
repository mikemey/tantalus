const { timestamp } = require('./simrunUtils')
const { TantalusLogger } = require('../utils/tantalusLogger')

const TransactionPartitioner = (baseLogger, partitionExecutor, transactionsUpdateSeconds) => {
  const data = {
    latestSliceTransactions: [],
    nextSliceStartDate: 0
  }

  const isReady = () => data.nextSliceStartDate !== 0

  const setStartDate = startDate => {
    data.nextSliceStartDate = startDate + transactionsUpdateSeconds
  }

  const runBatch = transactions => {
    const slices = sliceTransactions(transactions)
    if (slices.length) return sendToTraders(slices, 0)
    return Promise.resolve()
  }

  const drainLastSlice = () => partitionExecutor.drainTransactions(
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
    const length = (txDate - simulatedNow) / transactionsUpdateSeconds
    if (length >= 1) {
      return Array.from({ length }, (_0, _1) => createNextTransactionsSlice())
    }
    return []
  }

  const createNextTransactionsSlice = () => {
    const newSlice = {
      unixNow: data.nextSliceStartDate - 1,
      transactions: data.latestSliceTransactions
        .sort((a, b) => b.tid - a.tid)
    }
    data.nextSliceStartDate += transactionsUpdateSeconds
    data.latestSliceTransactions = []
    return newSlice
  }

  const sendToTraders = (slices, sliceIx) => {
    return partitionExecutor.drainTransactions(slices[sliceIx])
      .then(() => {
        sliceIx += 1
        if (sliceIx < slices.length) {
          return sendToTraders(slices, sliceIx)
        }
      })
  }

  return {
    runBatch,
    drainLastSlice,
    isReady,
    setStartDate
  }
}

const SimRunner = (baseLogger, config, transactionsSource, partitionExecutor) => {
  const transactionsUpdateSeconds = config.transactionsUpdateSeconds
  const rankingLimit = config.rankingLimit

  const runnerLog = TantalusLogger(baseLogger, 'SimRun')
  const partitioner = TransactionPartitioner(baseLogger, partitionExecutor, transactionsUpdateSeconds)

  const run = () => simulateNextBatch()
    .then(logWinnerLoserRankings)

  const logWinnerLoserRankings = () => partitionExecutor.getAllAccountsSorted()
    .then(filterAccountsToLog)
    .then(accounts =>
      accounts.forEach(({ clientId, amount, price, volume, fullVolume }) => {
        runnerLog.info(`[${clientId}]: ${fullVolume} = ${volume} + ${amount} (${price})`)
      })
    )

  const filterAccountsToLog = accounts => {
    const takeWinnersLosers = accounts => {
      const winners = accounts.slice(0, rankingLimit)
      const lastIx = accounts.length - 1
      const losers = accounts.slice(lastIx - rankingLimit, lastIx)
      return winners.concat(losers)
    }
    return accounts.length > (2 * rankingLimit)
      ? takeWinnersLosers(accounts)
      : accounts
  }

  const simulateNextBatch = () => {
    if (transactionsSource.hasNext()) {
      runnerLog.info('next DB batch...')
      return transactionsSource.next()
        .then(({ from, to, transactions }) => {
          runnerLog.info(`processing DB batch: ${timestamp(from)} -> ${timestamp(to)}`)
          if (!partitioner.isReady()) {
            partitioner.setStartDate(from)
          }
          return partitioner.runBatch(transactions)
            .then(simulateNextBatch)
        })
    }
    runnerLog.info('no more batches, draining last transactions...')
    return partitioner.drainLastSlice()
  }

  return {
    run
  }
}

module.exports = SimRunner
