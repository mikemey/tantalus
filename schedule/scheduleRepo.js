const moment = require('moment')

const mongo = require('../utils/mongoConnection')
const { cutoffDate } = require('../backend/tickers/graphPeriods')

const SCHEDULE_METADATA = 'schedule'

const ScheduleRepo = () => {
  const tickersCollection = () => mongo.db.collection(mongo.tickersCollectionName)
  const graphsCollection = () => mongo.db.collection(mongo.graphsCollectionName)
  const metadataCollection = () => mongo.db.collection(mongo.metadataCollectionName)

  const storeLatestTickers = tickersData => tickersCollection().insertOne(tickersData)
    .then(result => {
      if (result.insertedCount === 1) return tickersData
      else throw new Error('insert ticker failed: ' + result.message)
    })

  const getTickersSorted = since => tickersCollection()
    .find({ created: { $gte: since } }, { projection: { _id: false, created: true, tickers: true } })
    .sort({ created: 1 })
    .toArray()

  const getTickersSortedCursor = since => tickersCollection()
    .find({ created: { $gte: since } }, { projection: { _id: false, created: true, tickers: true } })
    .sort({ created: -1 })

  const upsertOptions = { upsert: true }

  const storeGraphData = (period, graphData) =>
    graphsCollection().updateOne({ period }, { $set: { period, graphData } }, upsertOptions)
      .then(response => {
        if (response.result.ok) return graphData
        else throw new Error('insert graph data failed: ' + response.message)
      })

  const getGraphdata = (period, dataPoints) => {
    const since = cutoffDate(period)

    const duration = moment.duration(moment.utc().diff(since)).asMilliseconds()
    const sliceDuration = duration / dataPoints

    const now = new Date()
    const groupByConditions = Array.from({ length: dataPoints }).reduce((cumulated, _, ix) => {
      const sliceDate = cumulated.sliceDate - sliceDuration
      const currentDate = new Date(sliceDate)
      return {
        sliceDate,
        result: {
          $cond: [
            { $lt: ['$created', currentDate] },
            currentDate,
            cumulated.result
          ]
        }
      }
    }, { result: now, sliceDate: now.valueOf() }).result

    const bidTradeQuery = { trade: 'bid', created: '$created', price: '$tickers.bid' }
    const askTradeQuery = { trade: 'ask', created: '$created', price: '$tickers.ask' }
    const tradeTickersQuery = {
      $cond: [
        { $gt: ['$tickers.bid', 0] },
        [bidTradeQuery, askTradeQuery],
        [askTradeQuery]
      ]
    }

    return tickersCollection()
      .aggregate([
        { $match: { created: { $gte: since.toDate() } } },
        { $unwind: '$tickers' },
        {
          $group: {
            _id: '$tickers.name',
            coords: {
              $push: { tickers: tradeTickersQuery }
            }
          }
        },
        { $unwind: '$coords' },
        { $project: { tickers: '$coords.tickers' } },
        { $unwind: '$tickers' },
        {
          $project: {
            label: { $concat: ['$_id', ' ', '$tickers.trade'] },
            created: '$tickers.created',
            price: '$tickers.price'
          }
        },
        {
          $group: {
            _id: {
              label: '$label',
              sliceDate: groupByConditions
            },
            slicePrice: { $avg: '$price' }
          }
        },
        {
          $group: {
            _id: '$_id.label',
            data: {
              $push: {
                x: '$_id.sliceDate', y: { $floor: '$slicePrice' }
              }
            }
          }
        },
        { $project: { _id: 0, label: '$_id', data: '$data' } }
      ], { allowDiskUse: true })
      .toArray()
  }

  const storeMetadata = metadata =>
    metadataCollection().updateOne({ type: SCHEDULE_METADATA }, { $set: metadata }, upsertOptions)
      .then(response => {
        if (response.result.ok) return metadata
        else throw new Error('insert metadata failed: ' + response.message)
      })

  return {
    storeLatestTickers,
    getTickersSorted,
    storeGraphData,
    getGraphdata,
    storeMetadata,
    getTickersSortedCursor
  }
}

module.exports = ScheduleRepo
