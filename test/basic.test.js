/* eslint-disable new-cap */
require('dotenv').config();

const tap = require('tap');
const lib = require('../');

tap.test('Allows url to be set', (assert) => {
  assert.equal(lib.url, 'https://devtest.dotfit.com/webservices/OrdersService.asmx?WSDL', 'Defaults to devtest');

  lib.url = 'https://localhost/webservices/OrdersService.asmx?WSDL';
  assert.equal(lib.url, 'https://localhost/webservices/OrdersService.asmx?WSDL', 'Can set url');

  lib.url = 'https://devtest.dotfit.com/webservices/OrdersService.asmx?WSDL';
  assert.equal(lib.url, 'https://devtest.dotfit.com/webservices/OrdersService.asmx?WSDL', 'Set back to devtest');

  assert.end();
});

tap.test('Requires credentials', async (assert) => {
  const clubId = process.env.CLUB_ID;
  const clubPw = process.env.CLUB_PASSWORD;
  const wholesaleId = process.env.WHOLESALE_ID;

  delete process.env.CLUB_ID;
  delete process.env.CLUB_PASSWORD;
  delete process.env.WHOLESALE_ID;

  await assert.rejects(lib.createClient.bind(lib), new Error('CLUB_ID not set.'), 'Ensures CLUB_ID set');

  process.env.CLUB_ID = clubId;

  await assert.rejects(lib.createClient.bind(lib), new Error('CLUB_PASSWORD not set.'), 'Ensures CLUB_PASSWORD set');

  process.env.CLUB_PASSWORD = clubPw;

  await assert.rejects(lib.createClient.bind(lib), new Error('WHOLESALE_ID not set.'), 'Ensures WHOLESALE_ID set');

  process.env.WHOLESALE_ID = wholesaleId;

  await assert.resolves(lib.createClient.bind(lib), 'All required ENV vars present');

  assert.end();
});

tap.test('Sets up connection, gets WSDL', async (assert) => {
  const desc = await lib.describe();

  assert.ok(desc.hasOwnProperty('OrdersService'), 'Has the OrdersService service');
  assert.ok(desc.OrdersService.hasOwnProperty('OrdersServiceSoap12'), 'Has the OrdersServiceSoap12 port');
  assert.deepEqual(Object.keys(desc.OrdersService.OrdersServiceSoap12), [
    'PlaceWholesaleOrder',
    'GetShipmentInfoByDate',
    'GetShipmentInfoByID',
    'GetInventory'
  ], 'Has expected functions');

  assert.end();
});

tap.test('Logging works', (assert) => {
  const isDebug = process.env.DEBUG;
  const oldLog = console.log;
  delete process.env.DEBUG;

  let tags;
  let msg;

  // eslint-disable-next-line no-console
  console.log = function(t, m) {
    tags = t;
    msg = m;
  };

  lib.log(['test1'], 'message');

  assert.notOk(tags, 'Tags not set, logging disabled');
  assert.notOk(msg, 'Message not set, logging disabled');

  process.env.DEBUG = 1;

  lib.log(['test1'], 'message');

  assert.deepEqual(tags, ['test1'], 'Tags set, logging enabled');
  assert.equal(msg, 'message', 'Message set, logging enabled');

  process.env.DEBUG = isDebug;

  // eslint-disable-next-line no-console
  console.log = oldLog;

  assert.end();
});
