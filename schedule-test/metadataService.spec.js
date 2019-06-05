const moment = require('moment')

const helpers = require('../utils-test/helpers')
const MetadataService = require('../schedule/metadataService')

describe('Metadata service', () => {
  const metaService = MetadataService()

  beforeEach(helpers.dropDatabase)
  after(helpers.closeMongodb)

  const now = moment.utc().toDate()
  const yesterday = moment.utc().subtract(1, 'd').toDate()

  const createMetadata = (date, tickerCount, graphsCount) => {
    metaService.setTickerCount(tickerCount)
    metaService.setGraphsCount(graphsCount)
    return metaService.writeData(date)
  }

  const assertStoredMetadata = (date, tickerCount, graphsCount) => docs => {
    docs.length.should.equal(1)
    const metadata = docs[0]
    metadata.created.getTime().should.equal(date.getTime())
    metadata.ticker.count.should.equal(tickerCount)
    metadata.graphs.count.should.equal(graphsCount)
  }

  it('stores ticker- and graph-metadata', () =>
    createMetadata(now, 3, 5)
      .then(() => helpers.getMetadata())
      .then(assertStoredMetadata(now, 3, 5))
  )

  it('overwrites ticker- and graph-metadata', () =>
    createMetadata(now, 3, 5)
      .then(() => createMetadata(yesterday, 1, 1))
      .then(() => helpers.getMetadata())
      .then(assertStoredMetadata(yesterday, 1, 1))
  )
})
