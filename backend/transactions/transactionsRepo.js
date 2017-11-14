const mongo = require('../utils/mongoConnection')

const TransactionRepo = () => {
  const transactionsCollection = () => mongo.db.collection(mongo.transactionCollectionName)

  const getLatestTransactionId = () => transactionsCollection()
    .find({}, { tid: true })
    .sort({ tid: -1 })
    .limit(1)
    .toArray()
    .then(transactions => transactions.length ? transactions[0].tid : 0)

  const store = transactions => transactionsCollection().insertMany(transactions)
    .then(result => {
      if (result.insertedCount === transactions.length) return transactions
      else throw new Error('insert transactions failed: ' + result.message)
    })

  return {
    getLatestTransactionId,
    store
  }
}

module.exports = TransactionRepo
