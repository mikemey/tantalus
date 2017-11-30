const expect = require('chai').expect
const {
  dropDatabase,
  copyWithoutIDField,
  getSimulationReports,
  getTraderReports
} = require('../utils-test/helpers')

const SimReporter = require('../simulation/simReporter')

describe('Sim Reporting', () => {
  const simulationId = 'full simulation run ID'
  const simConfig = {
    batchSeconds: 3600,
    partitionWorkerCount: 4,
    startInvestment: 100000,
    rankingLimit: 3
  }

  const expectedSimrunReport = {
    simulationId,
    iteration: 232,
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

  const allAccounts = [
    { clientId: 'A', amount: 12345, volume: 30000, fullVolume: 110110 },
    { clientId: 'B', amount: 6789, volume: 40000, fullVolume: 107300 }
  ]

  const simStartHrtime = [expectedSimrunReport.startDate, 0]
  const simEndHrtime = [expectedSimrunReport.endDate, 0]

  const mockTxSource = MockTransactionsSource()

  const storeResults = (accounts = allAccounts) => {
    return SimReporter(console, simConfig).storeSimulationResults(
      simulationId, simStartHrtime, simEndHrtime,
      mockTxSource, accounts,
      expectedSimrunReport.traderCount, expectedSimrunReport.iteration)
  }

  describe('input checks', () => {
    const expectError = (name, failingConfig) => {
      expect(() => SimReporter(console, failingConfig))
        .to.throw(Error, `${name} not configured!`)
    }

    it('throws error when no batchSeconds configured', () => {
      return expectError('batchSeconds', {
        partitionWorkerCount: 4,
        startInvestment: 100000,
        rankingLimit: 3
      })
    })

    it('throws error when no partitionWorkerCount configured', () => {
      return expectError('partitionWorkerCount', {
        batchSeconds: 3600,
        startInvestment: 100000,
        rankingLimit: 3
      })
    })

    it('throws error when no startInvestment configured', () => {
      return expectError('startInvestment', {
        batchSeconds: 3600,
        partitionWorkerCount: 4,
        simulationReportId: 'failing config',
        rankingLimit: 3
      })
    })

    it('throws error when no rankingLimit configured', () => {
      return expectError('rankingLimit', {
        batchSeconds: 3600,
        partitionWorkerCount: 4,
        startInvestment: 100000
      })
    })
  })

  describe('simulation report', () => {
    beforeEach(dropDatabase)

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

    const expectedRunA = clientId => {
      return {
        clientId,
        simulationId,
        iteration: expectedSimrunReport.iteration,
        amount: allAccounts[0].amount,
        volume: allAccounts[0].volume,
        fullVolume: allAccounts[0].fullVolume,
        investDiff: 2800,
        absoluteDiff: 10110
      }
    }

    const expectedFirstRunB = clientId => {
      return {
        clientId,
        simulationId,
        iteration: expectedSimrunReport.iteration,
        amount: allAccounts[1].amount,
        volume: allAccounts[1].volume,
        fullVolume: allAccounts[1].fullVolume,
        investDiff: -10,
        absoluteDiff: 7300
      }
    }

    const expectReport = (storedReport, expectedReport) => {
      copyWithoutIDField(storedReport).should.deep.equal(expectedReport)
    }

    it('stores new report', () => {
      return storeResults()
        .then(getTraderReports)
        .then(traderReports => {
          traderReports.should.have.length(2)

          expectReport(traderReports[0], expectedRunA('A'))
          expectReport(traderReports[1], expectedFirstRunB('B'))
        })
    })

    it('should update existing trader report', () => {
      const secondAllAccounts = [
        { clientId: 'B', amount: 12345, volume: 30000, fullVolume: 122340 }
      ]

      return storeResults()
        .then(() => storeResults(secondAllAccounts))
        .then(getTraderReports)
        .then(traderReports => {
          traderReports.should.have.length(3)

          const expectedSecondRunB = {
            clientId: 'B',
            simulationId,
            iteration: expectedSimrunReport.iteration,
            amount: secondAllAccounts[0].amount,
            volume: secondAllAccounts[0].volume,
            fullVolume: secondAllAccounts[0].fullVolume,
            investDiff: 15030,
            absoluteDiff: 22340
          }

          expectReport(traderReports[0], expectedRunA('A'))
          expectReport(traderReports[1], expectedFirstRunB('B'))
          expectReport(traderReports[2], expectedSecondRunB)
        })
    })
  })
})
