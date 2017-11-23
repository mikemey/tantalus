const expect = require('chai').expect

const TransactionsSource = require('../../backend/simrun/transactionsSource')

describe('Transaction source', () => {
  const transactionsEarliestDate = 230
  const transactionsLatestDate = 430

  const transactions = [
    { tid: 300000, date: 430 },
    { tid: 280610, date: 280 },
    { tid: 280302, date: 280 },
    { tid: 230000, date: 230 }
  ]

  const firstSlice = [transactions[3], transactions[2], transactions[1]]
  const secondSlice = []
  const thirdSlice = [transactions[0]]

  const transactionWith = date => { return { date } }

  const mockRepo = (earliestDate, latestDate) => {
    return {
      getEarliestTransaction: () => Promise.resolve(transactionWith(earliestDate)),
      getLatestTransaction: () => Promise.resolve(transactionWith(latestDate)),
      readTransactions: (from, to) => {
        if (from === 230 && to === 329) return Promise.resolve(firstSlice)
        if (from === 330 && to === 429) return Promise.resolve(secondSlice)
        if (from === 430 && to === 529) return Promise.resolve(thirdSlice)
        if (from === 400 && to === 499) return Promise.resolve(thirdSlice)
        throw Error(`readTransactions: unexpected parameters: from: ${from}, to ${to}`)
      }
    }
  }

  let transactionsSource

  const expectBatch = (from, to, transactions, hasNext = true) => batch => {
    batch.should.deep.equal({ from, to, transactions })

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
    const batchSeconds = 100
    return transactionsSource.init(batchSeconds)
      .then(expectHasNext())
      .then(() => transactionsSource.next())
      .then(expectBatch(230, 329, firstSlice))
      .then(expectBatch(330, 429, secondSlice))
      .then(expectBatch(430, 529, thirdSlice, false))
  })

  it('should throw error when next called after last slice', () => {
    const repoMock = mockRepo(400, 499)
    transactionsSource = TransactionsSource(console, repoMock)
    return transactionsSource.init(100)
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
    const batchSeconds = 100
    return transactionsSource.init(batchSeconds)
      .then(expectHasNext())
      .then(() => transactionsSource.next())
      .then(() => {
        transactionsSource.getStartDate().should.equal(transactionsEarliestDate)
        transactionsSource.getEndDate().should.equal(transactionsLatestDate)
      })
  })
})
