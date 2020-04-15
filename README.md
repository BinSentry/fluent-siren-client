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
const client = new SirenClient(requestFn);
const entity = await client.start('http://api.example.com');
const linkedEntity = await entity.getLinkByRel('external').follow();
const subEntity = await entity.getSubEntity('item').follow();
const actionResult = await entity.getActionByName('action').perform();
```
