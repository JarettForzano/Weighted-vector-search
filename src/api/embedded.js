const axios = require('axios');
const SERP_API = process.env.SERP_API;
const math = require('mathjs');
const { CreateEmbedding, ChunkDecider, BatchEmbedding } = require('../models/openai');
const { RemoveNoise, CreateKeywords, ScrapeLinks } = require('./helper');
const CHUNKSIZE = 2500;
const OVERLAP = 225;

/*
    We are going to try an interesting approach to basic serping.

    We pull snippets, links, and create embeddings of the snippets to compare with the search query

    pull the top three and return them in this function

    speed is a must so we are going to compute the simularity between the embeddings ourselves
*/
async function EmbeddedSearch(context, domain, query_logger) {
  try {
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        engine: "google",
        q: context,
        api_key: SERP_API
      }
    });

    const link_list = ExtractLinks(response.data);
    if (query_logger) {
      query_logger.addData('serp_results', link_list);
    }

    const keywords = await CreateKeywords(context);

    if (keywords.error) {
      return {error: `Failed to create keywords: ${keywords.error}`};
    }
    
    if (query_logger) {
      query_logger.addData('keywords', keywords);
    }

    const map_link_text = await ScrapeLinksAndChunk(link_list, domain);
    const filtered_chunks = FilterChunks(map_link_text, keywords, domain);
    console.log(filtered_chunks.length)
    if (filtered_chunks.length === 0) { // okay when this happens the user asked a super vague question or its just not available anywhere
      return { result: {
        answer: "No results are found",
        sources: []
      }, tokens: 0 };
    }

    const embeded_chunks = await AddEmbeddingsToChunks(filtered_chunks);
    const query = RemoveNoise(context);

    const queryEmbedding = await CreateEmbedding(query);
    const normalizedQueryEmbedding = NormalizeEmbedding(queryEmbedding);

    const final_five = embeded_chunks.map(entry => {
      const similarity = CosineSimilarity(normalizedQueryEmbedding, entry.embedding);
      const weight = similarity + entry.weight;

      return { ...entry, similarity, weight };
    })
      .sort((a, b) => b.weight - a.weight)
      .slice(0, 5);

    
    const decided_answer = await ChunkDecider(final_five, context);
    return decided_answer;
        
  } catch (error) {
    return { error: `An error occurred: ${error.message}` };
  }
}

/*
  Filters all the chunks by converting to a set and filtering

  This way each keyword only gets counted once if inside the text

  This also adds the weight to the map when returned for each chunk, providing a swifter way to calculate simularity

*/
function FilterChunks(map, keywords, domain) {
  const pure_domain = domain.split('.')[0];
  const keywordSet = new Set(keywords.map(keyword => keyword.toLowerCase()));
  keywordSet.add(pure_domain.toLowerCase());

  return map.filter(chunk => {

    const wordsInChunk = new Set(chunk.text.toLowerCase().split(/\W+/));

    let keyword_count = 0;

    for (let keyword of keywordSet) {
      if (wordsInChunk.has(keyword)) {  // O(1) lookup in Set
        keyword_count += 0.1;
      } else {
        keyword_count -= 0.05;
      }
    }

    chunk.weight += keyword_count;
    return keyword_count > 0;
  });
}

/*
  Scraps each link provided and chunks them

  Needs to be done in parallel

  Will be faster when firecrawl releases their bulk processing feature for scrap

*/
async function ScrapeLinksAndChunk(links, domain) {
  const pure_domain = domain.split('.')[0];

  const scrapeAndChunk = (link, markdown) => {
    if (!markdown) return [];

    let weight = 0;
    if (link.includes(pure_domain)) {
      weight += 0.1;
    }
    if (link.includes(domain)) {
      weight += 0.15;
    }
    const chunks = [];
    for (let i = 0; i < markdown.length; i += (CHUNKSIZE - OVERLAP)) {
      chunks.push({
        link,
        text: markdown.slice(i, i + CHUNKSIZE),
        weight
      });
    }
    return chunks;
  };

  const scrapedData = await ScrapeLinks(links); // Using ScrapeLinks function for batch scraping
  const results = scrapedData.results.flatMap(({ url, content }) => scrapeAndChunk(url, content));
  //console.log(results);
  return results;
}

// bulk completes embedding for the map of text chunks
async function AddEmbeddingsToChunks(chunk_map) {
  const texts = chunk_map.map(item => item.text);
  const embeddings = await BatchEmbedding(texts);

  return chunk_map.map((item, idx) => ({
    ...item,
    embedding: NormalizeEmbedding(embeddings[idx])  // Normalize here
  }));
}

function ExtractLinks(data) {
  //console.log(data);
  let links = data.organic_results
      .map(result => result.link)
      .filter(link => !link.includes('youtube'));
  
  if (data.answer_box && data.answer_box.link) {
      links.push(data.answer_box.link);
  }

  return links;
}

// Returns the simularity between two different embeddings
function CosineSimilarity(A, B) {
  // Since A and B are normalized, their norms are 1
  const dotProduct = math.dot(A, B);
  return dotProduct;
}

// used to normalize an embedding
function NormalizeEmbedding(embedding) {
  const norm = math.norm(embedding);
  if (norm === 0) return embedding;
  return embedding.map(value => value / norm);
}

module.exports = {
  EmbeddedSearch
};