const expect = require('chai').expect

const TransactionsSource = require('../../simulation/txtrader/txSource')

describe('Transaction source', () => {
  const transactionsEarliestDate = 230
  const transactionsLatestDate = 430

  const transactions = [
    { tid: 300000, date: 430 },
    { tid: 280610, date: 280 },
    { tid: 280302, date: 280 },
    { tid: 230000, date: 230 }
  ]

  const testBatchSeconds = 100
  const firstSlice = [transactions[3], transactions[2], transactions[1]]
  const secondSlice = []
  const thirdSlice = [transactions[0]]

  const oneSlice = [transactions[3], transactions[2], transactions[1], transactions[0]]

  const transactionWith = (date, price) => { return { date, price } }

  const mockRepo = (earliestDate, latestDate, earliestPrice, latestPrice) => {
    return {
      getEarliestTransaction: () => Promise.resolve(transactionWith(earliestDate, earliestPrice)),
      getLatestTransaction: () => Promise.resolve(transactionWith(latestDate, latestPrice)),
      readTransactions: (from, to) => {
        if (from === 230 && to === 329) return Promise.resolve(firstSlice)
        if (from === 330 && to === 429) return Promise.resolve(secondSlice)
        if (from === 430 && to === 431) return Promise.resolve(thirdSlice) // returns slices test
        if (from === 400 && to === 499) return Promise.resolve(thirdSlice) // throw error test
        if (from === 230 && to === 430) return Promise.resolve(oneSlice) // resets batchNum test
        throw Error(`readTransactions: unexpected parameters: from: ${from}, to ${to}`)
      },
      countTransactionsBetween: (from, to) => {
        from.should.equal(earliestDate)
        to.should.equal(latestDate)
        return transactions.length
      }
    }
  }

  let transactionsSource

  const expectBatch = (batchNum, from, to, transactions, hasNext = true) => batch => {
    batch.should.deep.equal({ batchNum, from, to, transactions })

    transactionsSource.hasNext().should.equal(hasNext)
    if (hasNext) return transactionsSource.next()
  }

  const expectHasNext = (hasNext = true) => batch => {
    transactionsSource.hasNext().should.equal(hasNext)
    return batch
  }

  it('returns slices', () => {
    const repoMock = mockRepo(transactionsEarliestDate, transactionsLatestDate)
    transactionsSource = TransactionsSource(console, repoMock)
    return transactionsSource.reset(testBatchSeconds)
      .then(expectHasNext())
      .then(() => transactionsSource.next())
      .then(expectBatch(1, 230, 329, firstSlice))
      .then(expectBatch(2, 330, 429, secondSlice))
      .then(expectBatch(3, 430, 431, thirdSlice, false))
  })

  it('should throw error when next called after last slice', () => {
    const repoMock = mockRepo(400, 499)
    transactionsSource = TransactionsSource(console, repoMock)
    return transactionsSource.reset(testBatchSeconds)
      .then(expectHasNext())
      .then(() => transactionsSource.next())
      .then(() => {
        transactionsSource.hasNext().should.equal(false)
        expect(() => transactionsSource.next())
          .to.throw(Error, 'No more transactions available (latest date: 499)!')
      })
  })

  it('returns start + end dates of complete transaction period', () => {
    const repoMock = mockRepo(transactionsEarliestDate, transactionsLatestDate)
    transactionsSource = TransactionsSource(console, repoMock)
    return transactionsSource.reset(testBatchSeconds)
      .then(expectHasNext())
      .then(() => transactionsSource.next())
      .then(() => {
        transactionsSource.getStartDate().should.equal(transactionsEarliestDate)
        transactionsSource.getEndDate().should.equal(transactionsLatestDate)
      })
  })

  it('returns total count of transactions + batches', () => {
    const repoMock = mockRepo(transactionsEarliestDate, transactionsLatestDate)
    transactionsSource = TransactionsSource(console, repoMock)
    return transactionsSource.reset(testBatchSeconds)
      .then(() => {
        transactionsSource.transactionCount().should.equal(transactions.length)
        transactionsSource.batchCount().should.equal(3)
        return transactionsSource.reset(200)
      })
      .then(() => {
        transactionsSource.transactionCount().should.equal(transactions.length)
        transactionsSource.batchCount().should.equal(2)
      })
  })

  it('resets batchNum', () => {
    const repoMock = mockRepo(transactionsEarliestDate, transactionsLatestDate)
    transactionsSource = TransactionsSource(console, repoMock)
    return transactionsSource.reset(201)
      .then(transactionsSource.next)
      .then(expectBatch(1, 230, 430, oneSlice, false))
      .then(() => {
        transactionsSource.transactionCount().should.equal(transactions.length)
        transactionsSource.batchCount().should.equal(1)
      })
      .then(() => transactionsSource.reset(testBatchSeconds))
      .then(expectHasNext())
      .then(transactionsSource.next)
      .then(expectBatch(1, 230, 329, firstSlice))
      .then(expectBatch(2, 330, 429, secondSlice))
      .then(() => {
        transactionsSource.transactionCount().should.equal(transactions.length)
        transactionsSource.batchCount().should.equal(3)
      })
  })

  it('returns earliest and latest price of transaction period', () => {
    const repoMock = mockRepo(transactionsEarliestDate, transactionsLatestDate, 50, 100)
    transactionsSource = TransactionsSource(console, repoMock)
    return transactionsSource.reset(testBatchSeconds)
      .then(() => {
        transactionsSource.getStartPrice().should.equal(50)
        transactionsSource.getEndPrice().should.equal(100)
      })
  })
})
