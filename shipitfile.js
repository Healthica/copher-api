var env = require('node-env-file');
env('./config/config.env');

module.exports = function (shipit) {
  shipit.initConfig({
    default: {
      key: process.env.SSH_KEY_PATH
    },
    production: {
      servers: process.env.PROD_USER + '@' + process.env.PROD_HOST
    }
  });

  shipit.task('status', function () {
    return shipit.remote('service veeta-api status');
  });

  shipit.task('deploy', function () {
    return shipit.remote('cd ' + process.env.PROD_PATH + ' && git checkout . && git clean -f -d && git pull && yarn install --ignore-engines && chmod +x ./server/veeta-api.js && sudo systemctl restart veeta-api').then(function(res){
      shipit.start('status');
    });
  });
};
