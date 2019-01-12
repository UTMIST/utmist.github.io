import fs from "fs"
// import readline from "readline"
import { google } from "googleapis"
// import credentials from "./credentials.json"
import { OAuth2Client } from "google-auth-library"
import { IncomingMessage } from "http"

// If modifying these scopes, delete token.json.
// const SCOPES = [
//   "https://www.googleapis.com/auth/spreadsheets.readonly",
//   "https://www.googleapis.com/auth/drive.readonly",
//   "https://www.googleapis.com/auth/drive.metadata.readonly	"
// ]
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
// const TOKEN_PATH = "token.json"
const EVENTS_PATH = "./database/events.json"
const EVENTS_SHEET = "161OBDtJtg254iSYWk0rcDB-6wq0ixK982VCCpAx8joE"
const EVENTS_COVER_FOLDER =
  "0Bz--zsExLJ5afmx1T1djTmZqc2twRHFnWExRTmp1alp1OXJ0M1VjR0R0clRweXlIYktPU1k"

// GLOBAL oath client
let auth: OAuth2Client
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIAL)

// Load client secrets from a local file.
// Authorize a client with credentials, then populate the auth object
function ensureAuth() {
  return auth || authorize(credentials).then(a => (auth = a))
}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(creds: typeof credentials) {
  const { client_secret, client_id, redirect_uris } = creds.installed
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0]
  )
  return new Promise<OAuth2Client>(y => {
    // Check if we have previously stored a token.
    const token = process.env.GOOGLE_TOKEN as string
    oAuth2Client.setCredentials(JSON.parse(token as any))
    y(oAuth2Client)
  })
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
// function getNewToken(
//   oAuth2Client: OAuth2Client,
//   callback: (o: OAuth2Client) => void
// ) {
//   const authUrl = oAuth2Client.generateAuthUrl({
//     access_type: "offline",
//     scope: SCOPES
//   })
//   console.log("Authorize this app by visiting this url:", authUrl)
//   const rl = readline.createInterface({
//     input: process.stdin,
//     output: process.stdout
//   })
//   rl.question("Enter the code from that page here: ", code => {
//     rl.close()
//     oAuth2Client.getToken(code, (err, token) => {
//       if (err)
//         return console.error("Error while trying to retrieve access token", err)
//       oAuth2Client.setCredentials(token)
//       // Store the token to disk for later program executions
//       fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
//         if (err) console.error(err)
//         console.log("Token stored to", TOKEN_PATH)
//       })
//       callback(oAuth2Client)
//     })
//   })
// }

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function grabEvents() {
  await ensureAuth()
  const spreadsheetId = EVENTS_SHEET
  const sheets = google.sheets({ version: "v4", auth })
  const eventsJSONTask = sheets.spreadsheets
    .get({ spreadsheetId, includeGridData: true })
    .then(res => res.data.sheets[0].data[0].rowData.length)
    .then(numrows =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `Form Responses 1!A1:G${numrows}`
      })
    )
    .then(
      res => {
        const rows = res.data.values
        const [headers, ...data] = rows
        const eventData = data.map(row => {
          return headers.reduce((obj, h, i) => {
            obj[h] = row[i]
            return obj
          }, {})
        })
        return eventData
      },
      err => (console.error("The API returned an error: " + err), [])
    )
  const [eventsJSON, picIDName] = await Promise.all([
    eventsJSONTask,
    grabEventPics()
  ])
  eventsJSON.forEach(event => {
    const maybeid = event["Cover Photo"].replace(
      "https://drive.google.com/open?id=",
      ""
    )
    if (maybeid === event["Cover Photo"]) {
      console.error("not found id in " + maybeid)
      // not in the right format
      return
    }
    const pic = picIDName.find(p => p.id === maybeid)
    if (pic) event["filename"] = pic.name
    else console.error("no pic found for " + maybeid)
  })
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(eventsJSON, null, 2))
  console.log(eventsJSON.length + " events imported")
}

async function grabEventPics() {
  await ensureAuth()
  const drive = google.drive({ version: "v3", auth })
  const fileMetas = await drive.files
    .list({ q: `'${EVENTS_COVER_FOLDER}' in parents` })
    .then(res => {
      const files = res.data.files
      return files.map(({ id, name, mimeType }) => ({ id, name, mimeType }))
    })
  return Promise.all(
    fileMetas.map(f => {
      const { id, name } = f
      return (
        drive.files
          // resposeType is important, otherwise you get text junk
          .get({ fileId: id, alt: "media" }, { responseType: "stream" })
          .then(res => {
            const data = res.data as IncomingMessage
            data.pipe(fs.createWriteStream("./files/" + name))
            return { id, name }
          })
      )
    })
  )
}

grabEvents()
