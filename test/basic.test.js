/* eslint-disable new-cap */
require('dotenv').config();

const tap = require('tap');
const DotFit = require('../');

tap.test('Sets url based on env', (assert) => {
  assert.plan(4);

  const libDefault = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  });

  assert.equal(libDefault.url, 'https://devtest.dotfit.com/webservices/OrdersService.asmx?WSDL', 'Defaults to devtest');

  const libDev = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'dev');

  assert.equal(libDev.url, 'https://devtest.dotfit.com/webservices/OrdersService.asmx?WSDL', 'Passing dev sets to dev url');

  const libProd = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'prod');

  assert.equal(libProd.url, 'https://www.dotfit.com/webservices/OrdersService.asmx?WSDL', 'Passing prod sets to prod url');

  try {
    new DotFit({
      clubId: process.env.CLUB_ID,
      clubPassword: process.env.CLUB_PASSWORD,
      wholesaleId: process.env.WHOLESALE_ID
    }, 'wrongenv');
  } catch (e) {
    assert.equal(e.message, 'Unsupported environment. Use dev or prod', 'Fails on unsupported environment');
  }

  assert.end();
});

tap.test('Requires credentials', (assert) => {
  assert.plan(4);

  try {
    new DotFit({}, 'dev');
  } catch (e) {
    assert.equal(e.message, '"clubId" is required', 'Ensures clubId set');
  }

  try {
    new DotFit({
      clubId: process.env.CLUB_ID
    }, 'dev');
  } catch (e) {
    assert.equal(e.message, '"clubPassword" is required', 'Ensures clubPassword set');
  }

  try {
    new DotFit({
      clubId: process.env.CLUB_ID,
      clubPassword: process.env.CLUB_PASSWORD
    }, 'dev');
  } catch (e) {
    assert.equal(e.message, '"wholesaleId" is required', 'Ensures wholesaleId set');
  }

  try {
    new DotFit({
      clubId: process.env.CLUB_ID,
      clubPassword: process.env.CLUB_PASSWORD,
      wholesaleId: process.env.WHOLESALE_ID
    }, 'dev');

    assert.ok('All credentials pass');
  } catch (e) {
    assert.error(e, 'Something went wrong');
  }

  assert.end();
});

tap.test('Sets up connection, gets WSDL', async (assert) => {
  const lib = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'dev');

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
  // eslint-disable-next-line no-console
  const oldLog = console.log;

  let lib = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'dev', false);

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

  lib = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'dev', true);

  lib.log(['test1'], 'message');

  assert.deepEqual(tags, ['test1'], 'Tags set, logging enabled');
  assert.equal(msg, 'message', 'Message set, logging enabled');

  // eslint-disable-next-line no-console
  console.log = oldLog;

  assert.end();
});
