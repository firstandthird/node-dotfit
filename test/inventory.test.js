/* eslint-disable new-cap */
require('dotenv').config();

const tap = require('tap');
const lib = require('../');

tap.test('Gets Inventory', async (assert) => {
  const inventory = await lib.inventory();

  assert.ok(Array.isArray(inventory), 'Inventory comes back as an array');
  assert.ok(inventory.length, 'Inventory has items');

  assert.deepEqual(Object.keys(inventory[0]), [
    'PartNumber',
    'Name',
    'InventoryCount',
    'UPC'
  ], 'Inventory keys returned');

  assert.end();
});
