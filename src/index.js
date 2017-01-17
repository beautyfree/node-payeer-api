import _      from 'lodash';
import debug  from 'debug';
import util   from 'util';
import https  from 'https';

const logger = debug('payeer');

export default class Payeer {

  constructor() {
    this.hostname = 'payeer.com';
    this.path     = '/ajax/api/api.php';
    this.agent    = 'Mozilla/5.0 (Windows NT 6.1; rv:12.0) Gecko/20100101 Firefox/12.0';

    this.auth     = {};

    this._output  = null;
    this.errors   = null;
    this.language = 'ru';
  }

  static create(account, apiId, apiPass, callback) {

    const payeer = new Payeer();

    const arr = {
      account,
      apiId,
      apiPass
    };

    payeer.getResponse(arr, (error, response) => {

      if (!_.isEmpty(response.errors)) {
        payeer.errors = response.errors;
      } else if (response.auth_error == '0') {
        payeer.auth = arr;
      } else {
        error = new Error('Authentication failed');
      }

      callback(error, payeer);
    });
  }

  isAuth() {
    return !_.isEmpty(this.auth);
  }

  getResponse(arPost, callback) {

    if (this.isAuth()) {
      _.extend(arPost, this.auth);
    }

    const data = [];

    _.keys(arPost).forEach(key => {
      const urlParam = `${encodeURIComponent(key)}=${encodeURIComponent(arPost[key])}`;
      data.push(urlParam);
    });

    data.push(`language=${this.language}`);

    const dataStr = data.join('&');

    const options = {
      hostname: this.hostname,
      path: this.path,
      method: 'POST',
      headers: {
        'User-Agent': this.agent,
        'Content-Length': dataStr.length,
        'Accept': '*/*',
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    };

    const request = https.request(options, response => {

      logger(`response status: ${response.statusCode}`);
      logger(`response headers:\n${util.inspect(response.headers)}`);

      response.setEncoding('utf8');

      let responseData = '';

      response.on('data', chunk => {
        responseData += chunk;
      });

      response.on('end', () => {
        logger(`response data:\n${responseData}`);

        const parsedResponse = JSON.parse(responseData || '{}');
        let error          = null;

        if (!_.isEmpty(parsedResponse.errors)) {
          error = new Error(util.inspect(parsedResponse.errors));
        }

        callback(error, parsedResponse);
      });
    });

    request.write(dataStr);
    request.end();
  }

  getPaySystems(callback) {
    this.getResponse({ action: 'getPaySystems' }, (error, response) => {
      callback(error, response);
    });
  }

  initOutput(arr, callback) {
    const payeer  = this;
    const arrPost = _.clone(arr);

    arrPost.action = 'initOutput';

    this.getResponse(arrPost, (error, response) => {
      if (_.isEmpty(response.errors)) {
        payeer._output = arr;
        callback(error, true);
      } else {
        payeer.errors = response.errors;
        callback(error, false);
      }
    });
  }

  output(callback) {
    const payeer  = this;
    const arrPost = this._output;

    arrPost.action = 'output';

    this.getResponse(arrPost, (error, response) => {
      if (_.isEmpty(response.errors)) {
        callback(error, response.historyId);
      } else {
        payeer.errors = response.errors;
        callback(error, false);
      }
    });
  }

  getHistoryInfo(historyId, callback) {
    this.getResponse({ action: 'historyInfo', historyId },
                     (error, response) => {
      callback(error, response);
    });
  }

  getBalance(callback) {
    this.getResponse({ action: 'balance' }, (error, response) => {
      callback(error, response);
    });
  }

  getErrors() {
    return this.errors;
  }

  transfer(arPost, callback) {
    arPost.action = 'transfer';
    this.getResponse(arPost, (error, response) => {
      callback(error, response);
    });
  }

  setLang(language) {
    this.language = language;
    return this;
  }

  getShopOrderInfo(arPost, callback) {
    arPost.action = 'shopOrderInfo';
    this.getResponse(arPost, (error, response) => {
      callback(error, response);
    });
  }

  checkUser(arPost, callback) {

    const payeer = this;

    arPost.action = 'checkUser';

    this.getResponse(arPost, (error, response) => {
      if (_.isEmpty(response.errors)) {
        callback(error, true);
      } else {
        payeer.errors = response.errors;
        callback(error, false);
      }
    });
  }
};