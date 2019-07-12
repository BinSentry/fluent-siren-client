const Entity = require('siren-parser');
const Action = require('siren-parser/dist/Action');
const Link = require('siren-parser/dist/Link');

class Client {
  /**
   * performs an async HTTP request
   * returns object { body, contentType }
   *  body: response body
   *  contentType: Content-Type response header
   *
   * @callback request
   * @param {string} uri (required) uri of the resource
   * @param {string} method (required) HTTP request verb ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')
   * @param {object} fieldValues (optional) field names and values for the request
   * @return {object} body: response body, contentType: Content-Type response header
   */

  /**
   * Setup the fluent siren client
   *
   * @param {request} requestFn performs an async HTTP request
   */
  constructor(requestFn) {
    this._requestFn = requestFn;
  }

  async start(href) {
    this.perform(href, 'GET');
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
