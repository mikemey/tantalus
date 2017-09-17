const createTickersRepo = require('./tickersRepo')

const NOT_AVAIL = 'N/A'
const LIMIT_RESULTS = 100

const TickerService = () => {
  const tickersRepo = createTickersRepo()

  const getGraphData = since => {
    return tickersRepo.getTickers(since)
      .then(flattenTickers)
      .then(sumupTickers)
      .then(createGraphData)
      .then(sortGraphData)
  }

  const getLatest = () => tickersRepo.getLatest()
  return {
    getLatest,
    getGraphData,
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
const sumupTickers = allChartTickers => {
  const chunkLength = allChartTickers.length / LIMIT_RESULTS
  if (chunkLength <= 1) return allChartTickers

  const chartGroups = Array.from({ length: LIMIT_RESULTS }, (_, sliceIx) => {
    const offset = chunkLength * sliceIx
    return allChartTickers.slice(offset, offset + chunkLength)
  })
  return chartGroups.map(sumChartGroups(chartGroups.length))
}

const sumChartGroups = count => chartGroup => {
  const created = chartGroup[Math.floor(chartGroup.length / 2)].created
  const tickers = chartGroup
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
const sortGraphData = graphData => graphData.sort((a, b) => sortOrdinalOf(a) - sortOrdinalOf(b))

const sortOrdinalOf = dataset => {
  switch (dataset.label) {
    case 'solidi bid':
      return 0
    case 'solidi ask':
      return 1
    case 'coinfloor bid':
      return 2
    case 'coinfloor ask':
      return 3
    case 'lakebtc bid':
      return 4
    case 'lakebtc ask':
      return 5
    case 'cex bid':
      return 6
    case 'cex ask':
      return 7
    case 'coindesk':
      return 8
    default:
      throw new Error('dataset label not recognised: ' + dataset.label)
  }
}

module.exports = TickerService
