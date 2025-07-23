# AfC-submit-wizard

A tool to help editors submit their already created drafts on English Wikipedia. The tool assists editors with placing {{AfC topic}}s, short descriptions, and WikiProject banners.

The goal is to help a draft writer get their draft found by reviewers that specialize in certain kinds of drafts. These various tags help specialist reviewers find the draft.

## Languages and frameworks

This tool is written in JavaScript, uses OOUI for its front end, and uses the &withJS= URL technique for loading the script.

## How to use

Visit https://en.wikipedia.org/wiki/Wikipedia:Articles_for_creation/Submitting

## How to deploy

Copy/paste the code in this repository's afc-submit-wizard.js file to https://en.wikipedia.org/wiki/MediaWiki:AFC-submit-wizard.js

## How to test

* Method 1: Run npm start, which makes the script available on http://localhost:5500/afc-submit-wizard.js. In your testwiki common.js file, add `importScript('http://localhost:5500/afc-submit-wizard.js');` or run it manually from the JS console. 
* Method 2: Deploy your test code to https://test.wikipedia.org/wiki/MediaWiki:AFC-submit-wizard.js. Then test the script at https://test.wikipedia.org/wiki/Wikipedia:Articles_for_creation/Submitting.

## More documentation

See [Wikipedia:WikiProject Articles for creation/Submission wizard](https://en.wikipedia.org/wiki/Wikipedia:WikiProject_Articles_for_creation/Submission_wizard).