# This repo was generated using AI

## Initial prompt below

```
Create a github repo that is a framework and working example that I can clone off in the future to use to quickly develop and deploy websites with firebase. Create all the necessary directories and files and readme and gitignore files.



Have the front end be written in typescript and use vite, react, and material UI. Have the frontend be a web app that can use google auth and phone number for sign-up and sign-in. Also ensure that the frontend will work well on both a desktop browser and also a mobile browser, behaving as an SPA or PWA.



For the example frontend that is ready to deploy, have the text Hello World text at the top as a title, along with a picture in a carousel on the page. Then have two forms, each with a send button. One send button sends to the firebase backend of the app - this needs to actually work.

The other send button sends to a python flask backend that is meant to be hosted on Google Cloud Run. The cloud run backend needs to actually get the request. The actual database connections can be commented out. Then have another form below that to handle credit card payments with stripe integrated on the backend.



In addition to firestore, I want to be able to connect to both a relational database (postgres) and bigquery.



Also include a readme with steps for how to use this. With the first step being to clone the repo. Then additional steps with the commands to run or areas to click to launch a firebase or GCP project and connect to it. 



In the readme:

Include instructions for how to connect to the cloud run.

Provide commands to run to replace the areas of code to put in the correct API key and project names once a project is set up.

Include instructions for how to connect to an actual domain main registered on namecheap

Also discuss how the static files are stored and why a Cloudflare setup isn’t necessary because firebase already stores the static assets.
```