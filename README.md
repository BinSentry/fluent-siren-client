# fluent-siren-client
Fluent client for Siren Hyper Media APIs

Fetches a [Siren](https://github.com/kevinswiber/siren) object using the provided href and request function, and parses 
it into a [node-siren-parser](https://github.com/Brightspace/node-siren-parser) Entity. 
Configures the Entity in such a way that uri links can be followed, and actions can be performed. Result of 
following a link is another fluent Entity.

## Installation

Install from NPM:
```shell
npm install fluent-siren-client
```

## Usage

```javascript
const client = new SirenClient(requestFn); // async requestFn(uri, method, fieldValues)
const entity = await client.start('http://api.example.com');
const linkedEntity = await entity.getLinkByRel('external').follow();
const subEntity = await entity.getSubEntity('item').follow();
const actionResult = await entity.getActionByName('action').perform();
```

## Setup

Sample `requestFn` using `request-promise` library

```javascript
const rp = require('request-promise');

async function requestFn(uri, method, fieldValues) {
  const params = {
    defaults: {
      headers: { Authorization: `Bearer ${authorizationToken}` }, // inject authorization token
      json: true,
      resolveWithFullResponse: true,
    },
    event: true,
  };

  const options = { uri, method };

  if (method.toUpperCase() === 'GET') {
    options.qs = fieldValues;
  } else {
    options.body = fieldValues;
  }

  const request = rp(params);
  const response = await request(options);
  return { body: response.body, contentType: response.headers['content-type'] };
}
```
