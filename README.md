# Brownsville EPW Staging Website
This is a staging website created for Brownsville Engineering and Public works.

The [deployed website](https://pateichler.github.io/brownsville-epw-web/) is for pending changes on the [Brownsville EPW website](https://www.brownsvilletx.gov/361/Engineering-Public-Works).

## How it works
The webpages from the Browsnville website were scraped using the Node [scraper script](https://github.com/pateichler/brownsville-epw-web/blob/main/scraper/scraper.ts). The scaper stores only the main body of the pages as a HTML file inside a folder corresponding to the page URL.

The web pages are then rebuilt using [11ty](11ty.dev) to add navigation and custom header. This allows pages to be deleted and added without additional changes. This project is setup to deploy the 11ty generated pages to GitHub pages everytime the repository is pushed.
