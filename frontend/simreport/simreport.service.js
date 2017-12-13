/* global angular */

angular.module('tantalus.simreport')
  .service('simReportService', ['$http', function ($http) {
    const getIterationsReport = simulationId => $http
      .get(`/api/simreports/${simulationId}/iterations`)
      .then(response => response.data)
      .catch(err => {
        console.log(`error getting iterations report for ${simulationId}: [${err.status}] ${err.statusText}`)
      })

    return {
      getIterationsReport
    }
  }])
