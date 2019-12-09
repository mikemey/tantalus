const moment = require('moment')

const ScheduleRepo = require('./scheduleRepo')
const { supportedPeriods, cutoffDate, _1y } = require('../backend/tickers/graphPeriods')

const NOT_AVAIL = 'N/A'
const LIMIT_RESULTS = 100

const GraphService = (log, metadataService) => {
  const scheduleRepo = ScheduleRepo()

  const createGraphDatasets = async () => {
    const since = cutoffDate(_1y)
    const tickerCursor = scheduleRepo.getTickersSortedCursor(since.toDate())

    const periodCollectors = supportedPeriods.map(PeriodCollector)
    while (await tickerCursor.hasNext()) {
      const ticker = flattenTicker(await tickerCursor.next())
      periodCollectors.forEach(collector => collector.nextTicker(ticker))
    }

    return Promise
      .all(periodCollectors.map(collector => {
        const graphData = collector.getPeriodGraphs()
        return scheduleRepo.storeGraphData(collector.period, graphData)
      }))
      .then(storedPeriods => {
        metadataService.setGraphsCount(storedPeriods.length)
        log.info('stored graph periods: ' + storedPeriods.length)
      })
  }
  return {
    createGraphDatasets,
    LIMIT_RESULTS
  }
}

const flattenTicker = fullTicker => {
  fullTicker.tickers = fullTicker.tickers.reduce((flattened, tick) => {
    if (tick.name === 'coindesk') {
      flattened.push(flatPrice(tick, 'ask', false))
    } else {
      flattened.push(flatPrice(tick, 'bid', true))
      flattened.push(flatPrice(tick, 'ask', true))
    }
    return flattened
  }, [])
  fullTicker.moment = moment.utc(fullTicker.created)
  return fullTicker
}

const flatPrice = (tick, key, attachQualifier) => ({
  name: attachQualifier ? `${tick.name} ${key}` : tick.name,
  value: chartValueFrom(tick[key])
})

const chartValueFrom = tickVal => !tickVal || tickVal === NOT_AVAIL
  ? null
  : tickVal

const PeriodCollector = period => {
  const periodCutoff = cutoffDate(period)
  const now = moment.utc()
  const sliceDuration = now.diff(periodCutoff) / LIMIT_RESULTS
  let bucketStart = now.subtract(sliceDuration)

  const periodGraphs = []
  const newBucketData = () => {
    return { sum: 0, count: 0, date: null }
  }

  const getExchangeGraph = ticker => {
    let exchangeGraph = periodGraphs.find(graph => graph.label === ticker.name)
    if (!exchangeGraph) {
      exchangeGraph = { label: ticker.name, data: [], bucket: newBucketData() }
      periodGraphs.push(exchangeGraph)
    }
    return exchangeGraph
  }

  const sumupBuckets = () => periodGraphs.forEach(exgraph => {
    if (exgraph.bucket.count > 0) {
      exgraph.data.push({
        x: bucketStart.clone().add(sliceDuration).toDate(),
        y: Math.round(exgraph.bucket.sum / exgraph.bucket.count)
      })
      exgraph.bucket = newBucketData()
    }
  })

  const nextTicker = fullTicker => {
    if (fullTicker.moment.isBefore(periodCutoff)) {
      return
    }
    if (fullTicker.moment.isBefore(bucketStart)) {
      sumupBuckets()
    }
    while (fullTicker.moment.isBefore(bucketStart)) {
      bucketStart = bucketStart.subtract(sliceDuration)
    }
    fullTicker.tickers.forEach(exchangeTicker => {
      if (exchangeTicker.value) {
        const exchangeGraph = getExchangeGraph(exchangeTicker)
        exchangeGraph.bucket.sum += exchangeTicker.value
        exchangeGraph.bucket.count += 1
        exchangeGraph.bucket.date = fullTicker.created
      }
    })
  }

  const getPeriodGraphs = () => {
    sumupBuckets()
    periodGraphs.forEach(graph => { delete graph.bucket })
    return sortGraphDataWithProviders(periodGraphs)
  }

  return { period, nextTicker, getPeriodGraphs }
}

const sortGraphDataWithProviders = graphData => graphData.sort((a, b) => sortOrdinalOf(a) - sortOrdinalOf(b))

const sortOrdinalOf = dataset => {
  switch (dataset.label) {
    case 'coinfloor bid':
      return 0
    case 'coinfloor ask':
      return 1
    case 'coindesk':
      return 2
    case 'gdax bid':
      return 3
    case 'gdax ask':
      return 4
    default:
      return 99
  }
}

module.exports = GraphService
