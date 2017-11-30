const { timestamp } = require('./simrunUtils')
const { TantalusLogger } = require('../utils/tantalusLogger')

const TransactionPartitioner = (partitionExecutor, transactionsUpdateSeconds) => {
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

const SimRunner = (baseLogger, transactionsSource, partitionExecutor) => {
  const runnerLog = TantalusLogger(baseLogger, 'SimRun')

  const run = (simConfig, allTraderConfigs, iterationProgress) => {
    const partitioner = TransactionPartitioner(partitionExecutor, simConfig.transactionsUpdateSeconds)
    return partitionExecutor.configureWorkers(simConfig, allTraderConfigs)
      .then(() => simulateNextBatch(partitioner, iterationProgress))
  }

  const simulateNextBatch = (partitioner, iterationProgress) => {
    if (transactionsSource.hasNext()) {
      return transactionsSource.next()
        .then(({ batchNum, from, to, transactions }) => {
          const num = batchNum.toString().padStart(transactionsSource.batchCount().toString().length)
          runnerLog.info(iterationProgress + ' processing batch ' +
            `[${num}/${transactionsSource.batchCount()}]: ${timestamp(from)} -> ${timestamp(to)}`
          )
          if (!partitioner.isReady()) {
            partitioner.setStartDate(from)
          }
          return partitioner.runBatch(transactions)
            .then(() => simulateNextBatch(partitioner, iterationProgress))
        })
    }
    runnerLog.info(iterationProgress + ' no more batches, draining last transactions...')
    return partitioner.drainLastSlice()
  }

  return {
    run
  }
}

module.exports = SimRunner
