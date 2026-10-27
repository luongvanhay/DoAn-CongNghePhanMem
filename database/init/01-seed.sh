#!/bin/bash
set -e

echo "Importing contents..."
mongoimport --db content_db --collection contents \
  --file /seed/content_db.contents.json --jsonArray --mode=upsert --upsertFields _id

echo "Importing payment transactions..."
mongoimport --db content_db --collection payment_transactions \
  --file /seed/content_db.payment_transactions.json --jsonArray --mode=upsert --upsertFields _id

echo "Importing visits..."
mongoimport --db content_db --collection visits \
  --file /seed/content_db.visits.json --jsonArray --mode=upsert --upsertFields _id

echo "Content database seed completed."
