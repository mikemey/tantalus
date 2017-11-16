const expect = require('chai').expect

const TransactionsSource = require('../../backend/simrun/transactionsSource')

describe('Transaction source', () => {
  const transactions = [
    { tid: 300000, date: 430 },
    { tid: 280610, date: 280 },
    { tid: 280302, date: 280 },
    { tid: 230000, date: 230 }
  ]

  const firstSlice = [transactions[1], transactions[2], transactions[3]]
  const secondSlice = []
  const thirdSlice = [transactions[0]]

  const mockRepo = (earliestDate, latestDate) => {
    return {
      getEarliestTransaction: () => Promise.resolve(earliestDate),
      getLatestTransaction: () => Promise.resolve(latestDate),
      readTransactions: (from, to) => {
        if (from === 230 && to === 329) return Promise.resolve(firstSlice)
        if (from === 330 && to === 429) return Promise.resolve(secondSlice)
        if (from === 430 && to === 529) return Promise.resolve(thirdSlice)
        if (from === 400 && to === 499) return Promise.resolve(thirdSlice)
        throw Error(`readTransactions: unexpected parameters: from: ${from}, to ${to}`)
      }
    }
  }

  it('returns slices', () => {
    const batchSeconds = 100

    const expectBatch = (from, to, transactions, next = true) => batch => {
      batch.should.deep.equal({ from, to, next, transactions })
      if (next) return transactionsSource.next()
    }

    const transactionsSource = TransactionsSource(mockRepo(230, 430))
    return transactionsSource.init(batchSeconds)
      .then(() => transactionsSource.next())
      .then(expectBatch(230, 329, firstSlice))
      .then(expectBatch(330, 429, secondSlice))
      .then(expectBatch(430, 529, thirdSlice, false))
  })

  it('should throw error when next called after last slice', () => {
    const transactionsSource = TransactionsSource(mockRepo(400, 499))
    return transactionsSource.init(100)
      .then(() => transactionsSource.next())
      .then(batch => {
        batch.next.should.equal(false)
        expect(() => transactionsSource.next())
          .to.throw(Error, 'No more transactions available (latest date: 499)!')
      })
  })
})
