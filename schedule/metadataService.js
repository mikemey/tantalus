const ScheduleRepo = require('./scheduleRepo')

const MetadataService = creationDate => {
  const scheduleRepo = ScheduleRepo()
  const metadataStore = {
    created: creationDate,
    ticker: { count: null },
    graphs: { count: null }
  }

  const setTickerCount = tickerCount => {
    metadataStore.ticker.count = tickerCount
  }

  const setGraphsCount = tickerCount => {
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
