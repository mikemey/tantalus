module.exports = config => {
  config.set({
    basePath: './frontend',
    browsers: ['Chrome'],

    files: [
      'bower_components/angular/angular.js',
      'bower_components/angular-cookies/angular-cookies.js',
      'bower_components/angular-mocks/angular-mocks.js',
      'bower_components/angular-route/angular-route.js',
      'bower_components/jquery/dist/jquery.js',
      'bower_components/chart.js/dist/Chart.js',
      'bower_components/angular-chart.js/dist/angular-chart.js',
      'bower_components/moment/moment.js',
      'bower_components/three.js/three.js',
      '**/*.html',
      '**/*.module.js',
      '!(bower_components)/**/*!(.module|.spec).js'
    ],

    singleRun: true,
    frameworks: ['mocha', 'chai'],

    plugins: [
      'karma-chrome-launcher',
      'karma-chai',
      'karma-mocha',
      'karma-ng-html2js-preprocessor'
    ],

    preprocessors: {
      '**/*.html': ['ng-html2js']
    },

    ngHtml2JsPreprocessor: {
      stripPrefix: 'frontend/',
      moduleName: 'testTemplates'
    }

  })
}
