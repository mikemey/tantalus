const mongo = require('../../utils/mongoConnection')

const ScheduleRepo = () => {
  const tickersCollection = () => mongo.db.collection(mongo.tickersCollectionName)
  const graphsCollection = () => mongo.db.collection(mongo.graphsCollectionName)

  const storeLatestTickers = tickersData => tickersCollection().insertOne(tickersData)
    .then(result => {
      if (result.insertedCount === 1) return tickersData
      else throw new Error('insert ticker failed: ' + result.message)
    })

  const getTickersSorted = since => tickersCollection()
    .find({ created: { $gte: since } }, { _id: false, created: true, tickers: true })
    .sort({ created: 1 })
    .toArray()

  const upsertOptions = { upsert: true }

  const storeGraphData = (period, graphData) =>
    graphsCollection().updateOne({ period }, { $set: { period, graphData } }, upsertOptions)
      .then(response => {
        if (response.result.ok) return graphData
        else throw new Error('insert graph data failed: ' + response.message)
      })

  return {
    storeLatestTickers,
    getTickersSorted,
    storeGraphData
  }
}

module.exports = ScheduleRepo
