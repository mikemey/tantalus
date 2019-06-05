const moment = require('moment')

const helpers = require('../utils-test/helpers')
const MetadataService = require('../schedule/metadataService')

describe('Metadata service', () => {
  const metaService = MetadataService()

  beforeEach(helpers.dropDatabase)
  after(helpers.closeMongodb)

  const now = moment.utc().toDate()
  const yesterday = moment.utc().subtract(1, 'd').toDate()

  const createMetadata = (tickerDate, tickerCount, graphsDate, graphsCount) => {
    metaService.setTickerCount(tickerDate, tickerCount)
    metaService.setGraphsCount(graphsDate, graphsCount)
    return metaService.writeData()
  }

  const assertStoredMetadata = (tickerDate, tickerCount, graphsDate, graphsCount) => docs => {
    docs.length.should.equal(1)
    const metadata = docs[0]
    metadata.ticker.date.getTime().should.equal(tickerDate.getTime())
    metadata.ticker.count.should.equal(tickerCount)
    metadata.graphs.date.getTime().should.equal(graphsDate.getTime())
    metadata.graphs.count.should.equal(graphsCount)
  }

  it('stores ticker- and graph-metadata', () =>
    createMetadata(now, 3, yesterday, 5)
      .then(() => helpers.getMetadata())
      .then(assertStoredMetadata(now, 3, yesterday, 5))
  )

  it('overwrites ticker- and graph-metadata', () =>
    createMetadata(now, 3, yesterday, 5)
      .then(() => createMetadata(yesterday, 1, now, 1))
      .then(() => helpers.getMetadata())
      .then(assertStoredMetadata(yesterday, 1, now, 1))
  )
})
