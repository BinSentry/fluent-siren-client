const Entity = require('siren-parser');
const Action = require('siren-parser/dist/Action');
const Link = require('siren-parser/dist/Link');

/**
 * siren-parser wrapper that supports following links and performing actions
 */
class Client {
  /**
   * performs an async HTTP request
   * returns object { body, contentType }
   *  body: response body
   *  contentType: Content-Type response header
   *
   * @typedef response
   * @property body response body
   * @property contentType Content-Type response header
   *
   * @callback requestFn
   * @param {string} href (required) href of the resource
   * @param {string} method (required) HTTP request verb ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')
   * @param {object} [fieldValues] (optional) field names and values for the request
   * @return {response} body: response body, contentType: Content-Type response header
   */

  /**
   * Setup the fluent siren client
   *
   * @typedef options
   * @type {object}
   * @property {String|String[]} [originWhitelist] (optional) Whitelist of allowed origins (e.g. 'https://example.com')
   *
   * @param {requestFn} requestFn (required) performs an async HTTP request
   * @param {options} [options] (optional) configuration options for the client
   */
  constructor(requestFn, options = {}) {
    this._requestFn = requestFn;
    this._options = options;
  }

  /**
   * Starts a client by fetching the provided href
   * @param href
   * @returns {Promise<Entity>}
   */
  async start(href) {
    return this.perform(href, 'GET');
  }

  /**
   * Performs a request
   * @param href
   * @param method
   * @param [fieldValues]
   * @returns {Promise<Entity>}
   */
  async perform(href, method, fieldValues) {
    verifyOrigin(href, this._options.originWhitelist);
    return this._perform(href, method, fieldValues);
  }

  async _perform(href, method, fieldValues) {
    const { body, contentType } = await this._requestFn(href, method, fieldValues);
    if (!body || !contentType || !_isSiren(contentType)) {
      return body;
    }

    const entity = new Entity(body);
    this.attachClient(entity);

    return entity;
  }

  attachClient(entity) {
    entity._client = this;
    for (const subEntity of entity.entities || []) {
      subEntity._client = this;
    }
    for (const link of entity.links || []) {
      link._client = this;
    }
    for (const action of entity.actions || []) {
      action._client = this;
    }
  }
}

module.exports = Client;

function verifyOrigin(href, originWhitelist) {
  if (!originWhitelist) {
    return;
  }
  const origin = new URL(href).origin;
  if (origin === originWhitelist) {
    return;
  }
  if (Array.isArray(originWhitelist) && originWhitelist.indexOf(origin) >= 0) {
    return;
  }
  throw new Error(`Not allowed origin: ${origin}`);
}

const SIREN_CONTENT_TYPE = 'application/vnd.siren+json';

function _isSiren(contentType) {
  return contentType.toLowerCase().includes(SIREN_CONTENT_TYPE);
}


Entity.prototype.follow = async function () {
  const self = this.getLinkByRel('self');
  return this._client._perform(self.href, 'GET');
};

Link.prototype.follow = async function () {
  return this._client._perform(this.href, 'GET');
};

/**
 * Perform this action with the given fieldValues
 *
 * @param {object} fieldValues field values { fieldName: value }
 */
Action.prototype.perform = async function (fieldValues) {
  const hiddenFields = this.fields && this.fields.filter(field => field.type.toLowerCase() === 'hidden') || [];
  const hiddenValues = hiddenFields.reduce((values, field) => {
    values[field.name] = field.value;
    return values;
  }, {});
  return this._client._perform(this.href, this.method, { ...hiddenValues, ...fieldValues });
};
