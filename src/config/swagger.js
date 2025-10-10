const swaggerJsdoc = require("swagger-jsdoc");

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "JoanTee Backend API",
      version: "1.0.0",
      description: "API documentation for JoanTee e-commerce platform",
      contact: {
        name: "JoanTee Support",
        email: "joanteebusiness@gmail.com",
      },
    },
    servers: [
      {
        url: "http://localhost:5000",
        description: "Development server",
      },
      {
        url: "https://backend-seven-lemon-52.vercel.app",
        description: "Production server",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        User: {
          type: "object",
          properties: {
            id: { type: "integer" },
            email: { type: "string", format: "email" },
            first_name: { type: "string" },
            last_name: { type: "string" },
            role: { type: "string", enum: ["user", "admin"] },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Product: {
          type: "object",
          properties: {
            id: { type: "integer" },
            name: { type: "string" },
            description: { type: "string" },
            price: { type: "number", format: "float" },
            category_id: { type: "integer" },
            brand_id: { type: "integer" },
            is_active: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Review: {
          type: "object",
          properties: {
            id: { type: "integer" },
            user_id: { type: "integer", nullable: true },
            guest_name: { type: "string", nullable: true },
            rating: { type: "integer", minimum: 1, maximum: 5 },
            review_text: { type: "string" },
            is_approved: { type: "boolean" },
            is_flagged: { type: "boolean" },
            flag_reason: { type: "string", nullable: true },
            display_name: { type: "string" },
            is_authenticated_user: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Error: {
          type: "object",
          properties: {
            success: { type: "boolean" },
            message: { type: "string" },
            errorCode: { type: "string" },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ["./src/routes/*.js"], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

module.exports = specs;
