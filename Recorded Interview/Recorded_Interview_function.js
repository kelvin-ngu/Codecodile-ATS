function doGet() {
  return HtmlService.createHtmlOutputFromFile('Recorded_Interview');
}


function checkCodeAndGetApplicantId(code) {
  var sheet = SpreadsheetApp.openById('1ES5vAecyrSs55YXwWE3AuLyLX_5aPlq_srR8VGCLqYA').getSheetByName('Responses');
  var foundCode = sheet.createTextFinder(code).matchEntireCell(true).findAll();
  
  if (foundCode.length === 0) {
    // Code does not exist
    return { success: false, message: 'Invalid Code.' };
  } else {
    // Code exists, get the applicant ID
    var applicantidColumn = sheet.createTextFinder("Applicant ID").findAll()[0].getColumn();
    var row = foundCode[0].getRow();
    var applicantId = sheet.getRange(row, applicantidColumn).getValue();
    return { success: true, applicantId: applicantId };
  }
}


function getQuestions(applicant_id) {
  var sheet = SpreadsheetApp.openById('1ES5vAecyrSs55YXwWE3AuLyLX_5aPlq_srR8VGCLqYA').getSheetByName('Responses');
  var questions_column = sheet.createTextFinder("Questions").findAll()[0].getColumn();
  var starting_row = sheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow();
  var applicantid_column = sheet.createTextFinder(applicant_id).findAll()[0].getColumn();
  var questions = [];
  var i = 0;
  while (true)
  {
    var question = sheet.getRange(starting_row, questions_column).getValue();
    var applicant_id = sheet.getRange(starting_row, applicantid_column).getValue();
    if (!question)
    {
      break;
    }
    if (applicant_id != "")
    {
      if (i == 0)
      {
        questions.push(question);
        i += 1;
      }
      else
      {
        break;
      }
    }
    else
    {
      questions.push(question);
    }
    starting_row ++;
  }
  return questions;
}


function getQuestionsAnswers(applicant_id) {
  var sheet = SpreadsheetApp.openById('1ES5vAecyrSs55YXwWE3AuLyLX_5aPlq_srR8VGCLqYA').getSheetByName('Responses');
  var questions_column = sheet.createTextFinder("Questions").findAll()[0].getColumn();
  var answers_column = sheet.createTextFinder("Answers").findAll()[0].getColumn();
  var starting_row = sheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow();
  var applicantid_column = sheet.createTextFinder(applicant_id).findAll()[0].getColumn();
  //Get a list of questions starting from the applicant id row and continue to iterate until no questions are found or next id is met.
  var questions = [];
  var answers = [];
  var qna = []
  var i = 0;
  while (true)
  {
    var question = sheet.getRange(starting_row, questions_column).getValue();
    var answer = sheet.getRange(starting_row, answers_column).getValue();
    var applicant_id = sheet.getRange(starting_row, applicantid_column).getValue();
    if (!question)
    {
      break;
    }
    if (applicant_id != "")
    {
      if (i == 0)
      {
        questions.push(question);
        answers.push(answer);
        i += 1;
      }
      else
      {
        break;
      }
    }
    else
    {
      questions.push(question);
      answers.push(answer);
    }
    starting_row ++;
  }
  qna[0] = questions;
  qna[1] = answers;
  return qna;
}


//Associate with the applicant ID
// Associate with the applicant ID
function submitAnswer(questionIndex, audioData, applicant_id) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // Wait for up to 30 seconds for other processes to finish
    var sheet = SpreadsheetApp.openById('1ES5vAecyrSs55YXwWE3AuLyLX_5aPlq_srR8VGCLqYA').getSheetByName('Responses');
    var answers_column = sheet.createTextFinder("Answers").findAll()[0].getColumn();
    var transcription = transcribeAudio(audioData);
    var input_row = sheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow() + questionIndex;
    sheet.getRange(input_row, answers_column).setValue(transcription);
    return transcription; // Example return statement
  } 
  catch (e) 
  {
    // Handle any errors that occur during the execution
    Logger.log("Error in submitAnswer function: " + e.toString());
  } 
  finally {
    lock.releaseLock(); // Release the lock to allow other processes to continue
  }
}



//Rate the applicant answer corresponding to the answer with a rating out of 10
function rateAnswer(applicant_id)
{
  var lock = LockService.getScriptLock();
  try 
  {
    lock.waitLock(30000); // Wait for up to 30 seconds for other processes to finish
    questions = getQuestionsAnswers(applicant_id)[0];
    let answers = getQuestionsAnswers(applicant_id)[1].map(element => {
    if (element === "") {

      return "None";
    } 
    else 
    {
      return element;
    }
    });
    const prompt = `Based on the applicant' answers are ${answers} to the interview questions ${questions}, please evaluate the each answer corresponding to each question and give a feedback. Give a rating 0 (Poor answer) to 10 (Well answer).
    When judging interview answers, consider the following criteria:
    1) Relevance:
    Does the answer address the question directly?
    Is the information provided pertinent to the role or context?
    2) Clarity:
    Is the response clear and easy to understand?
    Are ideas presented in a logical and coherent manner?
    3) Detail:
    Does the candidate provide sufficient detail to support their answers?
    Are examples or specific instances included to illustrate points?
    Accuracy:
    4) Is the information provided factually correct?
    Are any technical terms or concepts used appropriately?
    5) Conciseness:
    Is the answer succinct and to the point without unnecessary information?
    Does the candidate avoid rambling or going off-topic?
    6) Insightfulness:
    Does the answer demonstrate a deep understanding of the subject?
    Are any unique or innovative perspectives offered?
    7) Communication Skills:
    Is the candidate articulate and fluent in their responses?
    Are they able to convey their ideas effectively?
    8) Problem-Solving Ability:
    Does the candidate show good problem-solving skills?
    Are they able to think critically and analytically about the question?
    9) Confidence and Professionalism:
    Does the candidate respond with confidence?
    Are they professional in their tone and mannerisms?
    10) Enthusiasm and Engagement:
    Does the candidate show enthusiasm for the role and the interview?
    Are they engaged and interested in the conversation?
    11) Alignment with Company Values:
    Does the candidate's answer reflect alignment with the company’s values and culture?
    Are they a good cultural fit based on their responses?
    12) Technical Skills (if applicable):
    Does the candidate demonstrate the necessary technical skills for the role?
    Are their technical explanations accurate and thorough?
    Behavioral Indicators:
    Does the candidate exhibit positive behavioral traits such as teamwork, leadership, and adaptability?
    Are they able to provide examples of past behaviors that align with these traits?
    13) Goal Orientation:
    Does the candidate show a clear understanding of their career goals?
    Are their goals aligned with the opportunities provided by the role?
    Please return the response as a list of dictionary. [{"Feedback" : "relevant text","Rating" : "relevant text"}]
    There must be ${answers.length} elements in the list since there are ${answers.length } questions`;
    var output = callGemini(prompt);
    Logger.log(output);
    var list_of_dictionary = JSON.parse(output.replace(/```(?:json|)/g, ""));
    // Open the Google Sheet by ID
    var sheetId = '1ES5vAecyrSs55YXwWE3AuLyLX_5aPlq_srR8VGCLqYA'; // Replace with your Google Sheet ID
    var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
    var feedback_column = sheet.createTextFinder("Feedback").findAll()[0].getColumn();
    var rating_column = sheet.createTextFinder("Rating").findAll()[0].getColumn();
    var starting_row = sheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow();

    // Set the rating and feedback in the sheet
    for (var i = 0; i < questions.length; i++) 
    {
      sheet.getRange(starting_row, feedback_column).setValue(list_of_dictionary[i]["Feedback"]); 
      sheet.getRange(starting_row, rating_column).setValue(list_of_dictionary[i]["Rating"]); 
      starting_row ++;
    }
  } 
  catch (e) 
  {
    // Handle any errors that occur during the execution
    Logger.log(e.toString());
  } 
  finally 
  {
    lock.releaseLock(); // Release the lock to allow other processes to continue
  }
}


function send_completion_email(applicant_id)
{
  //Change the status to final stage. Dropdownbox Next Stage      Final Stage
  var sheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var id_column = sheet.createTextFinder("Applicant ID").findAll()[0].getColumn();
  var status_column = sheet.createTextFinder("Application Status").findAll()[0].getColumn();
  var email_column = sheet.createTextFinder("Email Address").findAll()[0].getColumn();
  var position_column = sheet.createTextFinder("Applied Position").findAll()[0].getColumn();
  var data = sheet.getDataRange().getValues();
  if (id_column === -1) {
    throw new Error('Column not found');
  }

  for (var i = 2; i < data.length + 1; i++) 
  { 
    if (sheet.getRange(i, id_column).getValue() == applicant_id.toString()) 
    {
      var row = i; 
    }
  }
  //Return JSON Response if ID is not found (Now assume the ID must exist)
  if (!row)
  {
    throw new Error('Applicant ID not found');
  }
  sheet.getRange(row, status_column).setValue("Done Recorded Interview");
  var position = sheet.getRange(row, position_column).getValue();
  var email = sheet.getRange(row, email_column).getValue();
  // Send email to the applicant about the recorded interview completion
  var recipient = email;
  var subject = "Codecodile Recorded Interview Completion Receipt";
  var body = `Dear Applicant,\n\nThank you for completing the Recorded Interview assessment for the ${position} role at Codecodile. We will review your submission and notify you of the next steps in our recruitment process shortly.\nIf you have any questions, please feel free to reach out to us via email.\n\nBest regards,\nCodecodile HR`;
  sendEmail(recipient, subject, body);
}


function sendEmail(recipient, subject, body) {
  //var recipient = "recipient@example.com"; // Replace with the recipient's email address
  //var subject = "Subject of the email";
  // var body = "Hello,\n\nThis is a test email sent from a Google Apps Script.\n\nBest regards,\nYour Name";
  MailApp.sendEmail(recipient, subject, body);
}


function decodeBase64ToBlob(base64String, contentType) {
  var decodedBytes = Utilities.base64Decode(base64String);
  var blob = Utilities.newBlob(decodedBytes, contentType);
  return blob;
}


function transcribeAudio(base64Audio) {
  var apiKey = 'AIzaSyDVu2nSfe7Cdgq3d_vjtcE412iGTxRysiQ'; // Replace with your Google Cloud API key
  
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


const properties = PropertiesService.getScriptProperties().getProperties();
const geminiApiKey = properties['GOOGLE_API_KEY'];
const geminiEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro-latest:generateContent?key=${geminiApiKey}`;
const geminiProVisionEndpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.0-pro-vision-latest:generateContent?key=${geminiApiKey}`;

/* Example Use:
  const prompt = "The best thing since sliced bread is";
  const output = callGemini(prompt);
  console.log(prompt, output);
*/
function callGemini(prompt, temperature=0.5) {
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

