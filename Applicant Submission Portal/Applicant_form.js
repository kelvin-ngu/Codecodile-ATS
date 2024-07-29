const CV_FOLDER_ID = '1MmiwAj-HDXqT46lGTxD2_E0Tx0B_CiI1';
const Applicant_Data_File_ID = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4';
const CV_TEXT_FOLDER_ID = '1W2ti9TDLE6MvVFhbNQcFy94UD_cqKBsF';
const Doc_Folder_ID = '1jMYMJwVFpF99wUHnctz2lMTkEdDxzvCu';

function doGet(e) {
   return HtmlService.createHtmlOutputFromFile('ApplicantForm.html');
 }


async function updateApplicantRow(
  urls = {

  }) {
    var sheet = SpreadsheetApp.openById('1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4').getSheetByName('Data');
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var headerIndexMap = {};

    // Map headers to their respective indices
    headers.forEach((header, index) => {
        if (['CV_PDF_File', 'Text_File', 'CV_Docs_File', 'Applied Position', 'Applicant ID'].includes(header)) {
            headerIndexMap[header] = index;
        }
    });

    // Find the last row and update the corresponding columns
    var lastRow = sheet.getLastRow();
    var newRow = lastRow;
    var applicantID = newRow.toString();

    sheet.getRange(lastRow + 1, headerIndexMap['CV_PDF_File'] + 1).setValue(urls.pdfFileURL);
    sheet.getRange(lastRow + 1, headerIndexMap['Text_File'] + 1).setValue(urls.textFileURL);
    sheet.getRange(lastRow + 1, headerIndexMap['CV_Docs_File'] + 1).setValue(urls.docFileURL);
    sheet.getRange(lastRow + 1, headerIndexMap['Applied Position'] + 1).setValue(urls.selectedPosition);
    sheet.getRange(lastRow + 1, headerIndexMap['Applicant ID'] + 1).setValue(applicantID);
    Logger.log(applicantID);
    ParseCV_Data_To_Sheet(applicantID);
}

function checkPDFPageCount(pdfContent) {
  try {
    // Ensure the input is a valid base64 encoded string
    if (typeof pdfContent !== 'string' || !pdfContent) {
      throw new Error('Invalid input: Expected a base64 encoded string.');
    }

    var base64String = pdfContent.replace('data:application/pdf;base64,', '');
    var pdfBytes = Utilities.base64Decode(base64String);

    var pdfString = '';
    for (var i = 0; i < pdfBytes.length; i++) {
      pdfString += String.fromCharCode(pdfBytes[i]);
    }

    var pageCount = (pdfString.match(/\/Type[\s]*\/Page[^s]/g) || []).length;

    if (pageCount > 2) {
      return 'PDF is more than 2 pages. Please upload a PDF that is 2 pages or less.';
    } else {
      return 'OK';
    }
  } catch (e) {
    Logger.log(e);
    return e;
  }
}

async function uploadToDrive(pdfContent, fileName, selectedPosition) {
  try {
    var urls = [];
    var folder = DriveApp.getFolderById(CV_FOLDER_ID);
    var base64String = pdfContent.replace('data:application/pdf;base64,', '');
    var blob = Utilities.newBlob(Utilities.base64Decode(base64String), 'application/pdf', fileName);
    Logger.log(blob);
    var file = folder.createFile(blob);
    var fileURL = file.getUrl();

    var pdfFileId = getFileIdFromUrl(fileURL);

    Logger.log(pdfFileId);

    urls.push(fileURL);

    var docAndTextUrls = await convertPDFToTextAndDoc(pdfFileId);

    // Now we have the URLs, let's update the applicant's row
    await updateApplicantRow({
      pdfFileURL: fileURL,
      textFileURL: docAndTextUrls[0], // Assuming this is the text file URL
      docFileURL: docAndTextUrls[1], // Assuming this is the doc file URL
      selectedPosition: selectedPosition
    });

    return 'OK';
  } catch (e) {
    return 'Error: ' + e.toString();
  }
}
	// Exception: The parameters (String) don't match the method signature for DriveApp.Folder.addFile.

function getFileIdFromUrl(url) {
  var matches = url.match(/[-\w]{25,}/);
  return (matches && matches[0]) ? matches[0] : null;
}

async function convertPDFToTextAndDoc(fileId, language) {
  language = language || 'en'; // English

  // Read the PDF file in Google Drive
  const pdfDocument = DriveApp.getFileById(fileId);
  var urls = [];

  Logger.log(pdfDocument);
  // Use OCR to convert PDF to a temporary Google Document
  const {id, title} = Drive.Files.insert({
    title: pdfDocument.getName().replace(/\.pdf$/, ''),
    mimeType: pdfDocument.getMimeType() || 'application/pdf',
  }, pdfDocument.getBlob(), {
    ocr: true,
    ocrLanguage: language,
    fields: 'id,title',
  });

  // Extract text from the Google Document
  const textContent = DocumentApp.openById(id).getBody().getText();


  const docDocument = DriveApp.getFileById(id);
  const docFolder = DriveApp.getFolderById(Doc_Folder_ID);
  docFolder.addFile(docDocument);


  Logger.log(docDocument.getUrl());

  /*
  // Delete the temporary Google Document
  DriveApp.getFileById(id).setTrashed(true);
  */

  // Save the text content to another text file in Google Drive
  const cvTextFolder = DriveApp.getFolderById(CV_TEXT_FOLDER_ID);
  const textFile = cvTextFolder.createFile(`${title}.txt`, textContent, 'text/plain');

  urls.push(textFile.getUrl());
  urls.push(docDocument.getUrl());

  return urls;
}

function getPositions() {
  var sheet = SpreadsheetApp.openById('11F5VjNJ4yMjLjRQk57l25WFJgggH7cCclD9-_a1ykug').getSheetByName('Sheet1');
  var data = sheet.getDataRange().getValues();
  var headers = data[0];
  var headerIndexMap = {};
  var positions = [];

  // Map headers to their respective indices
  headers.forEach((header, index) => {
      if (['Position', 'Availability'].includes(header)) {
          headerIndexMap[header] = index;
      }
  });

  for (var i = 1; i < data.length; i++) { // Start from 1 to skip header row
    if (data[i][headerIndexMap['Availability']] === 'Open') {
      positions.push(data[i][headerIndexMap['Position']]);
    }
  }

  return positions;
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
    var position = sheet.getRange(applicant_id_row, position_column).getValue();
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


function testing () {
    updateApplicantRow({
      pdfFileURL: "https://developers.google.com/apps-script/guides/html/templates#index.html_3",
      textFileURL: "https://developers.google.com/apps-script/guides/html/templates#index.html_3", // Assuming this is the text file URL
      docFileURL: "https://docs.google.com/document/d/1LnHWgxQWDeoKKwS0IREXX1SP2F8FCH0iWoto4aVZhyk/edit?usp=drivesdk" // Assuming this is the doc file URL
    });
}
