const properties = PropertiesService.getScriptProperties().getProperties();
const geminiApiKey = properties['GOOGLE_API_KEY'];
const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro-latest:generateContent?key=${geminiApiKey}`;
const geminiProVisionEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro-vision-latest:generateContent?key=${geminiApiKey}`;

/* Example Use:
  const prompt = "The best thing since sliced bread is";
  const output = callGemini(prompt);
  console.log(prompt, output);
*/
function callGemini(prompt, temperature=0) {
  const payload = {
    "contents": [
      {
        "parts": [
          {
            "text": prompt
          },
        ]
      }
    ], 
    "generationConfig":  {
      "temperature": temperature,
    },
  };

  const options = { 
    'method' : 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(geminiEndpoint, options);
  const data = JSON.parse(response);
  const content = data["candidates"][0]["content"]["parts"][0]["text"];
  return content;
}


/* Example Use:
  const prompt = "Provide a fun fact about this object.";
  const image = UrlFetchApp.fetch('https://storage.googleapis.com/generativeai-downloads/images/instrument.jpg').getBlob();
  const output = callGeminiProVision(prompt, image);
  console.log(prompt, output);
*/
function callGeminiProVision(prompt, image, temperature=0) {
  const imageData = Utilities.base64Encode(image.getAs('image/png').getBytes());

  const payload = {
    "contents": [
      {
        "parts": [
          {
            "text": prompt
          },
          {
            "inlineData": {
              "mimeType": "image/png",
              "data": imageData
            }
          }          
        ]
      }
    ], 
    "generationConfig":  {
      "temperature": temperature,
    },
  };

  const options = { 
    'method' : 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(geminiProVisionEndpoint, options);
  const data = JSON.parse(response);
  const content = data["candidates"][0]["content"]["parts"][0]["text"];
  return content;
}


/* Example Use: Asking the Gemini Tools to return you a JSON format.
function testGeminiTools() {
  const prompt = "Tell me how many days there are left in this month.";
  const tools = {
    "function_declarations": [
      {
        "name": "datetime",
        "description": "Returns the current date and time as a formatted string.",
        "parameters": {
          "type": "string"
        }
      }
    ]
  };
  const output = callGeminiWithTools(prompt, tools);
  console.log(output);
}
*/


function callGeminiWithTools(prompt, tools, temperature=0) {
  const payload = {
    "contents": [
      {
        "parts": [
          {
            "text": prompt
          },
        ]
      }
    ], 
    "tools" : tools,
    "generationConfig":  {
      "temperature": temperature,
    },    
  };

  const options = { 
    'method' : 'post',
    'contentType': 'application/json',
    'payload': JSON.stringify(payload)
  };

  const response = UrlFetchApp.fetch(geminiEndpoint, options);
  const data = JSON.parse(response);
  const content = data["candidates"][0]["content"]["parts"][0]["functionCall"];
  return content;
}


function readTextFileByName(fileName) {
  // Search for the file by name
  var files = DriveApp.getFilesByName(fileName);
  
  // Check if the file exists
  if (files.hasNext()) 
  {
    var file = files.next();
    
    // Get the content of the file
    var fileContent = file.getBlob().getDataAsString();
    
    // Log the content to the console
    return fileContent;
  } 
  else {
    return 'File not found.';
  }
}


function writeTextToDocument(docId,text) {
  var doc = DocumentApp.openById(docId);
  var body = doc.getBody();
  
  // Append text to the end of the document
  body.appendParagraph(text);
  Logger.log('Text written to the document successfully.');
}


function readGoogleDocsFileByName(fileName) {
  // Search for the file by name
  var files = DriveApp.getFilesByName(fileName);
  
  // Check if the file exists
  if (files.hasNext()) 
  {
    var file = files.next();
    
    // Get the content of the file
    var fileContent = DocumentApp.openById(file.getId()).getBody().getText()
    // Log the content to the console
    return fileContent;
  } 
  else {
    return 'File not found.';
  }
}


function readGoogleDocsFileById(fileId) {
  try
   {
    var doc = DocumentApp.openById(fileId);
    var fileContent = doc.getBody().getText();
    return fileContent;
  } 
  catch (e) 
  {
    return 'File not found or cannot be opened.';
  }
}


function readGoogleDocsFileByURL(fileURL) {
  try
   {
    var doc = DocumentApp.openByUrl(fileURL);
    var fileContent = doc.getBody().getText();
    return fileContent;
  } 
  catch (e) 
  {
    return 'File not found or cannot be opened.';
  }
}


function resizeAllCells (sheet) {
  var dataRange = sheet.getDataRange();
  var firstColumn = dataRange.getColumn();
  var lastColumn = dataRange.getLastColumn();
  var firstRow = dataRange.getRow();
  var lastRow = dataRange.getLastRow();
  sheet.autoResizeColumns(firstColumn, lastColumn);
  sheet.autoResizeRows(firstRow, lastRow);
}

// Check the application status at the excel sheet: Submitted >> Review in Progress >> Successful/Unsuccessful
function sendEmail(recipient, subject, body) {
  MailApp.sendEmail(recipient, subject, body);
}


function decodeBase64ToBlob(base64String, contentType) {
  var decodedBytes = Utilities.base64Decode(base64String);
  var blob = Utilities.newBlob(decodedBytes, contentType);
  return blob;
}


function transcribeAudio(base64Audio) {
  const properties = PropertiesService.getScriptProperties().getProperties();
  const apiKey = properties['GOOGLE_API_KEY'];
  
  // Decode the base64 audio data
  var audioBlob = decodeBase64ToBlob(base64Audio, 'audio/wav'); // Adjust contentType as needed

  // Convert the blob to a base64 string for the request payload
  var audioBase64 = Utilities.base64Encode(audioBlob.getBytes());
  // Construct the request payload
  var payload = JSON.stringify({
    config: {
      languageCode: 'en-US'
    },
    audio: {
      content: audioBase64
    }
  });

  var url = 'https://speech.googleapis.com/v1p1beta1/speech:recognize?key=' + apiKey;
  var options = {
    method: 'POST',
    contentType: 'application/json',
    payload: payload
  };

  // Send the request
  var response = UrlFetchApp.fetch(url, options);
  var jsonResponse = JSON.parse(response.getContentText());

  // Log the transcription results
  if (jsonResponse.results && jsonResponse.results.length > 0) {
    var transcription = jsonResponse.results.map(result => result.alternatives[0].transcript).join('\n');
    return transcription;
  } else {
    Logger.log('No transcription results found.');
    return 'No transcription results found.';
  }
}


function getIdFromUrl(url) { 
  var result = url.match(/[-\w]{25,}/)[0];
  return result; 
  }


function generate_random_code()
{
  const result = Math.random().toString(36).substring(2,12);
  return result;
}

function educationAndSkillProcessing(applicant_id) {
  const applicantSheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4';
  const applicantSheet = SpreadsheetApp.openById(applicantSheetId).getSheetByName('Data');
  const applicantData = applicantSheet.getDataRange().getValues();
  var applicant_id_row = applicantSheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow();
  
  // Header index mapping
  const applicantHeader = applicantData[0];
  
  var applicantHeaderIndex = {};
  applicantHeader.forEach((header, index) => {
    applicantHeaderIndex[header] = index;
  });


  const education = applicantSheet.getRange(applicant_id_row, applicantHeaderIndex['Education'] + 1).getValue();
  const hardSkills = applicantSheet.getRange(applicant_id_row, applicantHeaderIndex['Hard_skills'] + 1).getValue();

  if (!education || !hardSkills) {
    console.warn(`Row ${applicant_id_row} skipped due to missing 'Education' or 'Hard_skills'.`);
    return;
  }

  let skills = [];
  const educationPrompt = `Extract information from the given string text that includes the education information of an applicant:${education} Using the format below, you MUST return a DICTIONARY that includes the university name, course, and which year the applicant started the course (do not include the month). i.e.,
  {
    university: "",
    course: "",
    startYear: ""
  }
  You are not allowed to return any code snippet, such as "json". If the value of the education is empty, the returned value can be None.`

  const skillPrompt = `Extract information from the given string text that includes a series of skills:${hardSkills} If "hardSkills" is not empty, you MUST return a JSON dictionary of one ARRAY in JSON format of all the skills mentioned in this string text, i.e.
  {
    skills: []
  }
  If the value of hardSkills prompt is empty, the returned array value can be null`

  var parsedEducation = JSON.parse(callGemini(educationPrompt));

  var parsedSkills = callGemini(skillPrompt);
  skills = JSON.parse(parsedSkills);

  var processedEducation = (education) ? [parsedEducation.university, parsedEducation.course, parsedEducation.startYear]: "";
  var processedSkills = (hardSkills) ? skills: "";

  applicantSheet.getRange(applicant_id_row, applicantHeaderIndex['Processed Education'] + 1).setValue(JSON.stringify(processedEducation));
  applicantSheet.getRange(applicant_id_row, applicantHeaderIndex['Processed Skills'] + 1).setValue(JSON.stringify(processedSkills));
}


function createDocumentInFolder(folderId, applicant_id) {
  var folder = DriveApp.getFolderById(folderId);
  var doc = DocumentApp.create(`Final Interview Feedback Forms: ${applicant_id}`);
  var fileId = doc.getId();
  var file = DriveApp.getFileById(fileId);
  folder.addFile(file);
  return doc.getUrl();
}


function setupMeeting(applicant_id, title, starttime, endtime, guests, feedbackform) {
  const applicantSheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4';
  const sheet = SpreadsheetApp.openById(applicantSheetId).getSheetByName('Data');
  const position_column = sheet.createTextFinder('Applied Position').findAll()[0].getColumn();
  var row = sheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow();
  var position = sheet.getRange(row, position_column).getValue();
  
  if (typeof starttime === 'string') starttime = new Date(starttime);
  if (typeof endtime === 'string') endtime = new Date(endtime);
  
  // Create the event with Google Meet
  const event = CalendarApp.getDefaultCalendar().createEvent(title, starttime, endtime, {
    guests: guests.join(','),
    sendInvites: true,
  });
  var eventId = event.getId().split("@")[0];
  var meetLink = Calendar.Events.get('primary', eventId).hangoutLink;
  const description = `Join the meeting with this Google Meet link: ${meetLink}`;
  event.setDescription(description);

  // Prepare email details
  const date = starttime.toDateString();
  const time = starttime.toLocaleTimeString();
  const duration = (endtime - starttime) / 60000; // duration in minutes
  //Send email to interviewee
  var recipient = guests[0];
  var subject = "Codecodile Final Stage Interview";
  var body = `Dear Applicant,\n\nWe are pleased to inform you that you have been selected for the final interview for the ${position} position at Codecodile. Below are the details for your interview:\n\nDate: ${date}\nTime: ${time}\nDuration: ${duration} minutes\nLocation: ${meetLink}\n\nPlease ensure you are available at the scheduled time. If you have any questions or need to reschedule, feel free to contact us via email.n\nBest regards,\nCodecodile HR`;
  sendEmail(recipient, subject, body)

  //Send email to interviewer
  var recipients = guests.slice(1).join(',');
  var subject = "Upcoming Interview";
  var body = `Dear Interviewers,\n\nThis is a reminder about the upcoming interview for the ${position} position. The interview details are as follows:\n\nDate: ${date}\nTime: ${time}\nDuration: ${duration} minutes\nLocation:${meetLink} \n\nPlease review the attached resume and any relevant documents before the interview. Kindly use the feedback form linked here ${feedbackform} to record your feedback. \n\nThank you for your time and support in the hiring process.\n\nBest regards,\nCodecodile HR`;
  sendEmail(recipients, subject, body)
}
