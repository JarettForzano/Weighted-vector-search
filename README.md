# Weighted Vector Search (Open Sourcing)
### This project was a great learning experience and I hope you find it useful!

This is a custom search engine that uses a combination of semantic search and keyword weighting to provide more relevant results.

### How it works

1. **Keyword Extraction**: Fine tuned spacy small modelto extract keywords from the query.
2. **Semantic Search**: OpenAI's embedding model to convert the query and chunks into vectors.
3. **Keyword Weighting**: The cosine similarity between the query vector and each chunk vector, and the presence of the keywords in each chunk to score the chunks.
4. **Result Selection**: The top 5 chunks based on the score.


### How to run

1. Install dependencies: `pnpm install`
2. Create virtual environment for python: `python -m venv venv`
3. Install dependencies: `pip install -r requirements.txt`
4. Start the server: `pnpm run start:both`

### Additional Notes

- project currently does not scrape javascript but you can visit this repository for examples of how to do so `https://github.com/JarettForzano/Scraping-Examples`

- Will later try to swap out the OpenAI model for a baseten hosted one that is specifically made for larger context windows.
- The original system actually took in both the context from the user and the domain of the company they were researching. This created a more accurate filtering process. Since this is just a demonstration I added a quick and dirty domain extraction method that will take the company name out of the query and use that. If you want to test it completely include the domain inside of the query.

### Improvements
- Use basetens TRT-LLM that is made for larger context windows and increase the mount of chunks that are taken in. [Here](https://github.com/basetenlabs/truss-examples/tree/main/trt-llm-engine-builder-templates/llama-3_1-8b-instruct/large_context) is the documentation.
- Concatenate chunks that come from the same site after doing a simularity search and extend the top X amount so that you are more likely to pull from different sites.


[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/jarett)