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


[!["Buy Me A Coffee"](https://www.buymeacoffee.com/assets/img/custom_images/orange_img.png)](https://www.buymeacoffee.com/jarett)