const soap = require('soap');
const Joi = require('joi');
const { promisify: prom } = require('util');

const urls = {
  dev: 'https://devtest.dotfit.com/webservices/OrdersService.asmx?WSDL',
  prod: 'https://www.dotfit.com/webservices/OrdersService.asmx?WSDL'
};

class DotFit {
  constructor(credentials, env = 'dev', debug = false) {
    this.debug = debug;
    if (this.debug) {
      this.log(['info'], 'Debug logging enabled');
    }

    const schema = Joi.object().keys({
      clubId: Joi.string().required(),
      clubPassword: Joi.string().required(),
      wholesaleId: Joi.string().required()
    }).required();

    const { error, value: validatedData } = Joi.validate(credentials, schema);

    if (error) {
      this.log(['error'], { message: 'Invalid credentials', error });
      throw new Error(error.details[0].message);
    }

    this.clubId = validatedData.clubId;
    this.clubPassword = validatedData.clubPassword;
    this.wholesaleId = validatedData.wholesaleId;

    this.url = urls[env];

    if (!this.url) {
      throw new Error('Unsupported environment. Use dev or prod');
    }

    this.SoapClient = false;

    return this;
  }
  get client() {
    if (this.SoapClient) {
      return Promise.resolve(this.SoapClient);
    }

    this.log(['info'], 'Client not initialized, initializing...');

    return this.createClient();
  }
  set client(value) {
    this.SoapClient = value;
  }
  log(tags, msg) {
    if (this.debug) {
      // eslint-disable-next-line no-console
      console.log(tags, msg);
    }
  }
  async createClient() {
    this.log(['info'], `Creating client for WSDL: ${this.url}`);
    const client = await soap.createClientAsync(this.url);

    client.addSoapHeader(`
    <ClubAuthHeader xmlns="http://services.dotfit.com/">
      <ClubID>${this.clubId}</ClubID>
      <ClubPassword>${this.clubPassword}</ClubPassword>
    </ClubAuthHeader>`);

    this.client = client;

    return this.client;
  }
  async describe() {
    const client = await this.client;

    return client.describe();
  }
  async inventory() {
    const client = await this.client;

    const response = await prom(client.OrdersService.OrdersServiceSoap12.GetInventory)({});

    return response.GetInventoryResult.InventoryItem;
  }
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
  }
  async shipmentsById(orderId) {
    const client = await this.client;

    this.log(['info'], `Getting shipments by order id: ${orderId}`);

    let response;

    try {
      response = await prom(client.OrdersService.OrdersServiceSoap12.GetShipmentInfoByID)({
        OrderID: orderId
      });
    } catch (error) {
      this.log(['error'], {
        message: `Problem getting order by id ${orderId}`,
        error
      });
    }

    if (!response || !response.GetShipmentInfoByIDResult) {
      this.log(['info'], `No shipments found for order id: ${orderId}`);
      response = {
        GetShipmentInfoByIDResult: {
          ShippedOrder: []
        }
      };
    }

    return response.GetShipmentInfoByIDResult.ShippedOrder;
  }
  async createOrder(orderData) {
    const client = await this.client;

    const schema = Joi.object().keys({
      wholesaleUserID: Joi.number().optional().default(this.wholesaleId),
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

    this.log(['info'], {
      message: 'Submitting order',
      inputData: orderData,
      validatedData
    });

    if (error) {
      throw new Error(error);
    }

    const response = await prom(client.OrdersService.OrdersServiceSoap12.PlaceWholesaleOrder)(validatedData);

    return response.PlaceWholesaleOrderResult;
  }
}

module.exports = DotFit;
