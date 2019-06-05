const ScheduleRepo = require('./scheduleRepo')

const MetadataService = () => {
  const scheduleRepo = ScheduleRepo()
  const metadataStore = {
    ticker: { date: null, count: null },
    graphs: { date: null, count: null }
  }

  const setTickerCount = (tickerDate, tickerCount) => {
    metadataStore.ticker.date = tickerDate
    metadataStore.ticker.count = tickerCount
  }

  const setGraphsCount = (tickerDate, tickerCount) => {
    metadataStore.graphs.date = tickerDate
    metadataStore.graphs.count = tickerCount
  }

  const writeData = () => scheduleRepo.storeMetadata(metadataStore)

  return {
    setTickerCount,
    setGraphsCount,
    writeData
  }
}

module.exports = MetadataService
