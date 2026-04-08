const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'PG Stay API',
      version: '1.0.0',
      description: 'API documentation for PG Stay - Paying Guest Management System',
      contact: {
        name: 'Support',
        email: 'support@pgstay.com',
      },
    },
    servers: [
      {
        url: process.env.API_URL || 'http://localhost:5000/api',
        description: 'API Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            email: { type: 'string' },
            name: { type: 'string' },
            role: { type: 'string', enum: ['admin', 'tenant', 'super_admin'] },
            organizationId: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Tenant: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            roomId: { type: 'string' },
            bedId: { type: 'string' },
            checkInDate: { type: 'string', format: 'date' },
            checkOutDate: { type: 'string', format: 'date' },
            monthlyRent: { type: 'number' },
            status: { type: 'string', enum: ['active', 'inactive', 'checkout'] },
          },
        },
        Building: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            address: { type: 'string' },
            city: { type: 'string' },
            state: { type: 'string' },
            zipCode: { type: 'string' },
            totalFloors: { type: 'integer' },
          },
        },
        Room: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            buildingId: { type: 'string' },
            roomNumber: { type: 'string' },
            floorNumber: { type: 'integer' },
            type: { type: 'string', enum: ['single', 'double', 'triple', 'dorm'] },
            capacity: { type: 'integer' },
            monthlyRent: { type: 'number' },
          },
        },
        Bed: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            roomId: { type: 'string' },
            bedNumber: { type: 'integer' },
            status: { type: 'string', enum: ['available', 'occupied', 'maintenance'] },
            occupiedBy: { type: 'string' },
          },
        },
        Payment: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            tenantId: { type: 'string' },
            amount: { type: 'number' },
            month: { type: 'string', format: 'date' },
            status: { type: 'string', enum: ['pending', 'paid', 'overdue'] },
            paidDate: { type: 'string', format: 'date-time' },
          },
        },
        Organization: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            name: { type: 'string' },
            slug: { type: 'string' },
            email: { type: 'string' },
            phone: { type: 'string' },
            plan: { type: 'string', enum: ['free', 'basic', 'pro', 'enterprise'] },
            status: { type: 'string', enum: ['active', 'suspended', 'inactive'] },
          },
        },
        Error: {
          type: 'object',
          properties: {
            message: { type: 'string' },
            error: { type: 'string' },
          },
        },
      },
    },
    security: [],
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(options);

module.exports = { swaggerUi, swaggerSpec };
