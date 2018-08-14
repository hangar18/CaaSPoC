'use strict';

/**
 * This is the Form.io application server.
 */
const express = require('express');
const nunjucks = require('nunjucks');
const fs = require('fs-extra');
const util = require('./src/lib/util/util');
require('colors');
const Q = require('q');
const test = process.env.TEST_SUITE;

module.exports = function(options) {
  options = options || {};
  const q = Q.defer();

  // Use the express application.
  const app = options.app || express();

  // Use the given config.
  const config = options.config || require('config');

  // Configure nunjucks.
  nunjucks.configure('client', {
    autoescape: true,
    express: app
  });

  // Mount the client application.
  app.use('/', express.static(`${__dirname}/client/dist`));

  // Load the form.io server.
  const server = options.server || require('./index')(config);
  const hooks = options.hooks || {};

  app.use(server.formio.middleware.restrictRequestTypes);
  server.init(hooks).then(function(formio) {
    // Called when we are ready to start the server.
    const start = function() {
      // Start the application.
      if (fs.existsSync('app')) {
        const application = express();
        application.use('/', express.static(`${__dirname}/app/dist`));
        config.appPort = config.appPort || 8080;
        application.listen(config.appPort);
        const appHost = `http://localhost:${config.appPort}`;
        util.log(` > Serving application at ${appHost.green}`);
      }

      // Mount the Form.io API platform.
      app.use(options.mount || '/', server);

      // Allow tests access server internals.
      app.formio = formio;

      // Listen on the configured port.
      return q.resolve({
        server: app,
        config: config
      });
    };

      // Start the server.
      start();
    });

  return q.promise;
};
