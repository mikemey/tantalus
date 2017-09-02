const createTickersRepo = require('./tickersRepo')

const NOT_AVAIL = 'N/A'

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

const setGraphDataFromTick = (datasets, created, tick) => {
  if (tick.name === 'coindesk') {
    addChartPoint(datasets, created, tick.name, tick.ask, '')
    return
  }
  if (tick.bid) addChartPoint(datasets, created, tick.name, tick.bid, ' bid')
  if (tick.ask) addChartPoint(datasets, created, tick.name, tick.ask, ' ask')
}

const TickerService = () => {
  const tickersRepo = createTickersRepo()

  const getGraphData = since => tickersRepo.getTickers(since)
    .then(tickers => {
      const datasets = []
      tickers.forEach(ticker => ticker.tickers.forEach(tick => {
        setGraphDataFromTick(datasets, ticker.created.toJSON(), tick)
      }))
      return datasets
    })

  const getLatest = () => tickersRepo.getLatest()
  return {
    getLatest,
    getGraphData
  }
}

module.exports = TickerService
