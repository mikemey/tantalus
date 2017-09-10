/* global angular */

angular
  .module('tantalus.account')
  .component('accountDetails', {
    templateUrl: 'account/account-details.html',
    bindings: {
      account: '<'
    }
  })
