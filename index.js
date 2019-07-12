const Entity = require('siren-parser');
const Action = require('siren-parser/dist/Action');
const Link = require('siren-parser/dist/Link');

class Client {
  /**
   * Setup the fluent siren client
   *
   * @param {function} requestFn requestFn performs an async http request with signature (uri, method, body)
   *  uri: required, string
   *  method: required, string
   *  body: optional, object
   *  returns response body and Content-Type header in format { body, contentType }
   */
  constructor(requestFn) {
    this._requestFn = requestFn;
  }

  async start(href) {
    this.follow(href, 'GET');
  }

  async perform(href, method, fieldValues) {
    const { body, contentType } = await this._requestFn(href, method, fieldValues);
    if (!_isSiren(contentType)) {
      return body;
    }

    const entity = new Entity(body);
    entity._client = this;
  }
}

module.exports = Client;

const SIREN_CONTENT_TYPE = 'application/vnd.siren+json';
function _isSiren(contentType) {
  return contentType.toLowerCase().includes(SIREN_CONTENT_TYPE);
}


Entity.prototype.follow = async function () {
  const self = this.getLinkByRel('self');
  return this._client.perform(self.href, 'GET');
};

Link.prototype.follow = async function () {
  return this._client.perform(this.href, 'GET');
}

/**
 * Perform this action with the given fieldValues
 *
 * @param {object} fieldValues field values { fieldName: value }
 */
Action.prototype.perform = async function (fieldValues) {
  return this._client.perform(this.href, this.method, fieldValues);
}
