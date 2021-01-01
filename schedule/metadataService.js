const ScheduleRepo = require('./scheduleRepo')

const MetadataService = () => {
  const scheduleRepo = ScheduleRepo()
  const metadataStore = {
    created: null,
    ticker: { count: null },
    graphs: { count: null }
  }

  const reset = () => {
    metadataStore.created = null
    metadataStore.ticker.count = null
    metadataStore.graphs.count = null
  }

  const setTickerCount = tickerCount => {
    metadataStore.ticker.count = tickerCount
  }

  const setGraphsCount = tickerCount => {
    metadataStore.graphs.count = tickerCount
  }

  const writeData = creationDate => {
    metadataStore.created = creationDate
    return scheduleRepo.storeMetadata(metadataStore)
  }

  return {
    setTickerCount,
    setGraphsCount,
    writeData,
    reset
  }
}

module.exports = MetadataService
