from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import spacy
import asyncio
import httpx
from typing import List
from src.api.scraping import fetch_content
import time
# uvicorn server:app --host 0.0.0.0 --port 3000 --workers 5
nlp = spacy.load("ner_model")

app = FastAPI()

# Define Pydantic models for request bodies
class KeywordRequest(BaseModel):
    sentence: str

class ScrapeRequest(BaseModel):
    urls: List[str]

# Keep your extract_keywords function
def extract_keywords(sentence):
    doc = nlp(sentence)
    filtered_words = set()

    # Filter nouns, proper nouns, and unknown (X) parts of speech
    for token in doc:
        if token.pos_ in ["NOUN", "PROPN", "X"]: 
            filtered_words.add(token.text.lower())

    # Add organizations (ORG entities) to the set of filtered words
    for ent in doc.ents:
        if ent.label_ == "ORG": 
            filtered_words.add(ent.text.lower())

    return list(filtered_words)

# Endpoint for keyword extraction
@app.post('/api/keywords')
async def get_keywords(request: KeywordRequest):
    sentence = request.sentence

    if not sentence:
        raise HTTPException(status_code=400, detail='No sentence provided')

    filtered_words = extract_keywords(sentence)

    return {'filtered_keywords': filtered_words}

# Endpoint for scraping
@app.post('/api/scrape')
async def scrape_urls(request: ScrapeRequest):
    urls = request.urls

    if not urls:
        raise HTTPException(status_code=400, detail='No URLs provided')

    start_time = time.time()
    semaphore = asyncio.Semaphore(10)  # Adjust based on your server capacity

    async with httpx.AsyncClient(timeout=30.0, follow_redirects=True) as client:
        tasks = [fetch_content(client, url, semaphore) for url in urls]
        results = await asyncio.gather(*tasks)

    end_time = time.time()
    total_time = end_time - start_time
    print(f"Total time taken: {total_time} seconds")

    return {
        'total_time': total_time,
        'results': results
    }