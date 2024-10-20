require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const { EmbeddedSearch } = require('./src/api/embedded');
const { ShortAnswer } = require('./src/models/openai');
const { ExtractCompany } = require('./src/models/groq');

async function startServer() {

  const app = express();
  const port = 8080;

  // Middleware to parse JSON requests
  app.use(bodyParser.json());

  // Health check
  app.get('/health', async (res) => {
    res.status(200).send('OK');
  });

  
  app.post('/search/vector-search', async (req, res) => {
    const question = req.body.question;
    const format = req.body.format;

    if (!question) { // incase something slips by
      return res.status(400).json({ error: 'Question is required' });
    }

    try {
      const domain = await ExtractCompany(question); // not ideal but it works
      console.log("Extracted Company", domain);
      const { result, tokens } = await EmbeddedSearch(question, domain);
      if (!result) {
        return res.status(500).json({ error: 'Result is undefined' });
      }

      const result_struct = {
        answer: result.answer,
        sources: result.sources
      }

      if (format === 'short') {
        const transformed_answer = await ShortAnswer(context, result_struct.answer);
        result_struct.answer = transformed_answer;
      }

      return res.status(200).json({ result: result_struct, tokens: tokens });
    } catch (error) {
      console.error('Error processing request:', error);
      return res.status(500).json({ error: `An error occurred: ${error.message}` });
    }
  });

  // Start the Express server
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
}

// Start the server
startServer().catch(err => console.error('Failed to start server', err));