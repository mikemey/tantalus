const mongo = require('../utils/mongoConnection')

const TransactionRepo = () => {
  const transactionsCollection = () => mongo.db.collection(mongo.transactionCollectionName)

  const getLatestTransactionId = () => getLatestTransaction()
    .then(txs => txs.tid ? txs.tid : 0)

  const singleDocument = cursor => cursor
    .limit(1)
    .toArray()
    .then(docs => docs.length ? docs[0] : {})

  const getLatestTransaction = () => singleDocument(transactionsCollection()
    .find({}, { _id: false })
    .sort({ tid: -1 })
  )

  const getEarliestTransaction = () => singleDocument(transactionsCollection()
    .find({}, { _id: false })
    .sort({ tid: 1 })
  )

  const store = transactions => transactionsCollection().insertMany(transactions)
    .then(result => {
      if (result.insertedCount === transactions.length) return transactions
      else throw new Error('insert transactions failed: ' + result.message)
    })

  const readTransactions = (from, to) => transactionsCollection()
    .find({ date: { $gte: from, $lte: to } }, { _id: false })
    .sort({ tid: -1 })
    .toArray()

  return {
    getLatestTransactionId,
    getEarliestTransaction,
    store,
    readTransactions,
    getLatestTransaction
  }
}

module.exports = TransactionRepo
