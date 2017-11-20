const { timestamp } = require('./simrunUtils')
const { TantalusLogger } = require('../utils/tantalusLogger')

const TransactionPartitioner = (baseLogger, partitionExecutor, startDate, txsUpdateSeconds) => {
  const data = {
    latestSliceTransactions: [],
    nextSliceStartDate: startDate + txsUpdateSeconds
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
    return partitionExecutor.drainTransactions(slices[sliceIx])
      .then(() => {
        sliceIx += 1
        if (sliceIx < slices.length) {
          return sendToTraders(slices, sliceIx)
        }
      })
  }

  return { runBatch, drainLastSlice }
}

const SimRunner = (baseLogger, transactionsSource, partitionExecutor, txsUpdateSeconds) => {
  const runnerLog = TantalusLogger(baseLogger, 'SimRun')
  let partitioner

  const simulateNextBatch = () => {
    if (transactionsSource.hasNext()) {
      runnerLog.info('next DB batch...')
      return transactionsSource.next()
        .then(({ from, to, transactions }) => {
          runnerLog.info(`processing DB batch: ${timestamp(from)} -> ${timestamp(to)}`)
          if (!partitioner) {
            partitioner = TransactionPartitioner(baseLogger, partitionExecutor, from, txsUpdateSeconds)
          }
          return partitioner.runBatch(transactions)
            .then(simulateNextBatch)
        })
    }
    runnerLog.info('no more batches, draining last transactions...')
    return partitioner.drainLastSlice()
  }

  return {
    run: simulateNextBatch
  }
}

module.exports = SimRunner
