const { GraphQLClient, gql } = require('graphql-request');
const csvToJson = require('csvtojson');

// Your Hygraph API endpoint and token (replace with your own)
const endpoint = 'https://your-hygraph-endpoint';
const token = 'your-authorization-token';

const client = new GraphQLClient(endpoint, {
  headers: {
    authorization: `Bearer ${token}`,
  },
});

// Clean up the special characters and handle line breaks
const cleanString = (str) => {
  return str.replace(/N'|\\n|\\r/g, '').trim();
};

// Convert date to RFC3339 format with time set to 00:00:00
const formatDate = (dateStr) => {
  const date = new Date(dateStr);
  date.setHours(0, 0, 0, 0);
  return date.toISOString();
};

// Define a generic mutation template for creating entities
const createEntityMutation = (data, entityName, fields) => {
  const formattedFields = fields.map(
    (field) =>
      `${field.name}: ${field.isString ? `"${cleanString(data[field.name])}"` : data[field.name]}`
  ).join(", ");
  
  return gql`
    mutation {
      create${entityName}(data: {
        ${formattedFields}
      }) {
        id
      }
    }
  `;
};

const publishEntityMutation = (entityName, id) => gql`
  mutation {
    publish${entityName}(where: { id: "${id}" }) {
      id
    }
  }
`;

// Function to import CSV data to Hygraph
const importCsvToHygraph = async (csvFilePath, entityName, fields) => {
  const jsonArray = await csvToJson().fromFile(csvFilePath);

  for (const data of jsonArray) {
    try {
      const createResponse = await client.request(createEntityMutation(data, entityName, fields));
      const id = createResponse[`create${entityName}`].id;
      console.log(`Created entry with ID: ${id}`);

      const publishResponse = await client.request(publishEntityMutation(entityName, id));
      console.log(`Published entry with ID: ${publishResponse[`publish${entityName}`].id}`);
    } catch (error) {
      console.error(`Error creating or publishing entry: ${error.message}`);
    }
  }
};

// Specify the entity name and fields (replace these with your actual entity name and fields)
const entityName = 'YourEntityName';
const fields = [
  { name: 'field1', isString: true },
  { name: 'field2', isString: false },
  { name: 'field3', isString: true },
  // Add more fields as required
];

// Import data.csv (ensure the file path is correct)
importCsvToHygraph('./data.csv', entityName, fields);
