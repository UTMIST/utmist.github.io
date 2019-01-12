# utmist.github.io
Home page for UTMIST

# Stack

Get familiar with the following language/framework/toolchain:

- HTML + CSS (no JavaScript on the Frontend)
- [Pug](https://pugjs.org/api/getting-started.html), a templating language
- Node.js, for building the site and continuous integration
- Yarn/npm, package manager for Node.js
- TypeScript, type-checked JavaScript
- Google Sheet API + Google Drive API, as a CMS/PseudoDatabase
- Travis CI, a continuous integration service used here to build websites when the data change

# How To X

- Setup environment
    - make sure [node.js](https://nodejs.org/en/) is installed on local machine, optionally install [yarn](https://yarnpkg.com/en/)
    - clone the repository, `cd` into the root
    - install packages by running `yarn` or `npm install`
    - upgrade packages if necessary by running `yarn upgrade` or `npm update`
    - use a static server of your choice to serve the repository, navigate to `index.html`
    - to compile `.pug` templates in watch mode, run `yarn start` or `npm start`
    - to compile the templates just once, run `yarn build` or `npm run build`
- Update Content
    - Events/Execs: update the corresponding Google Sheet or use the Google Form, Travis CI will automatically update the site daily
    - Other components: find the corresponding resource in the repository, make changes and commit
- Add Sub-page
    - One simple page/component
      - Add a new `.pug` file in the repository root
        - If the file describes a complete page (starts with \<html\>), just compile after you are done, you should see a new `.html` file with the same name as the `.pug`
        - If the `.pug` file is a component, include it in the existing `.pug` files and compile
      - **DON'T DIRECTLY EDIT THE HTML**, they are generated from `.pug` and will get overwritten daily
    - Self-contained sub directory
      - Create a sub directory in the repository root (e.g. `new_site`)
      - Put all your files in there, treat it as a separate static website
      - Remember to serve from the root and navigate to `localhost\new_site\`, because Github will serve the page with `utmist.github.io\new_site\`

# Folder Structure

- `assets\`: static assets such as images, video, large text
- `common\`: components used to stitch together a web page
- `Fonts\,Log\`: website branding
- `database\`: JSON copies of UTMIST data, fetched from Google Sheets, used by Travis to generate the site. It is not really a database, but acts as the source of "business data".
- `files\`: files referenced by the `database`
- `index.css,index.html,index.pug`: entry point when users visit utmist.github.io
- `node_modules\`: packages downloaded by npm or yarn. Not tracked by git.
- `.nojekyll`: Github by default tries to build the repository with Jekyll, but our site is totally static, turning it off speeds up deployment (almost instant)
- `.travis.yml`: configures how Travis builds the site, please put security tokens in Travis environment variables instead of here
- `compile.js`: load in data from `database` and compiles `.pug` files
- `watch.js`: compile on file change, useful for development
- `fetch.js,fetch.ts`: grabs info from Google Sheet and Google Drive and dump into `database\` and `files\`, used by Travis
- `package.json,yarn.lock`: file used by yarn/npm to track dependencies
- `tsconfig.json`: tells TypeScript how to check and compile `.ts` code

# Build Process

The build process is designed to minimize the manual house-keeping of the developer. For frequent changes such as adding events and adding members, Google Sheet API & Google Drive API pull the changes into the repository automatically. This process is run by Travis.

```mermaid
graph TD;
Daily --> Google
Dev("Commit to dev branch") --> Google
Google("Google Drive & Sheet") --fetch.js--> Repo("dumped in database, files")
Google --fail to fetch--> Nochange("Not built")
Repo --compile.js--> Built("Generated HTML&CSS")
Repo --fail to compile--> Nochange
Built --> Github("Github Pages")
```

Remember to put Google API tokens and Github tokens in Travis environment variables, not in plain text anywhere in the repository.

