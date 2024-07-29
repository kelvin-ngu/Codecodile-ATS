const properties = PropertiesService.getScriptProperties().getProperties();
const geminiApiKey = properties['GOOGLE_API_KEY'];
const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro-latest:generateContent?key=${geminiApiKey}`;

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


//On submit button >> applicant id
function ParseCV_Data_To_Sheet(applicant_id) {
  var sheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var applicant_id_row = sheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow();
  var docs_column = sheet.createTextFinder("CV_Docs_File").findAll()[0].getColumn();
  var docs_link = sheet.getRange(applicant_id_row, docs_column).getValue();
  var docs_id = getIdFromUrl(docs_link);
  var content = readGoogleDocsFileById(docs_id);
  const prompt = `Extract section labels such as "Personal Information", "Education," "Work Experience," and other headings from the following CV text:\n\n${content} Please return the response as a dictionary. Generate more relevant section labels i.e. 
  {    
    "Name" : "relevant text",
    "Address" : "relevant text",
    "Linked link" : "relevant text",
    "Email Address" : "relevant text",
    "Contact Number" : "relevant text",
    "Education" : "relevant text",
    "Applicant Description" : "summarise the relevant text",
    "Extracurricular Activities" : "relevant text",
    "Internship/Work Experience" : "relevant text",
    "Projects/Research" : "relevant text",
    "Honors and Awards" : "Summarise the honors and awards based on the whole CV",
    "License and Certifications" : "relevant text",
    "Soft_skills" : "Summarise the soft_skills based on the whole CV",
    "Hard_skills" : "Summarise the hard_skills & technical skills based on the whole CV",
    "References" : "Relevant text"
    Please add more section labels and its corrseponding value to not missing out any important data from the CV,
  }
    The value of the dictionary can be None if there is none.
    All the relevant text must be a summarisation of the important points for the recruiter, cannot be too long otherwise it will be truncated.
  }`;
  var output = callGemini(prompt);
  Logger.log(output);
  var list_of_headers = JSON.parse(output.replace(/```(?:json|)/g, ""));
  // Open the Google Sheet by ID
  var column = 1;
  var header_row = 1;

  // Set the headers and values in the sheet
  for (const key in list_of_headers) {
    var tosearch = key;
    var tf = sheet.createTextFinder(tosearch);
    var all = tf.findAll();
    //Check whether it has cells with the relevant headers
    if (all.length>0 && all[0].getRow()==1)
    {
      var column = all[0].getColumn();
    }
    else
    {
      var last_column = sheet.getLastColumn();
      var column = last_column + 1;
    }
    sheet.getRange(header_row, column).setValue(key); // Set the header
    sheet.getRange(applicant_id_row, column).setValue(list_of_headers[key]); // Set the header
    column += 1; // Move to the next pair of header and value
  }
  //Create an application status button for the applicant
  var tf = sheet.createTextFinder("Application Status");
  var all = tf.findAll();
  //Check whether it has cells with the relevant headers
  if (all.length>0 && all[0].getRow()==1)
  {
    var status_column = all[0].getColumn();
  }
  else
  {
    var last_column = sheet.getLastColumn();
    var status_column = last_column + 1;
    sheet.getRange(header_row, status_column).setValue("Application Status");
  }

  var cell = sheet.getRange(applicant_id_row, status_column);
  var dropdownValues = ["Review in Progress", "Next Stage", "Done Recorded Interview", "Final Stage", "Successful", "Unsuccessful"];
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(dropdownValues).build();
  cell.setDataValidation(rule);
  cell.setValue("Review in Progress");

  //Create an submitted date column
  var tf = sheet.createTextFinder("Time submitted");
  var all = tf.findAll();
  //Check whether it has cells with the relevant headers
  if (all.length>0 && all[0].getRow()==1)
  {
    var timesubmitted_column = all[0].getColumn();
  }
  else
  {
    var last_column = sheet.getLastColumn();
    var timesubmitted_column = last_column + 1;
    sheet.getRange(header_row, timesubmitted_column).setValue("Time Submitted");
  }
  var cell = sheet.getRange(applicant_id_row, timesubmitted_column);
  cell.setValue(Date());

  //Send email to the recipient
  var email_column = sheet.createTextFinder("Email Address").findAll()[0].getColumn();
  var recipient = sheet.getRange(applicant_id_row, email_column).getValue();
  var position_column = sheet.createTextFinder("Applied Position").findAll()[0].getColumn();
  var position = sheet.getRange(applicant_id_row, position_column).getValue();
  var subject = "Application Submitted";
  var body = `Dear Applicant,\n\nThank you for applying for the ${position} position at Codecodile. We’ve received your application and will review it shortly. If your qualifications match our needs, we’ll be in touch with the next steps. If you have any questions, please contact us at through this email.\n\nBest regards,\nCodecodile HR`;
  sendEmail(recipient, subject, body);

  //Create last_email date column
  var tf = sheet.createTextFinder("Last Email Date");
  var all = tf.findAll();
  //Check whether it has cells with the relevant headers
  if (all.length>0 && all[0].getRow()==1)
  {
    var last_email_date_column = all[0].getColumn();
  }
  else
  {
    var last_column = sheet.getLastColumn();
    var last_email_date_column = last_column + 1;
    sheet.getRange(header_row, last_email_date_column).setValue("Last Email Date");
  }
  var cell = sheet.getRange(applicant_id_row, last_email_date_column);
  cell.setValue(Date());

  educationAndSkillProcessing(applicant_id);
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


function getIdFromUrl(url) { 
  var result = url.match(/[-\w]{25,}/)[0];
  return result; 
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

// Check the application status at the excel sheet: Submitted >> Review in Progress >> Successful/Unsuccessful
function sendEmail(recipient, subject, body) {
  MailApp.sendEmail(recipient, subject, body);
}