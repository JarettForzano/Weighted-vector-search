const axios = require('axios');

const stopWords = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours', 'ourselves', 'you', 'your', 'yours', 'yourself', 'yourselves',
  'he', 'him', 'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their',
  'theirs', 'themselves', 'what', 'which', 'who', 'whom', 'this', 'that', 'these', 'those', 'am', 'is', 'are', 'was',
  'were', 'be', 'been', 'being', 'have', 'has', 'had', 'having', 'do', 'does', 'did', 'doing', 'a', 'an', 'the', 'and',
  'but', 'if', 'or', 'because', 'as', 'until', 'while', 'of', 'at', 'by', 'for', 'with', 'about', 'against', 'between',
  'into', 'through', 'during', 'before', 'after', 'above', 'below', 'to', 'from', 'up', 'down', 'in', 'out', 'on', 'off',
  'over', 'under', 'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
  'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only', 'own', 'same', 'so',
  'than', 'too', 'very', 's', 't', 'can', 'will', 'just', 'don', 'should', 'now'
]);

/*
  Stop words are words that are common and do not need to be embedded when we do our vectordb search,

  This script removes all of them and uses some other techniques to help reduce noise as much as possible within our query
*/
function RemoveNoise(query) {
  query = query.toLowerCase();
  query = query.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, ' ');
  query = query.split(' ').filter(word => !stopWords.has(word)).join(' ');
  
  return query.trim();
}

// Generates a list of keywords from a query to be used to filter out chunks
async function CreateKeywords(query) {
  //console.log('Running on', pythonServerHost);

  try {
    const { data } = await axios.post(`http://localhost:3000/api/keywords`, { sentence: query });
    return Array.from(data.filtered_keywords);
  } catch (error) {
    return { error: error.message };
  }
}

async function ScrapeLinks(links) {
  const params = {
    urls: links
  };

  try {
    const response = await axios.post(`http://localhost:3000/api/scrape`, params, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Process the response to extract the necessary information
    const results = response.data.results.map(result => ({
      url: result.url,
      title: result.title,
      content: result.content
    }));

    return {
      total_time: response.data.total_time,
      results
    };
  } catch (error) {
    console.error(`Error scraping links: ${error.message}`);
    return links.map(link => ({ link, markdown: '' }));
  }
}


module.exports = {
  RemoveNoise,
  CreateKeywords,
  ScrapeLinks
};