/* global describe before beforeEach it */

const helpers = require('../helpers')
const withoutId = helpers.copyWithoutIDField
const TransactionsRepo = require('../../backend/transactions/transactionsRepo')

describe('Transaction repo', () => {
  const transactionsRepo = TransactionsRepo()

  const dbTransaction = time => {
    return { amount: 671, date: time, price: 561300, tid: time }
  }

  describe('with prepopulated data', () => {
    const fromTime = 1000
    const dbTxs = [
      dbTransaction(fromTime + 402),
      dbTransaction(fromTime + 303),
      dbTransaction(fromTime + 603),
      dbTransaction(fromTime + 302),
      dbTransaction(fromTime + 42),
      dbTransaction(fromTime + 103)
    ]

    before(() => helpers.dropDatabase()
      .then(() => helpers.insertTransactions(dbTxs))
    )

    it('reads transactions slice in order', () => {
      const expectedTxs = withoutId([dbTxs[5], dbTxs[3], dbTxs[1]])
      return transactionsRepo.readTransactions(1103, 1401)
        .then(txs => txs.should.deep.equal(expectedTxs))
    })

    it('return empty array when no data', () => {
      return transactionsRepo.readTransactions(1104, 1301)
        .then(transactionChunks => transactionChunks.should.deep.equal([]))
    })

    it('returns latest transactionId', () => {
      return transactionsRepo.getLatestTransactionId()
        .then(latestId => latestId.should.equal(1603))
    })

    it('returns earliest transaction', () => {
      const expectedTx = withoutId(dbTxs[4])
      return transactionsRepo.getEarliestTransaction()
        .then(earliestTx => earliestTx.should.deep.equal(expectedTx))
    })
  })

  describe('without data', () => {
    before(helpers.dropDatabase)

    it('read transactions return empty array', () => {
      return transactionsRepo.readTransactions(1104, 1301)
        .then(transactionChunks => transactionChunks.should.deep.equal([]))
    })

    it('latest transactionId returns 0', () => {
      return transactionsRepo.getLatestTransactionId()
        .then(latestId => latestId.should.equal(0))
    })

    it('earliest transaction returns empty object', () => {
      return transactionsRepo.getEarliestTransaction()
        .then(earliestTx => earliestTx.should.deep.equal({}))
    })
  })
})
