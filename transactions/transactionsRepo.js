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
    .find({}, { projection: { _id: false } })
    .sort({ tid: -1 })
  )

  const getEarliestTransaction = () => singleDocument(transactionsCollection()
    .find({}, { projection: { _id: false } })
    .sort({ tid: 1 })
  )

  const store = transactions => transactionsCollection().insertMany(transactions)
    .then(result => {
      if (result.insertedCount === transactions.length) return transactions
      else throw new Error('insert transactions failed: ' + result.message)
    })

  const readTransactions = (from, to) => transactionsCollection()
    .find({ date: { $gte: from, $lte: to } }, { projection: { _id: false } })
    .sort({ tid: 1 })
    .toArray()

  const countTransactionsBetween = (from, to) => transactionsCollection()
    .count({ date: { $gte: from, $lte: to } })

  return {
    getLatestTransactionId,
    getEarliestTransaction,
    store,
    readTransactions,
    getLatestTransaction,
    countTransactionsBetween
  }
}

module.exports = TransactionRepo
