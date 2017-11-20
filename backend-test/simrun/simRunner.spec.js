const SimRunner = require('../../backend/simrun/simRunner')

describe('Sim Runner', () => {
  const txsUpdateSeconds = 100
  const firstBatch = [{ date: 100, a: 2 }, { date: 200, a: 3 }, { date: 249, a: 4 }]
  const secondBatch = [{ date: 299, a: 5 }, { date: 500, a: 6 }]

  const TransactionSourceMock = () => {
    let batchIx = 0
    const batches = [
      { from: 100, to: 249, transactions: firstBatch },
      { from: 250, to: 599, transactions: secondBatch }
    ]

    const hasNext = () => batchIx < batches.length
    const next = () => Promise.resolve(batches[batchIx++])
    return { next, hasNext }
  }

  it('runs batches of transactions against traders', () => {
    const mockPartitionExecutor = () => {
      const receivedSlices = []
      return {
        drainTransactions: transactionSlice => {
          receivedSlices.push(transactionSlice)
          return Promise.resolve()
        },
        getReceived: () => receivedSlices
      }
    }
    const partitionExecutorMock = mockPartitionExecutor()
    const simRunner = SimRunner(console, TransactionSourceMock(), partitionExecutorMock, txsUpdateSeconds)

    return simRunner.run()
      .then(() => {
        partitionExecutorMock.getReceived().should.deep.equal([
          { unixNow: 199, transactions: [firstBatch[0]] },
          { unixNow: 299, transactions: [firstBatch[1], firstBatch[2], secondBatch[0]] },
          { unixNow: 399, transactions: [] },
          { unixNow: 499, transactions: [] },
          { unixNow: 599, transactions: [secondBatch[1]] }
        ])
      })
  })
})