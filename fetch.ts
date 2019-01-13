import fs from "fs"
// import readline from "readline"
import { google, drive_v3 } from "googleapis"
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
const EXECS_PATH = "./database/execs.json"
const EXECS_SHEET = "1p1EhfK6oLeHLhPAiQnhMt-h1Bovf4j-Eyg5v8ZP4wME"

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
    const token = process.env.GOOGLE_TOKEN
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

async function sheetToJson<T>(
  spreadsheetId: string,
  lastCol: string,
  sheets = google.sheets({ version: "v4", auth })
) {
  await ensureAuth()
  const fetchTask = sheets.spreadsheets
    .get({ spreadsheetId, includeGridData: true })
    .then(res => res.data.sheets[0].data[0].rowData.length)
    .then(numrows =>
      sheets.spreadsheets.values.get({
        spreadsheetId,
        range: `Form Responses 1!A1:${lastCol}${numrows}`
      })
    )
    .then(
      res => {
        const rows = res.data.values
        const [headers, ...data] = rows
        const jsonData = data.map<T>(row => {
          return headers.reduce((obj, h, i) => {
            obj[h] = row[i]
            return obj
          }, {})
        })
        return jsonData
      },
      err => (console.error("The API returned an error: " + err), [] as T[])
    )
  return fetchTask
}

async function grabAllFiles(
  folderid: string,
  drive = google.drive({ version: "v3", auth })
) {
  const fileMetas = await drive.files
    .list({ q: `'${folderid}' in parents` })
    .then(res => {
      const files = res.data.files
      return files.map(({ id, name, mimeType }) => ({ id, name, mimeType }))
    })
  return Promise.all(
    fileMetas.map(f => {
      return grabAFile(f.id, f.name, drive)
    })
  )
}

function grabMeta(
  id: string,
  drive = google.drive({ version: "v3", auth })
): Promise<{ id?: string; name?: string; mimeType?: string }> {
  return (
    drive.files
      // resposeType is important, otherwise you get text junk
      .get({ fileId: id })
      .then(res => {
        return res.data
      })
  )
}

function grabAFile(
  id: string,
  name: string,
  drive = google.drive({ version: "v3", auth })
) {
  return (
    drive.files
      // resposeType is important, otherwise you get text junk
      .get({ fileId: id, alt: "media" }, { responseType: "stream" })
      .then(res => {
        const data = res.data as IncomingMessage
        const newfilename = `./files/${id}_${name}`
        data.pipe(fs.createWriteStream(newfilename))
        return { id, name: newfilename }
      })
  )
}

function ExtractID(link: string) {
  if (link.includes("https://drive.google.com/open?id="))
    return link.replace("https://drive.google.com/open?id=", "")
  return ""
}

type Dict<V = any> = { [name: string]: V }

async function main() {
  await ensureAuth()
  const drive = google.drive({ version: "v3", auth })
  const sheet = google.sheets({ version: "v4", auth })
  const [eventsJSON, picIDName] = await Promise.all([
    sheetToJson<Dict>(EVENTS_SHEET, "G", sheet),
    grabAllFiles(EVENTS_COVER_FOLDER, drive)
  ])
  eventsJSON.forEach(event => {
    const maybeid = ExtractID(event["Cover Photo"])
    if (!maybeid) throw new Error("Missing Cover photo " + event["Title"])
    const pic = picIDName.find(p => p.id === maybeid)
    if (pic) event["filename"] = pic.name
    else throw new Error("Picture not in folder " + event["Title"])
  })
  fs.writeFileSync(EVENTS_PATH, JSON.stringify(eventsJSON, null, 2))
  console.log(eventsJSON.length + " events imported")
  const execsJSON = await sheetToJson<Dict>(EXECS_SHEET, "O", sheet)
  await Promise.all(
    execsJSON.map(async ex => {
      const prefname = ex["Preferred Name"]
      if (ex["Profile Link"]) return Promise.resolve()
      else if (ex["Profile Picture"]) {
        const maybeid = ExtractID(ex["Profile Picture"])
        // missing profile pic is OK for now
        if (!maybeid) {
          console.error("Missing profile photo " + prefname)
          return
        }
        const meta = await grabMeta(maybeid, drive)
        const pic = await grabAFile(maybeid, meta.name, drive)
        if (pic) ex["filename"] = pic.name
        else throw new Error("Picture not found " + prefname)
      } else {
        console.error("Missing profile photo " + prefname)
        return Promise.resolve()
      }
    })
  )
  fs.writeFileSync(EXECS_PATH, JSON.stringify(execsJSON, null, 2))
  console.log(execsJSON.length + " execs imported")
}
main()
