/* eslint-disable new-cap */
require('dotenv').config();

const tap = require('tap');
const moment = require('moment');
const DotFit = require('../');

const fakeAddress = {
  FirstName: 'Diane',
  LastName: 'Lowe',
  Address1: '4155 College Street',
  Address2: 'Apt 123',
  Zipcode: '30342',
  City: 'Atlanta',
  State: 'GA',
  Country: 'USA',
  Phone: '555-555-5555',
  Email: 'dianelowe@example.com'
};
let inventory;

const createOrder = async function(lib, address = fakeAddress) {
  if (!inventory) {
    inventory = await lib.inventory();
  }

  return lib.createOrder({
    shippingInfo: address,
    shippingMethod: 'UPSGround',
    orderLines: [{
      OrderLine: {
        ItemNumber: inventory[0].PartNumber,
        Quantity: 1
      }
    }],
    orderComments: 'TEST ORDER',
    purchaseOrderNum: `TEST-${Date.now()}`
  });
};

tap.test('Creates an order', async (assert) => {
  const lib = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'dev');

  const order = await createOrder(lib);

  assert.type(order, 'number', 'Order number comes back');

  assert.end();
});

tap.test('Handles faulty data', async (assert) => {
  const lib = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'dev');

  await assert.rejects(createOrder(lib, {
    firstname: 'lowercase first name'
  }), 'Validation fails');

  assert.end();
});

tap.test('Gets Shipments by date', async (assert) => {
  const lib = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'dev');

  const order = await createOrder(lib);

  assert.type(order, 'number', 'Order number comes back');

  const start = moment().subtract(30, 'days').toDate();
  const end = moment().toDate();

  const shipments = await lib.shipmentsByDate(start, end);

  assert.ok(Array.isArray(shipments), 'Shipments comes back as an array');
  assert.ok(shipments.length, 'Shipments has items');

  assert.deepEqual(Object.keys(shipments[0]), [
    'OrderID',
    'PurchaseOrderNum',
    'DatePlaced',
    'DateShipped',
    'TrackingNumbers',
    'TrackingUrls'
  ], 'Shipments keys returned');

  assert.end();
});

tap.test('Handles when no shipments returned by date', async (assert) => {
  const lib = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'dev');

  const start = moment().add(30, 'days').toDate();
  const end = moment().add(1, 'day').toDate();

  const shipments = await lib.shipmentsByDate(start, end);

  assert.ok(Array.isArray(shipments), 'Shipments comes back as an array');
  assert.equal(shipments.length, 0, 'Shipments has no items');

  assert.end();
});

tap.test('Gets Shipments by id', async (assert) => {
  const lib = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'dev');

  const order = await createOrder(lib);

  assert.type(order, 'number', 'Order number comes back');

  const shipment = await lib.shipmentsById(order);

  assert.ok(Array.isArray(shipment), 'Shipment comes back as an array');
  assert.ok(shipment.length, 'Shipment has items');

  assert.deepEqual(Object.keys(shipment[0]), [
    'OrderID',
    'PurchaseOrderNum',
    'DatePlaced',
    'DateShipped',
    'TrackingNumbers',
    'TrackingUrls'
  ], 'Shipment keys returned');

  assert.end();
});

tap.test('Handles no shipments returned for an id', async (assert) => {
  const lib = new DotFit({
    clubId: process.env.CLUB_ID,
    clubPassword: process.env.CLUB_PASSWORD,
    wholesaleId: process.env.WHOLESALE_ID
  }, 'dev');

  const shipment = await lib.shipmentsById(0);

  assert.ok(Array.isArray(shipment), 'Shipment comes back as an array');
  assert.equal(shipment.length, 0, 'Shipment has no items');

  assert.end();
});
