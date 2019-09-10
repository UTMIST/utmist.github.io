"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
// import readline from "readline"
const googleapis_1 = require("googleapis");
const https_1 = __importDefault(require("https"));
const papaparse_1 = require("papaparse");
function parseCSVUrl(url, config) {
    return new Promise((y, n) => {
        const csvchunks = [];
        https_1.default.get(url, res => {
            res.on("data", csvchunks.push.bind(csvchunks));
            res.on("end", () => {
                papaparse_1.parse(csvchunks.join(""), {
                    ...config,
                    complete: y,
                    error: n,
                });
            });
        });
    });
}
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
const EVENTS_PATH = "./database/events.json";
// const EVENTS_SHEET = "19-UyOGsQvPaIGq3llYtmCP4DVu_tjJd650xJmWF6dXw"
const EVENTS_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vS5keR7BMaKkzAfiiF4a2sHQETe4dVTZrZ4ZSY19gAHx6B0bCh2e2re1NCXcn00taXK96MqrUmbToXf/pub?output=csv";
const EVENTS_COVER_FOLDER = "0Bz--zsExLJ5afmx1T1djTmZqc2twRHFnWExRTmp1alp1OXJ0M1VjR0R0clRweXlIYktPU1k";
const EXECS_PATH = "./database/execs.json";
// const EXECS_SHEET = "1p1EhfK6oLeHLhPAiQnhMt-h1Bovf4j-Eyg5v8ZP4wME"
const EXECS_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vSOWbJy69bxz8B2-mYU7q19vwCV75n6ae4ygE-LPrz1hdliN3yYlWOtAs40hsMIVc0LxzVRiQrBt8mG/pub?gid=1840609497&single=true&output=csv";
const RECRUIT_PATH = "./database/recruit.json";
const RECRUIT_SHEET_URL = "https://docs.google.com/spreadsheets/d/e/2PACX-1vTASFPoEztC1aJkH2wZqEMI8dOZhPMjZOc6NN6NT0VUN0Aa3naB63UPBQBbeUxEFEMxx1-WsrGaYK6Q/pub?gid=1382893314&single=true&output=csv";
// GLOBAL oath client
let auth;
const credentials = JSON.parse(process.env.GOOGLE_CREDENTIAL);
// Load client secrets from a local file.
// Authorize a client with credentials, then populate the auth object
function ensureAuth() {
    return auth || authorize(credentials).then(a => (auth = a));
}
/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(creds) {
    const { client_secret, client_id, redirect_uris } = creds.installed;
    const oAuth2Client = new googleapis_1.google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    return new Promise(y => {
        // Check if we have previously stored a token.
        const token = process.env.GOOGLE_TOKEN;
        oAuth2Client.setCredentials(JSON.parse(token));
        y(oAuth2Client);
    });
}
function csvToJson(rows) {
    const [headers, ...data] = rows;
    const jsonData = data.map(row => {
        return headers.reduce((obj, h, i) => {
            obj[h] = row[i];
            return obj;
        }, {});
    });
    return jsonData;
}
function grabMeta(id, drive) {
    return (drive.files
        // resposeType is important, otherwise you get text junk
        .get({ fileId: id })
        .then(({ data }) => data));
}
const filenames = fs_1.default.readdirSync(__dirname + "/files/");
async function grabAFile(id, drive) {
    if (filenames.some(f => f.startsWith(id)))
        return "./files/" + filenames.find(f => f.startsWith(id));
    const { name } = await grabMeta(id, drive);
    return (drive.files
        // resposeType is important, otherwise you get text junk
        .get({ fileId: id, alt: "media" }, { responseType: "stream" })
        .then(res => {
        const data = res.data;
        const filepath = `./files/${id}_${name}`;
        data.pipe(fs_1.default.createWriteStream(filepath));
        return filepath;
    }));
}
function ExtractID(link) {
    if (link.includes("https://drive.google.com/open?id="))
        return link.replace("https://drive.google.com/open?id=", "");
    if (link.includes("https://drive.google.com/file/d/"))
        return link.split("/")[5];
    return "";
}
async function main() {
    await ensureAuth();
    const drive = googleapis_1.google.drive({ version: "v3", auth });
    // const sheet = google.sheets({ version: "v4", auth })
    const eventsSheet = await parseCSVUrl(EVENTS_SHEET_URL);
    const eventsJson = csvToJson(eventsSheet.data);
    for (const ev of eventsJson) {
        if (ev["Image"]) {
            console.log("grabbing image for", ev["Title"]);
            const filepath = await grabAFile(ExtractID(ev["Image"]), drive);
            ev.filepath = filepath;
        }
    }
    console.log(eventsJson.length, "events imported");
    fs_1.default.writeFileSync(EVENTS_PATH, JSON.stringify(eventsJson));
    const execsSheet = await parseCSVUrl(EXECS_SHEET_URL);
    const execsJson = csvToJson(execsSheet.data);
    for (const ex of execsJson) {
        if (ExtractID(ex["Profile Link"])) {
            ex["Profile Picture"] = ex["Profile Link"];
            ex["Profile Link"] = "";
        }
        if (ex["Profile Picture"]) {
            console.log("grabbing Profile Picture for", ex["First Name"]);
            const filepath = await grabAFile(ExtractID(ex["Profile Picture"]), drive);
            ex.filepath = filepath;
        }
        // some ppl put google drive link as a profile link...
    }
    fs_1.default.writeFileSync(EXECS_PATH, JSON.stringify(execsJson));
    console.log(execsJson.length, "execs imported");
    const recruitSheet = await parseCSVUrl(RECRUIT_SHEET_URL);
    const recruitJson = csvToJson(recruitSheet.data);
    for (const rc of recruitJson)
        rc["Spots Remaining"] = parseInt(rc["Spots Remaining"]);
    console.log(recruitJson.length, "recruitments imported");
    fs_1.default.writeFileSync(RECRUIT_PATH, JSON.stringify(recruitJson));
}
main();
