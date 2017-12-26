const moment = require('moment')

const ScheduleRepo = require('./scheduleRepo')
const { supportedPeriods, cutoffDate } = require('../backend/tickers/graphPeriods')

const NOT_AVAIL = 'N/A'
const LIMIT_RESULTS = 100

const GraphService = log => {
  const scheduleRepo = ScheduleRepo()

  const createGraphDatasets = () => Promise.all(supportedPeriods.map(period => {
    const since = cutoffDate(period)
    return scheduleRepo.getTickersSorted(since.toDate())
      .then(flattenTickers)
      .then(sumupTickers(since))
      .then(createGraphData)
      .then(sortGraphDataWithProviders)
      .then(graphData => scheduleRepo.storeGraphData(period, graphData))
  })).then(storedPeriods => log.info('stored graph periods: ' + storedPeriods.length))

  return {
    createGraphDatasets,
    LIMIT_RESULTS
  }
}

// ========================= flattenTickers =====================
const flattenTickers = allChartTickers => allChartTickers.map(chartTicker => {
  chartTicker.tickers = chartTicker.tickers.reduce((flattened, tick) => {
    if (tick.name === 'coindesk') {
      flattened.push(flatPrice(tick, 'ask', false))
    } else {
      flattened.push(flatPrice(tick, 'bid', true))
      flattened.push(flatPrice(tick, 'ask', true))
    }
    return flattened
  }, [])
  return chartTicker
})

const flatPrice = (tick, key, attachQualifier) => ({
  name: attachQualifier ? `${tick.name} ${key}` : tick.name,
  value: chartValueFrom(tick[key])
})

const chartValueFrom = tickVal => !tickVal || tickVal === NOT_AVAIL
  ? null
  : tickVal

// ========================= sumupTickers =====================
const sumupTickers = since => allChartTickers => {
  const sliceDuration = moment.utc().diff(since) / LIMIT_RESULTS
  let nextTimestamp = since
  const dataPointTickers = allChartTickers.reduce((dataPoints, currentTicker) => {
    const currentCreated = moment.utc(currentTicker.created)
    if (currentCreated.isAfter(nextTimestamp)) {
      dataPoints.push([])
      nextTimestamp = nextTimestamp.add(sliceDuration)
    }
    dataPoints[dataPoints.length - 1].push(currentTicker)
    return dataPoints
  }, [])

  return dataPointTickers.map(sumDataPoints)
}

const sumDataPoints = dataPoints => {
  const created = dataPoints[Math.floor(dataPoints.length / 2)].created
  const tickers = dataPoints
    .reduce((tickerSums, curr) => {
      curr.tickers.forEach(tick => addTickerValues(tickerSums, tick))
      return tickerSums
    }, [])
    .map(averageSums)

  return { created, tickers }
}

const addTickerValues = (tickerSums, tick) => {
  let tickerSum = tickerSums.find(ts => ts.name === tick.name)
  if (!tickerSum) {
    tickerSum = { name: tick.name, sum: 0, count: 0 }
    tickerSums.push(tickerSum)
  }
  if (tick.value) {
    tickerSum.sum += tick.value
    tickerSum.count++
  }
}

const averageSums = tickSum => {
  tickSum.value = Math.round(tickSum.sum / tickSum.count)
  return tickSum
}

// ========================= createGraphData =====================
const createGraphData = chartPoints => chartPoints.reduce((datasets, chartPoint) => {
  chartPoint.tickers.forEach(ticker => {
    addChartPoint(datasets, chartPoint.created, ticker.name, ticker.value)
  })
  return datasets
}, [])

const addChartPoint = (datasets, created, label, value) => {
  const dataset = getDatasetFrom(datasets, label)
  dataset.data.push(chartPoint(created, value || null))
}

const getDatasetFrom = (datasets, label) => {
  let dataset = datasets.find(data => data.label === label)
  if (!dataset) {
    dataset = { label, data: [] }
    datasets.push(dataset)
  }
  return dataset
}

const chartPoint = (x, y) => { return { x, y } }

// ========================= sortGraphData =====================
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
