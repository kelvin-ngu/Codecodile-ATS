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


//Automation
function check_and_send_status_email()
{
  var sheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var email_column = sheet.createTextFinder("Email Address").findAll()[0].getColumn();
  var last_email_date_column = sheet.createTextFinder("Last Email Date").findAll()[0].getColumn();
  var status_column = sheet.createTextFinder("Application Status").findAll()[0].getColumn();
  
  // Loop through the values
  var last_row = sheet.getLastRow();
  for (var row = 2; row < last_row + 1; row++) 
  {
    var position_column = sheet.createTextFinder("Applied Position").findAll()[0].getColumn();
    var position = sheet.getRange(row, position_column).getValue();
    var email = sheet.getRange(row, email_column).getValue();
    var last_email_date = new Date(sheet.getRange(row, last_email_date_column).getValue());
    var status = sheet.getRange(row, status_column).getValue();
    var current_date = new Date();
    var timeDifference = current_date.getTime() - last_email_date.getTime();
    var interval = 3;
    // Convert the time difference to days, hours, minutes, and seconds
    var daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    //var hoursDifference = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    //var secondsDifference = Math.floor((timeDifference % (1000 * 60)) / 1000);
    //var minutesDifference = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    if (daysDifference > interval && status == ("Review in Progress" || "Next Stage" || "Final Stage")) 
    {
      var recipient = email;
      var subject = "Application Status Update";
      var body = `Dear Applicant,\n\nThank you for your patience. We wanted to let you know that your application for the ${position} position is still under review. We will notify you as soon as we have an update. If you have any questions, please feel free to reach out.\n\nBest regards,\nCodecodile HR`;
      sendEmail(recipient, subject, body);
      sheet.getRange(row, last_email_date_column).setValue(Date());
    }
  }
}


// Need the HR to click something to call this function + change the application status
function send_successful_email(applicant_id)
{
  var sheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var status_column = sheet.createTextFinder("Application Status").findAll()[0].getColumn();
  var email_column = sheet.createTextFinder("Email Address").findAll()[0].getColumn();
  var row = sheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow();
  sheet.getRange(row, status_column).setValue("Successful");
  var position_column = sheet.createTextFinder("Applied Position").findAll()[0].getColumn();
  var position = sheet.getRange(row, position_column).getValue();
  var email = sheet.getRange(row, email_column).getValue();
  var recipient = email;
  var subject = "Congratulations! Welcome to Codecodile";
  var body = `Dear Applicant,\n\nWe are pleased to inform you that your application for the ${position} position at Codecodile has been successful.\nWe will be in touch soon with the next steps. If you have any questions in the meantime, please feel free to contact us.\nCongratulations once again!\n\nBest regards,\nCodecodile HR`;
  sendEmail(recipient, subject, body);
}


// Need the HR to click something to call this function + change the application status
function send_unsuccessful_email(applicant_id)
{
  var sheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var status_column = sheet.createTextFinder("Application Status").findAll()[0].getColumn();
  var email_column = sheet.createTextFinder("Email Address").findAll()[0].getColumn();
  var row = sheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow();
  sheet.getRange(row, status_column).setValue("Unsuccessful");
  var position_column = sheet.createTextFinder("Applied Position").findAll()[0].getColumn();
  var position = sheet.getRange(row, position_column).getValue();
  var email = sheet.getRange(row, email_column).getValue();
  console.log(email);
  var recipient = email;
  var subject = "Application Status Update";
  var body = `Dear Applicant,\n\nThank you for your interest in the ${position} position at Codecodile. After careful consideration, we regret to inform you that we will not be moving forward with your application.\nWe appreciate the time and effort you put into your application. While we have chosen to move forward with other candidates for this position, we will keep your application details on file and inform you if a suitable role matching your qualifications becomes available.\nThank you once again for your interest in Codecodile.\n\nBest regards,\nCodecodile HR`;
  sendEmail(recipient, subject, body);
}

// Input: Applicant Resume Text, matching_percentage (only the available position above this matching_percentage will be shown)
// Output: {[Position: MatchingPercentage]}
function jobs_matching(fileId, matching_threshold)
{
  var content = readGoogleDocsFileById(fileId);
  var sheetId = '11F5VjNJ4yMjLjRQk57l25WFJgggH7cCclD9-_a1ykug'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var position_column = sheet.createTextFinder("Position").findAll()[0].getColumn();
  var availability_column = sheet.createTextFinder("Availability").findAll()[0].getColumn();
  var last_row = sheet.getLastRow();
  var matching_positions = [];
  for (var row = 2; row < last_row + 1; row++) 
  {
    if(sheet.getRange(row, availability_column).getValue() == "Open")
    {
      var skills = [];
      var skills_column = sheet.createTextFinder("Skills").findAll()[0].getColumn();
      while (true) {
        var skill = sheet.getRange(row, skills_column).getValue();
        if (!skill) {
          break;
        }
        skills.push(skill);
        skills_column++;
      }
      const prompt = ` The job skills needed for the job are ${skills}. Please search from the applicant's Resume to see whether the applicant has those job skills. The resume text:\n\n${content}. Please return Yes if the skill is found in the resume, otherwise return No. The response must be only a dictionary. Do not return me any text. i.e.  The job skills ["Creativitiy", "Problem-Solving", "Django"] 
      {    
        "Creativitiy" : "Yes",
        "Problem-Solving" : "Yes",
        "Django" : "No",
      }
      `;
      var output = callGemini(prompt);
      Logger.log(output);
      var skills_dic = JSON.parse(output.replace(/```(?:json|)/g, ""));
      var no_of_yes = 0;
      for (var key in skills_dic) {
        if (skills_dic.hasOwnProperty(key) && skills_dic[key] == "Yes") 
        {
          no_of_yes++;
        }
      }
      var matching_percentage = no_of_yes*100/Object.keys(skills_dic).length;
      if (matching_percentage >= matching_threshold)
      {
        var position = sheet.getRange(row, position_column).getValue();
        matching_positions.push(position);
      }
    }
  }
  return matching_positions;
}



//Send email of availabe-position to the unsuccessful applicants
function send_jobs_position_email()
{
  var sheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var email_column = sheet.createTextFinder("Email Address").findAll()[0].getColumn();
  var last_email_date_column = sheet.createTextFinder("Last Email Date").findAll()[0].getColumn();
  var status_column = sheet.createTextFinder("Application Status").findAll()[0].getColumn();
  var docs_column = sheet.createTextFinder("CV_Docs_File").findAll()[0].getColumn();
  // Loop through the values
  var last_row = sheet.getLastRow();
  for (var row = 2; row < last_row + 1; row++) 
  {
    var email = sheet.getRange(row, email_column).getValue();
    var last_email_date = new Date(sheet.getRange(row, last_email_date_column).getValue());
    var status = sheet.getRange(row, status_column).getValue();
    var docId = getIdFromUrl(sheet.getRange(row, docs_column).getValue());
    var current_date = new Date();
    var timeDifference = current_date.getTime() - last_email_date.getTime();
    var interval = 1;
    // Convert the time difference to days, hours, minutes, and seconds
    var daysDifference = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    //var hoursDifference = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    //var secondsDifference = Math.floor((timeDifference % (1000 * 60)) / 1000);
    //var minutesDifference = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));


    if (daysDifference > interval && status == "Unsuccessful") 
    {
      var matching_percentage = 50;
      var matched_positions = jobs_matching(docId, matching_percentage);
      matched_positions = matched_positions.join('\n');
      var position_column = sheet.createTextFinder("Applied Position").findAll()[0].getColumn();
      var position = sheet.getRange(row, position_column).getValue();
      var recipient = email;
      var subject = "New Opportunities at Codecodile";
      var body = `Dear Applicant,\n\nThank you for your interest in working at Codecodile. Although we have chosen to move forward with other candidates for the ${position} position, we have identified other opportunities that may be a great fit for your qualifications and experience.\nPlease find below details of the positions currently available:\n${matched_positions}\n\nIf any of these positions interest you, please feel free to apply directly through our website or reach out to us for more information.\nWe appreciate your continued interest in our organization and look forward to the possibility of working with you.\n\nBest regards,\nNathan`;
      sendEmail(recipient, subject, body);
      sheet.getRange(row, last_email_date_column).setValue(Date());
    }
    
  }
}


function next_stage_button(applicant_id)
{
  var sheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var id_column = sheet.createTextFinder("Applicant ID").findAll()[0].getColumn();
  var docs_column = sheet.createTextFinder("CV_Docs_File").findAll()[0].getColumn();
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
  sheet.getRange(row, status_column).setValue("Next Stage");
  var email = sheet.getRange(row, email_column).getValue();
  var position = sheet.getRange(row, position_column).getValue();
  var code = generate_random_code();
  // Send email to the applicant about recorded interview assessment
  var recipient = email;
  var subject = "Codecodile Recorded Interview Assessment";
  var body = `Dear Applicant,\n\nYou have been selected to complete a recorded video interview assessment for the ${position} at Codecodile\n\nInstructions:\n1)Access the Test: Click the link https://script.google.com/macros/s/AKfycbyZZmk2WXxBwxDuyEaMsfQ-iNNxJ385G7f9_kWLiQBmz1tdmucxcH_MRp5effCT3XK7/exec and input the code: ${code}\n2) Prepare: Find a quiet space and ensure your tech is working.\nDeadline: Complete by 16/10/2024. Contact us if you need an extension.If you have any questions, please reach out to us.\n\nBest regards,\nCodecodile HR`;
  sendEmail(recipient, subject, body);

  var docs_link = sheet.getRange(row, docs_column).getValue();
  var content = readGoogleDocsFileById(getIdFromUrl(docs_link));
  var no_of_interview_questions = 5;
  const prompt = ` Can you generate ${no_of_interview_questions} interview questions from the resume of the applicant. The resume text:\n\n${content}. Please return an array of questions. i.e.  ["Question 1", "Question 2", "Question 3", etc..] This must be in JSON format`;
  var output = callGemini(prompt);
  var list_of_questions = JSON.parse(output.replace(/```(?:json|)/g, ""));


  var sheetId = '1ES5vAecyrSs55YXwWE3AuLyLX_5aPlq_srR8VGCLqYA'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var last_row = sheet.getLastRow();
  var id_column = sheet.createTextFinder("Applicant ID").findAll()[0].getColumn();
  var code_column = sheet.createTextFinder("Code").findAll()[0].getColumn();
  var questions_column = sheet.createTextFinder("Questions").findAll()[0].getColumn();
  sheet.getRange(last_row + 1, id_column).setValue(applicant_id);
  sheet.getRange(last_row + 1, code_column).setValue(code);
  var starting_row = last_row + 1;
  for (var i = 0; i < no_of_interview_questions; i++) 
  {
    sheet.getRange(starting_row, questions_column).setValue(list_of_questions['questions'][i]);
    starting_row ++;
  }
}


function parse_final_interview_applicant_data(applicant_id)
{
  var sheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var id_column = sheet.createTextFinder("Applicant ID").findAll()[0].getColumn();
  var name_column = sheet.createTextFinder("Name").findAll()[0].getColumn();
  var position_column = sheet.createTextFinder("Applied Position").findAll()[0].getColumn();
  var email_column = sheet.createTextFinder("Email Address").findAll()[0].getColumn();
  var status_column = sheet.createTextFinder("Application Status").findAll()[0].getColumn();
  var row = sheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow();
  var name = sheet.getRange(row, name_column).getValue();
  var position = sheet.getRange(row, position_column).getValue();
  var email = sheet.getRange(row, email_column).getValue();
  sheet.getRange(row, status_column).setValue("Final Stage");

  var sheetId = '1X5qdNS6Yl1nnLciYCkZRsOdVg316PFhuU-GdDoqXYe0'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var last_row = sheet.getLastRow();
  var id_column = sheet.createTextFinder("Applicant ID").findAll()[0].getColumn();
  var name_column = sheet.createTextFinder("Name").findAll()[0].getColumn();
  var position_column = sheet.createTextFinder("Applied Position").findAll()[0].getColumn();
  var email_column = sheet.createTextFinder("Email Address").findAll()[0].getColumn();
  var status_column = sheet.createTextFinder("Interview Status").findAll()[0].getColumn();
  var feedback_column = sheet.createTextFinder("Feedback").findAll()[0].getColumn();
  var last_row = sheet.getLastRow();
  var feedback_form =   createDocumentInFolder('194-crl_3VmNmByQiVPUIH9aATCXKEPyN', applicant_id);
  sheet.getRange(last_row + 1, id_column).setValue(applicant_id);
  sheet.getRange(last_row + 1, name_column).setValue(name);
  sheet.getRange(last_row + 1, position_column).setValue(position);
  sheet.getRange(last_row + 1, email_column).setValue(email);
  sheet.getRange(last_row + 1, feedback_column).setValue(feedback_form);
  var cell = sheet.getRange(last_row + 1, status_column);
  var dropdownValues = ["Not Scheduled", "In Progress", "Finished"];
  var rule = SpreadsheetApp.newDataValidation().requireValueInList(dropdownValues).build();
  cell.setDataValidation(rule);
  cell.setValue("Not Scheduled");
}


function getFinalInterviewApplicants() {
  var sheetId = '1X5qdNS6Yl1nnLciYCkZRsOdVg316PFhuU-GdDoqXYe0'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var lastRow = sheet.getLastRow();
  var idColumn = sheet.createTextFinder("Applicant ID").findAll()[0].getColumn();
  var nameColumn = sheet.createTextFinder("Name").findAll()[0].getColumn();
  var positionColumn = sheet.createTextFinder("Applied Position").findAll()[0].getColumn();
  var emailColumn = sheet.createTextFinder("Email Address").findAll()[0].getColumn();
  var statusColumn = sheet.createTextFinder("Interview Status").findAll()[0].getColumn();
  var feedbackColumn = sheet.createTextFinder("Feedback").findAll()[0].getColumn();
  
  var applicants = [];

  for (var row = 2; row <= lastRow; row++) {
    var id = sheet.getRange(row, idColumn).getValue();
    var name = sheet.getRange(row, nameColumn).getValue();
    var position = sheet.getRange(row, positionColumn).getValue();
    var email = sheet.getRange(row, emailColumn).getValue();
    var status = sheet.getRange(row, statusColumn).getValue();
    var feedback = sheet.getRange(row, feedbackColumn).getValue();
    applicants.push({
      "id": id,
      "name": name,
      "position": position,
      "feedback": feedback,
      "email": email,
      "status": status
    });
  }
  return applicants;
}


function updateFinalApplicantDetails(applicant_id, startdatetime, enddatetime, interviewer_email)
{
  if (typeof startdatetime === 'string') startdatetime = new Date(startdatetime);
  if (typeof enddatetime === 'string') enddatetime = new Date(enddatetime);
  var sheetId = '1X5qdNS6Yl1nnLciYCkZRsOdVg316PFhuU-GdDoqXYe0'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var row = sheet.createTextFinder(applicant_id).matchEntireCell(true).findAll()[0].getRow();
  var statusColumn = sheet.createTextFinder("Interview Status").findAll()[0].getColumn();
  var startdatetimeColumn = sheet.createTextFinder("Meeting Start DateTime").findAll()[0].getColumn();
  var enddatetimeColumn = sheet.createTextFinder("Meeting End DateTime").findAll()[0].getColumn();
  var interviewer_emailColumn = sheet.createTextFinder("Interviewer Email").findAll()[0].getColumn();
  // Convert the list of emails to a single string separated by commas
  if (interviewer_email.length > 1)
  {
  var interviewer_emails_str = interviewer_email.slice(1).join(',');
  }
  else
  {
  var interviewer_emails_str = '';
  }
  sheet.getRange(row,statusColumn).setValue("In Progress");
  sheet.getRange(row,startdatetimeColumn).setValue(startdatetime);
  sheet.getRange(row,enddatetimeColumn).setValue(enddatetime);
  sheet.getRange(row,interviewer_emailColumn).setValue(interviewer_emails_str);
}

function triggerDoneInterview()
{
  var sheetId = '1X5qdNS6Yl1nnLciYCkZRsOdVg316PFhuU-GdDoqXYe0'; // Replace with your Google Sheet ID
  var sheet = SpreadsheetApp.openById(sheetId).getActiveSheet();
  var status_column = sheet.createTextFinder("Interview Status").findAll()[0].getColumn();
  var enddatetime_column = sheet.createTextFinder("Meeting End DateTime").findAll()[0].getColumn();
  // Loop through the values
  var last_row = sheet.getLastRow();
  for (var row = 2; row < last_row + 1; row++) 
  {
    var status = sheet.getRange(row, status_column).getValue();
    var enddatetime = new Date(sheet.getRange(row, enddatetime_column).getValue());
    var current_datetime = new Date();
    if (current_datetime.getTime() > enddatetime.getTime() && status == ("In Progress")) 
    {
      sheet.getRange(row, status_column).setValue("Finished");
    }
  }
}


function getRecordedInterviewResponses() {
  try {
    var statusSheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4';
    var responseSheetId = '1ES5vAecyrSs55YXwWE3AuLyLX_5aPlq_srR8VGCLqYA';

    var statusSheet = SpreadsheetApp.openById(statusSheetId).getSheetByName('Data');
    var statusData = statusSheet.getDataRange().getValues();
    // Header index mapping
    const statusDataHeader = statusData[0];
    var statusDataHeaderIndex = {};
    statusDataHeader.forEach((header, index) => {
      statusDataHeaderIndex[header] = index;
    });
    // Logger.log('Status Data: ' + JSON.stringify(statusData));


    var responseSheet = SpreadsheetApp.openById(responseSheetId).getSheetByName('Responses'); 
    var responseData = responseSheet.getDataRange().getValues();
    // Header index mapping
    const responseDataHeader = responseData[0];
    var responseDataHeaderIndex = {};
    responseDataHeader.forEach((header, index) => {
      responseDataHeaderIndex[header] = index;
      // Logger.log('Response Data: ' + JSON.stringify(responseDataHeaderIndex[header]));
    });
    // Logger.log('Response Data: ' + JSON.stringify(responseData));

    // Create a map to store questions, answers, feedback, and ratings
    var responsesMap = {};
    var currentApplicantID = null;

    responseData.slice(1).forEach(row => {
      var applicantID = row[responseDataHeaderIndex['Applicant ID']];

      if (applicantID) {
        currentApplicantID = applicantID;
        if (!responsesMap[applicantID]) {
          responsesMap[applicantID] = {
            questions: [],
            answers: [],
            feedback: [],
            rating: []
          };
        }
      }

      if (currentApplicantID) {
        responsesMap[currentApplicantID].questions.push(row[responseDataHeaderIndex['Questions']]);
        // Logger.log('Response applicant question: ' + JSON.stringify(responsesMap[currentApplicantID].questions));
        responsesMap[currentApplicantID].answers.push(row[responseDataHeaderIndex['Answers']]);
        responsesMap[currentApplicantID].feedback.push(row[responseDataHeaderIndex['Feedback']]);
        responsesMap[currentApplicantID].rating.push(row[responseDataHeaderIndex['Rating']]);
      }
    });
    


    return statusData.slice(1).map(row => {
      var applicantID = row[statusDataHeaderIndex['Applicant ID']];
      var name = row[statusDataHeaderIndex['Name']];
      var applicationStatus = row[statusDataHeaderIndex['Application Status']];
      // Logger.log('Response applicantID: ' + JSON.stringify(applicantID));
      // Logger.log('Response applicant name: ' + JSON.stringify(name));
      // Logger.log('Response applicant status: ' + JSON.stringify(applicationStatus));
      // Logger.log('Response applicantID id: ' + JSON.stringify(row[responseDataHeaderIndex['Applicant ID']]));

      if (applicationStatus === 'Done Recorded Interview') {
        var responseRow = responseData.find(responseRow => responseRow[responseDataHeaderIndex['Applicant ID']] === applicantID);
        // Logger.log('Response applicantID respone: ' + JSON.stringify(responseRow));

        if (responseRow !=null && applicationStatus == 'Done Recorded Interview') {
          var candidateData = {
            id: applicantID,
            name: name,
            applicationStatus: applicationStatus,
            questions: responsesMap[applicantID] ? responsesMap[applicantID].questions : [],
            answers: responsesMap[applicantID] ? responsesMap[applicantID].answers : [],
            feedback: responsesMap[applicantID] ? responsesMap[applicantID].feedback : [],
            rating: responsesMap[applicantID] ? responsesMap[applicantID].rating : []
          };
          Logger.log('candidateData Data: ' + JSON.stringify(candidateData));
          return candidateData;
        }
      }
    });
  }catch (error) {
    Logger.log('Error: ' + error.message);
  }
}

function updateApplicantStatus(applicantId, status) {
    var statusSheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4';
    var statusSheet = SpreadsheetApp.openById(statusSheetId).getSheetByName('Data');
    var statusData = statusSheet.getDataRange().getValues();
    
    // Find the index of the headers
    var headerIndex = statusData[0].indexOf('Applicant ID');
    var statusIndex = statusData[0].indexOf('Application Status');
    
    // Find the row with the matching applicant ID and update the status
    for (var i = 1; i < statusData.length; i++) {
        if (statusData[i][headerIndex] == applicantId) {
            statusSheet.getRange(i + 1, statusIndex + 1).setValue(status);
            break;
        }
    }
}
