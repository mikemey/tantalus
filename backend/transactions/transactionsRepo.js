const mongo = require('../utils/mongoConnection')

const TransactionRepo = () => {
  const transactionsCollection = () => mongo.db.collection(mongo.transactionCollectionName)

  const getLatestTransactionId = () => transactionsCollection()
    .find({}, { tid: true })
    .sort({ tid: -1 })
    .limit(1)
    .toArray()
    .then(txs => txs.length ? txs[0].tid : 0)

  const getEarliestTransaction = () => transactionsCollection()
    .find({}, { _id: false })
    .sort({ tid: 1 })
    .limit(1)
    .toArray()
    .then(txs => txs.length ? txs[0] : {})

  const store = transactions => transactionsCollection().insertMany(transactions)
    .then(result => {
      if (result.insertedCount === transactions.length) return transactions
      else throw new Error('insert transactions failed: ' + result.message)
    })

  const readTransactions = (from, to) => transactionsCollection()
    .find({ date: { $gte: from, $lte: to } }, { _id: false })
    .sort({ tid: 1 })
    .toArray()

  return {
    getLatestTransactionId,
    getEarliestTransaction,
    store,
    readTransactions
  }
}

module.exports = TransactionRepo
