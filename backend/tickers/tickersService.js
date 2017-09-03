const createTickersRepo = require('./tickersRepo')

const NOT_AVAIL = 'N/A'
const LIMIT_RESULTS = 40

const chartPoint = (x, y) => { return { x, y } }

const chartValueFrom = tickVal => !tickVal || tickVal === NOT_AVAIL
  ? undefined
  : tickVal

const getDatasetFrom = (datasets, label) => {
  let dataset = datasets.find(data => data.label === label)
  if (!dataset) {
    dataset = { label, data: [] }
    datasets.push(dataset)
  }
  return dataset
}

const addChartPoint = (datasets, created, name, dbValue, nameSuffix) => {
  const chartValue = chartValueFrom(dbValue)
  if (chartValue) {
    const label = `${name}${nameSuffix}`
    const dataset = getDatasetFrom(datasets, label)
    dataset.data.push(chartPoint(created, chartValue))
  }
}

const setGraphDataFromTick = (datasets, created) => tick => {
  if (tick.name === 'coindesk') {
    addChartPoint(datasets, created, tick.name, tick.ask, '')
    return
  }
  if (tick.bid) addChartPoint(datasets, created, tick.name, tick.bid, ' bid')
  if (tick.ask) addChartPoint(datasets, created, tick.name, tick.ask, ' ask')
}

const sampleTickers = charts => {
  const skip = (charts.length - 1) / (LIMIT_RESULTS - 1)
  return skip < 1
    ? _ => true
    : (_, ix) => (ix % skip) < 1
}

const TickerService = () => {
  const tickersRepo = createTickersRepo()

  const getGraphData = since => {
    return tickersRepo.getTickers(since)
      .then(allChartTickers => {
        const datasets = []
        allChartTickers
        .filter(sampleTickers(allChartTickers))
        .forEach(ticker =>
          ticker.tickers.forEach(setGraphDataFromTick(datasets, ticker.created))
        )
        return datasets
      })
  }

  const getLatest = () => tickersRepo.getLatest()
  return {
    getLatest,
    getGraphData,
    LIMIT_RESULTS
  }
}

module.exports = TickerService
