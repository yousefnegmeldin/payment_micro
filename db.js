const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

module.exports = {
  query: async (query, params) => {
    throw new Error("Direct SQL queries are not supported with Prisma. Use Prisma's query methods instead.");
  },
  prisma, // Export the Prisma client for use in your application
};