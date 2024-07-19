const Entity = require('siren-parser');
const Action = require('siren-parser/dist/Action');
const Link = require('siren-parser/dist/Link');

/**
 * Fluent client for Siren Hyper Media APIs
 * The client supports following links and performing actions
 */
class Client {
  /**
   * performs an async HTTP request
   * returns object { body, contentType, response }
   *  body: response body
   *  contentType: Content-Type response header
   *  response: whole response
   *
   * @typedef {Object} Response
   * @property body response body
   * @property contentType Content-Type response header
   * @property response whole response
   *
   * @callback requestFn
   * @param {string} href (required) href of the resource
   * @param {string} method (required) HTTP request verb ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')
   * @param {Object} [fieldValues] (optional) field names and values for the request
   * @return {Response} body: response body, contentType: Content-Type response header, response: whole response
   */

  /**
   * Setup the fluent siren client
   *
   * @typedef {Object} Options
   * @property {string|string[]} [originWhitelist] (optional) Whitelist of allowed origins (e.g. 'https://example.com')
   *
   * @param {requestFn} requestFn (required) performs an async HTTP request
   * @param {Options} [options] (optional) configuration options for the client
   */
  constructor(requestFn, options = {}) {
    this._requestFn = requestFn;
    this._options = options;
  }

  /**
   * Starts a client by fetching the provided href
   * @param {string} href href of the resource
   * @returns {Promise<Entity>} a promise that resolves with a siren entity
   */
  async start(href) {
    return this.perform(href, 'GET');
  }

  /**
   * Performs a request
   * @param {string} href href of the resource
   * @param {string} method HTTP request verb ('GET', 'POST', 'PUT', 'PATCH', 'DELETE')
   * @param {Object} [fieldValues] field names and values for the request
   * @returns {Promise<Entity>} a promise that resolves with a siren entity
   */
  async perform(href, method, fieldValues) {
    _verifyOrigin(href, this._options.originWhitelist);
    return _perform(this, href, method, fieldValues);
  }

  /**
   * Attaches this client to an existing entity
   * @param {Entity} entity siren entity
   */
  attachClient(entity) {
    entity._client = this;
    for (const subEntity of entity.entities || []) {
      this.attachClient(subEntity);
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

async function _perform(client, href, method, fieldValues) {
  const { body, contentType, response } = await client._requestFn(href, method, fieldValues);
  if (!body || !contentType || !_isSiren(contentType)) {
    return body;
  }

  const entity = new Entity(body);
  client.attachClient(entity);

  if (response) {
    entity._response = response;
  }

  return entity;
}

function _verifyOrigin(href, originWhitelist) {
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
  return _perform(this._client, self.href, 'GET');
};

Entity.prototype.getResponse = function () {
  return this._response;
};

Link.prototype.follow = async function () {
  return _perform(this._client, this.href, 'GET');
};

/**
 * Perform this action with the given fieldValues
 *
 * @param {Object} fieldValues field values { fieldName: value }
 * @param {Object} options
 * @param {boolean} options.includeHiddenFields Whether or not to merge in the existing hidden fields.  true by default
 * to preserve existing behavior. When true, there is an issue because when the action sends the body as form-data, the
 * structured data object is flattened. The fieldValues passed in, however, are expected to be a structured object.
 * It is also just generally inconsistent how we represent form data using structured objects.
 */
Action.prototype.perform = async function (fieldValues, { includeHiddenFields = true } = {}) {
  let fieldValuesToSend = fieldValues;
  if (includeHiddenFields) {
    const hiddenFields = this.fields && this.fields.filter(field => field.type.toLowerCase() === 'hidden') || [];
    const hiddenValues = hiddenFields.reduce((values, field) => {
      values[field.name] = field.value;
      return values;
    }, {});
    fieldValuesToSend = { ...hiddenValues, ...fieldValues };
  }
  return _perform(this._client, this.href, this.method, fieldValuesToSend);
};
