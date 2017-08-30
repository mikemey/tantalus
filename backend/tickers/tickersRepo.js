const mongo = require('../utils/mongoConnection')

const TickerService = () => {
  const tickerCollection = () => mongo.db.collection('tickers')

  const storeTickersData = tickersData => tickerCollection().insertOne(tickersData)
    .then(result => {
      if (result.insertedCount === 1) return tickersData
      else throw new Error('insert ticker failed: ' + result.message)
    })

  const getLatest = () => tickerCollection().find()
    .sort({ 'created': -1 }).limit(1).toArray()
    .then(docs => docs[0])

  return {
    storeTickersData,
    getLatest
  }
}

module.exports = TickerService
