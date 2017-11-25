const expect = require('chai').expect
const { dropDatabase, copyWithoutIDField, getSimulationReports, getTraderReports } = require('../helpers')

const SimReporter = require('../../backend/simrun/simReporter')

describe('Sim Reporting', () => {
  const simConfig = {
    batchSeconds: 3600,
    partitionWorkerCount: 4,
    version: 'simulation/trader version ID',
    startInvestment: 100000
  }

  const expectedSimrunReport = {
    version: simConfig.version,
    startDate: 1010101,
    endDate: 1020101,
    workerCount: simConfig.partitionWorkerCount,
    traderCount: 720,
    staticInvestment: 107310,
    startInvestment: simConfig.startInvestment,
    transactions: {
      count: 45093,
      startDate: 23131,
      startPrice: 123123,
      endDate: 42323,
      endPrice: 132123
    },
    batches: {
      count: 56,
      duration: simConfig.batchSeconds
    }
  }

  const MockTransactionsSource = () => {
    return {
      getStartDate: () => expectedSimrunReport.transactions.startDate,
      getStartPrice: () => expectedSimrunReport.transactions.startPrice,
      getEndDate: () => expectedSimrunReport.transactions.endDate,
      getEndPrice: () => expectedSimrunReport.transactions.endPrice,
      transactionCount: () => expectedSimrunReport.transactions.count,
      batchCount: () => expectedSimrunReport.batches.count
    }
  }

  const partitionerAccountResponse = [
    { clientId: 'A', amount: 12345, volume: 30000, fullVolume: 110110 },
    { clientId: 'B', amount: 6789, volume: 40000, fullVolume: 107300 }
  ]

  const MockPartitionExecutor = () => {
    let accounts
    return {
      getAllAccounts: () => Promise.resolve(accounts),
      setAllAccountsResponse: acc => { accounts = acc }
    }
  }

  const simStartHrtime = [expectedSimrunReport.startDate, 0]
  const simEndHrtime = [expectedSimrunReport.endDate, 0]

  const mockTxSource = MockTransactionsSource()
  const mockPartitionExecutor = MockPartitionExecutor()

  const storeResults = (config = simConfig) => {
    return SimReporter(config)
      .storeSimulationResults(simStartHrtime, simEndHrtime,
      mockTxSource, mockPartitionExecutor, expectedSimrunReport.traderCount)
  }

  describe('input checks', () => {
    const expectError = (name, failingConfig) => {
      expect(() => SimReporter(failingConfig))
        .to.throw(Error, `${name} not configured!`)
    }

    it('throws error when no batchSeconds configured', () => {
      return expectError('batchSeconds', {
        partitionWorkerCount: 4,
        version: 'failing config',
        startInvestment: 100000
      })
    })

    it('throws error when no partitionWorkerCount configured', () => {
      return expectError('partitionWorkerCount', {
        batchSeconds: 3600,
        version: 'failing config',
        startInvestment: 100000
      })
    })

    it('throws error when no version configured', () => {
      return expectError('version', {
        batchSeconds: 3600,
        partitionWorkerCount: 4,
        startInvestment: 100000
      })
    })

    it('throws error when no startInvestment configured', () => {
      return expectError('startInvestment', {
        batchSeconds: 3600,
        partitionWorkerCount: 4,
        version: 'failing config'
      })
    })
  })

  describe('simulation report', () => {
    beforeEach(() => {
      mockPartitionExecutor.setAllAccountsResponse(partitionerAccountResponse)
      return dropDatabase()
    })

    it('stores report', () => {
      return storeResults()
        .then(getSimulationReports)
        .then(simulations => {
          simulations.should.have.length(1)
          copyWithoutIDField(simulations[0]).should.deep.equal(expectedSimrunReport)
        })
    })

    it('stores similar report in new record', () => {
      return storeResults()
        .then(() => storeResults())
        .then(getSimulationReports)
        .then(simulations => {
          simulations.should.have.length(2)
        })
    })
  })

  describe('trader reports', () => {
    beforeEach(dropDatabase)

    const expectedRunA = simulationId => {
      return {
        simrunid: simulationId,
        startDate: expectedSimrunReport.startDate,
        version: simConfig.version,
        amount: partitionerAccountResponse[0].amount,
        volume: partitionerAccountResponse[0].volume,
        fullVolume: partitionerAccountResponse[0].fullVolume,
        investDiff: 2800,
        absoluteDiff: 10110
      }
    }

    const expectedFirstRunB = simulationId => {
      return {
        simrunid: simulationId,
        startDate: expectedSimrunReport.startDate,
        version: simConfig.version,
        amount: partitionerAccountResponse[1].amount,
        volume: partitionerAccountResponse[1].volume,
        fullVolume: partitionerAccountResponse[1].fullVolume,
        investDiff: -10,
        absoluteDiff: 7300
      }
    }

    const expectReport = (storedReport, clientId, expectedRun) => {
      const report = copyWithoutIDField(storedReport)
      report.clientId.should.equal(clientId)
      report.runs.should.deep.equal(expectedRun)
    }

    it('stores new report', () => {
      mockPartitionExecutor.setAllAccountsResponse(partitionerAccountResponse)
      let simulationId
      return storeResults()
        .then(storedSimulation => { simulationId = storedSimulation._id })
        .then(getTraderReports)
        .then(traderReports => {
          traderReports.should.have.length(2)

          expectReport(traderReports[0], 'A', [expectedRunA(simulationId)])
          expectReport(traderReports[1], 'B', [expectedFirstRunB(simulationId)])
        })
    })

    it('should update existing trader report', () => {
      const secondAccountResponse = [
        { clientId: 'B', amount: 12345, volume: 30000, fullVolume: 122340 }
      ]

      mockPartitionExecutor.setAllAccountsResponse(partitionerAccountResponse)
      let firstSimulationId, secondSimulationId
      return storeResults()
        .then(storedSimulation => { firstSimulationId = storedSimulation._id })
        .then(() => {
          mockPartitionExecutor.setAllAccountsResponse(secondAccountResponse)
          return storeResults()
        })
        .then(storedSimulation => { secondSimulationId = storedSimulation._id })
        .then(getTraderReports)
        .then(traderReports => {
          traderReports.should.have.length(2)
          traderReports[0].runs.should.have.length(1)

          const expectedSecondRunB = {
            simrunid: secondSimulationId,
            startDate: expectedSimrunReport.startDate,
            version: simConfig.version,
            amount: secondAccountResponse[0].amount,
            volume: secondAccountResponse[0].volume,
            fullVolume: secondAccountResponse[0].fullVolume,
            investDiff: 15030,
            absoluteDiff: 22340
          }

          expectReport(traderReports[1], 'B', [
            expectedFirstRunB(firstSimulationId),
            expectedSecondRunB
          ])
        })
    })
  })
})
