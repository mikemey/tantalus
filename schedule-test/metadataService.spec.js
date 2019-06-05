const helpers = require('../utils-test/helpers')
const MetadataService = require('../schedule/metadataService')

describe('Metadata service', () => {
  const creationDate = new Date()
  const metaService = MetadataService(creationDate)

  beforeEach(helpers.dropDatabase)
  after(helpers.closeMongodb)

  const createMetadata = (tickerCount, graphsCount) => {
    metaService.setTickerCount(tickerCount)
    metaService.setGraphsCount(graphsCount)
    return metaService.writeData()
  }

  const assertStoredMetadata = (tickerCount, graphsCount) => docs => {
    docs.length.should.equal(1)
    const metadata = docs[0]
    metadata.created.getTime().should.equal(creationDate.getTime())
    metadata.ticker.count.should.equal(tickerCount)
    metadata.graphs.count.should.equal(graphsCount)
  }

  it('stores ticker- and graph-metadata', () =>
    createMetadata(3, 5)
      .then(() => helpers.getMetadata())
      .then(assertStoredMetadata(3, 5))
  )

  it('overwrites ticker- and graph-metadata', () =>
    createMetadata(3, 5)
      .then(() => createMetadata(1, 1))
      .then(() => helpers.getMetadata())
      .then(assertStoredMetadata(1, 1))
  )
})
