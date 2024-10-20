const OpenAI = require('openai');
const OPENAI = process.env.OPENAI_API;
const openai = new OpenAI({ apiKey: OPENAI });

/*
    This is creates the embedding using an sdk
*/
async function CreateEmbedding(context) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: context,
    });

    // Check if response.data and response.data.data are defined
    if (response && response.data && response.data.length > 0) {
      const embedding = response.data[0].embedding;
      return embedding;
    } else {
      return { error: response };
    }
  } catch (error) {
    return { error: error };
  }
}

async function BatchEmbedding(list_text) {
  try {
    const response = await openai.embeddings.create({
      model: 'text-embedding-ada-002',
      input: list_text, 
    });

    if (response && response.data && response.data.length > 0) {
      const embeddings = response.data.map(item => item.embedding);  // Extract all embeddings
      return embeddings; 
    } else {
      return { error: response };
    }
  } catch (error) {
    return { error: error };
  }
}

/*
  Key part of the serp search 

  Takes three chunks with their sources and analyzes and answers the users question

  ordered to only include what it used in its sources
*/
async function ChunkDecider(json, query) {
  console.log("LINK->", json[0].link);
  console.log("LINK->", json[1].link);
  console.log("LINK->", json[2].link);
  console.log("LINK->", json[3].link);
  console.log("LINK->", json[4].link);

  let system_prompt = `
    I will provide you information about a company, along with the user's query. Your task is to analyze the content in relation to the user's query and return an answer. Additionally, return a JSON object containing both your answer and a list of the sources that contributed to your decision.

    Provide all the sources that contain information about the user's query. You may receive multiple text chunks from the same source; if this is the case, only include the source URL once in the sources list.

    **IMPORTANT: Give priority to the information from the company's official website. If information from the official website is relevant to the query, it must be cited first, before any external links.**
  `;

  for (let i = 0; i < json.length; i++) {
    system_prompt += `
    Source url: ${json[i].link}
    Text ${i + 1}: ${json[i].text}
    `;
  }

  system_prompt += `
    User Query:
    ${query}

    Important Instructions:
    Use the information to provide a clear, well-supported answer to the query in 1-2 sentences. Do not provide feedback; you are just answering the question if you can.
    Do not include links from inside the text as your sources; only include links provided with the source URL as your sources IF YOU USE THEM. **Make sure to prioritize sources from the website the user is asking about (e.g., the official website) over others.**
    Structure your final response as a JSON object, following this format:

    {
      "answer": "ANSWER HERE",
      "sources": [
        "SOURCE URL HERE",
        "SOURCE URL HERE",
        "SOURCE URL HERE"
      ]
    }
    Only list sources which helped you get closer or answered the question. Irrelevant sources do not need to be cited.

    If the answer cannot be found in the chunks provided, return this
    {
      "answer": "No results are found",
      "sources": [
      ]
    }
  `;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system_prompt },
    ],
    response_format: { type: 'json_object' },
  });
  
  const content = completion.choices[0].message.content;
  const tokens = completion.usage.total_tokens;
  return { result: JSON.parse(content), tokens: tokens };
}

/*
  takes the users question and the domain and combines it to make an enhanced question

  For the serp search.
*/
async function PromptImprover(question, domain) {
  const system_prompt = `
      You are provided with a user’s question and a specific domain or website.
      Your task is to refine the user’s question by integrating the domain information in a natural and context-appropriate way.
      The final search query should be clear, concise, and targeted to produce accurate results.
      You can rephrase or reorganize the question and domain as needed to improve search performance, but ensure both are included and that the domain is pure and not modified such as keeping the domain in domain.com format. Do not modify the domain in any way. Output the improved query

      DO NOT SEND ANYTHING BUT THE IMPROVED QUERY.

      Here is the information described above.

      Question: ${question}
      Organization: ${domain}
    `;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system_prompt },
    ],
  });
    
  const content = completion.choices[0].message.content;
  return content;
}

/*
  Turns a long answer into a short one
*/
async function ShortAnswer(question, answer) {
  const system_prompt = `
      You will be provided with a question, and a long answer to that question. Your task is to make the long answer as concise as possible. First, analyze the question. The question was asked by a person that wants just the absolute bare minimum amount of information to answer their question. You don't need to repeat parts of the question, or parts of the long answer.
      ---------
      Example:
      Question: Who is the identity verification provider for esty.com?
      Long Answer: The identity verification provider for Instacart is Jumio. Instacart uses Jumio's Netverify for the onboarding process of new shoppers, which involves a self-guided online identity verification process. This process includes taking a picture of a driver's license or other government-issued ID and a selfie, which Jumio verifies using a combination of artificial intelligence, computer vision, and human review.
      Output: Jumio
      Example:
      Question: Does Baseten.co offer customer support over slack?
      Long Answer: Baseten.co does offer customer support over Slack. They utilize Slack for real-time communication and notifications, which helps their engineering team triage issues quickly by correlating customer-reported problems with alerts from their systems. This setup allows for immediate updates and facilitates efficient workflows among their on-call engineers.
      Output: Yes
      Example:
      Question: Does companyWebsite offer customer support over slack?
      Long Answer: Yes, Bubble.io allows users to connect a custom domain to their applications. To set up a custom domain, users need to follow these steps: Purchase a Domain: First, buy the desired domain from a domain registrar. It's important to note that Bubble apps are hosted on Bubble's servers, so you only need to pay for the domain, not additional hosting. Add the Domain in Bubble: Navigate to the Bubble editor, access the Settings tab, and then the Domain/email sub-tab. Enter the domain you purchased 5 . Configure DNS Settings: After adding the domain in Bubble, you will receive DNS settings that need to be registered with your domain registrar. This typically involves setting up A and CNAME records to point your domain to Bubble's servers 5 . SSL Encryption: Bubble automatically adds SSL encryption to your custom domain, ensuring secure data transmission and potentially improving search engine rankings 5 . This process allows you to customize your app's URL, making it more recognizable and professional 5 .
      Output: Yes
      Example:
      Question: What AAAA record do I change to connect a custom domain to Beacons.ai?
      Long Answer: To connect a custom domain to Beacons.ai, you need to set an AAAA record with the following details: Host: @ Points to: 2a09:8280:1:9032:60eb:1797:5542:d0db You can leave the TTL setting as it is.
      Output: 2a09:8280:1:9032:60eb:1797:5542:d0db
      Example:
      Question: Who is the CEO of mailmodo.com?
      Long Answer: Aquibur Rahman Professional based in San Francisco Current Job Mailmodo Location San Francisco Education Indian Institute of Management, Ahmedabad The CEO of Mailmodo is Aquibur Rahman.
      Output: Aquibur Rahman

      ------------------------------------------------
      This is the user Prompt:
      Question: ${question}
      Long Answer: ${answer}
      Output:
    `;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      { role: 'system', content: system_prompt },
    ],
  });
    
  const content = completion.choices[0].message.content;
  return content;
}

module.exports = {
  CreateEmbedding,
  ChunkDecider,
  BatchEmbedding,
  PromptImprover,
  ShortAnswer
};
