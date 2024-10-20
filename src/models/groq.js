const Groq = require('groq-sdk');
const GROQ_API = process.env.GROQ_API;
const groq = new Groq({ apiKey: GROQ_API });


/*
    In the original system we passed in the domain

    Since we cannot do that just in the server im making this bootlegged domain/company extractor
*/
async function ExtractCompany(question) {

    const system_prompt = `
          When provided with a question extract the domain if it exists and if not extract the company the question is about.
          If neither of them exist then return this json object:
          {
            "company": null
          }
          else return this json object:
          {
            "company": 'COMPANY OR DOMAIN HERE'
          }
          below is the question, extract the company or domain from it.
          Question: ${question}
      `;
  
    const chatCompletion = await groq.chat.completions.create({
      'messages': [
        {
          'role': 'system',
          'content': system_prompt
        },
      ],
      'model': 'llama-3.1-8b-instant',
      'temperature': 1,
      'max_tokens': 1024,
      'top_p': 1,
      'stream': false,
      'stop': null,
      "response_format": {
        "type": "json_object"
      },
    });
  
    const result = chatCompletion.choices[0].message.content;
    const parsed_result = JSON.parse(result);
    return parsed_result.company;
  }



module.exports = {
    ExtractCompany
}