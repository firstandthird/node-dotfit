const soap = require('soap');
const Joi = require('joi');
const { promisify: prom } = require('util');

let SoapClient;
let url = 'https://devtest.dotfit.com/webservices/OrdersService.asmx?WSDL';

module.exports = {
  get client() {
    if (SoapClient) {
      return Promise.resolve(SoapClient);
    }

    return this.createClient();
  },
  set client(value) {
    SoapClient = value;
  },
  get url() {
    return url;
  },
  set url(value) {
    url = value;
  },
  log(tags, msg) {
    if (process.env.DEBUG) {
      // eslint-disable-next-line no-console
      console.log(tags, msg);
    }
  },
  async createClient() {
    this.log(['info'], `Creating client for WSDL: ${url}`);
    const client = await soap.createClientAsync(url);

    const ClubID = process.env.CLUB_ID;
    const ClubPassword = process.env.CLUB_PASSWORD;
    const WholesaleID = process.env.WHOLESALE_ID;

    if (!ClubID) {
      throw new Error('CLUB_ID not set.');
    }

    if (!ClubPassword) {
      throw new Error('CLUB_PASSWORD not set.');
    }

    if (!WholesaleID) {
      throw new Error('WHOLESALE_ID not set.');
    }

    client.addSoapHeader(`
    <ClubAuthHeader xmlns="http://services.dotfit.com/">
      <ClubID>${ClubID}</ClubID>
      <ClubPassword>${ClubPassword}</ClubPassword>
    </ClubAuthHeader>`);

    this.client = client;

    return this.client;
  },
  async describe() {
    const client = await this.client;

    return client.describe();
  },
  async inventory() {
    const client = await this.client;

    const response = await prom(client.OrdersService.OrdersServiceSoap12.GetInventory)({});

    return response.GetInventoryResult.InventoryItem;
  },
  async shipmentsByDate(start, end) {
    const client = await this.client;

    this.log(['info'], `Getting shipments by date: ${start} - ${end}`);

    const startDate = new Date(start);
    const endDate = new Date(end);

    const response = await prom(client.OrdersService.OrdersServiceSoap12.GetShipmentInfoByDate)({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    if (!response.GetShipmentInfoByDateResult) {
      this.log(['info'], `No shipments found between: ${start} - ${end}`);

      response.GetShipmentInfoByDateResult = {
        ShippedOrder: []
      };
    }

    return response.GetShipmentInfoByDateResult.ShippedOrder;
  },
  async shipmentsById(orderId) {
    const client = await this.client;

    this.log(['info'], `Getting shipments by order id: ${orderId}`);

    const response = await prom(client.OrdersService.OrdersServiceSoap12.GetShipmentInfoByID)({
      OrderID: orderId
    });

    if (!response.GetShipmentInfoByIDResult) {
      this.log(['info'], `No shipments found for order id: ${orderId}`);

      response.GetShipmentInfoByIDResult = {
        ShippedOrder: {}
      };
    }

    return response.GetShipmentInfoByIDResult.ShippedOrder;
  },
  async createOrder(orderData) {
    const client = await this.client;

    const schema = Joi.object().keys({
      wholesaleUserID: Joi.number().optional().default(process.env.WHOLESALE_ID),
      shippingInfo: Joi.object().keys({
        FirstName: Joi.string().required(),
        LastName: Joi.string().required(),
        Address1: Joi.string().required(),
        Address2: Joi.string().optional().allow('').default(''),
        Zipcode: Joi.string().required(),
        City: Joi.string().required(),
        State: Joi.string().required(),
        Country: Joi.string().required(),
        Phone: Joi.string().required(),
        Email: Joi.string().required()
      }),
      shippingMethod: Joi.allow('UPSGround', 'UPSNextDayAir', 'UPS3DaySelect', 'ATSGround'),
      orderLines: Joi.array().items(Joi.object().keys({
        OrderLine: Joi.object().keys({
          ItemNumber: Joi.string().required(),
          Quantity: Joi.number().required()
        })
      })),
      orderComments: Joi.string().optional().allow(''),
      purchaseOrderNum: Joi.string().required()
    });

    const { error, value: validatedData } = Joi.validate(orderData, schema);

    if (error) {
      throw new Error(error);
    }

    const response = await prom(client.OrdersService.OrdersServiceSoap12.PlaceWholesaleOrder)(validatedData);

    return response.PlaceWholesaleOrderResult;
  }
};
