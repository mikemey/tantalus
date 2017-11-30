/* global describe before beforeEach it */

const helpers = require('../utils-test/helpers')
const withoutId = helpers.copyWithoutIDField
const TransactionsRepo = require('../transactions/transactionsRepo')

describe('Transaction repo', () => {
  const transactionsRepo = TransactionsRepo()

  const dbTransaction = time => {
    return { amount: 671, date: time, price: 561300, tid: time }
  }

  describe('with prepopulated data', () => {
    const dbTxs = [
      dbTransaction(1402),
      dbTransaction(1303),
      dbTransaction(1603),
      dbTransaction(1302),
      dbTransaction(1042),
      dbTransaction(1103)
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

    it('returns latest transaction', () => {
      const expectedTx = withoutId(dbTxs[2])
      return transactionsRepo.getLatestTransaction()
        .then(earliestTx => earliestTx.should.deep.equal(expectedTx))
    })

    it('counts transaction between dates (inclusive)', () => {
      return transactionsRepo.countTransactionsBetween(1103, 1303)
        .then(count => count.should.equal(3))
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

    it('latest transaction returns empty object', () => {
      return transactionsRepo.getLatestTransaction()
        .then(earliestTx => earliestTx.should.deep.equal({}))
    })
  })
})
