function doGet(request) {
  return HtmlService.createTemplateFromFile('Main')
      .evaluate();
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function getApplicants() {
  const applicantSheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4';
  const applicantSheet = SpreadsheetApp.openById(applicantSheetId).getSheetByName('Data');
  const applicantData = applicantSheet.getDataRange().getValues();
  
  // Header index mapping
  const applicantHeader = applicantData[0];
  var applicantHeaderIndex = {};
  applicantHeader.forEach((header, index) => {
    applicantHeaderIndex[header] = index;
  });
  // hello
  return applicantData.filter(row => row[applicantHeaderIndex['Application Status']] === 'Review in Progress').map(row => {
    const position = row[applicantHeaderIndex['Applied Position']];
    const education = (row[applicantHeaderIndex['Processed Education']]) ? JSON.parse(row[applicantHeaderIndex['Processed Education']]): "";
    const hardSkills = row[applicantHeaderIndex['Processed Skills']];
    const cv_pdf_url = row[applicantHeaderIndex['CV_PDF_File']];

    return {
      id: row[applicantHeaderIndex['Applicant ID']],
      name: row[applicantHeaderIndex['Name']],
      status: row[applicantHeaderIndex['Application Status']],
      position: position,
      education: (education !== "") ? education : "",
      skills: (hardSkills !== "") ? hardSkills : "",
      cv: cv_pdf_url
    };
  });
}

function getAvailablePosition () {
  const positionFilterSheetId = '11F5VjNJ4yMjLjRQk57l25WFJgggH7cCclD9-_a1ykug';
  const positionFilterSheet = SpreadsheetApp.openById(positionFilterSheetId).getSheetByName('Sheet1');
  const positionFilterData = positionFilterSheet.getDataRange().getValues();
  
  const positionFilterHeader = positionFilterData[0];
  var positionFilterHeaderIndex = {};
  positionFilterHeader.forEach((header, index) => {
    positionFilterHeaderIndex[header] = index;
  });

  return positionFilterData.slice(1).map(row => {
    const position = row[positionFilterHeaderIndex['Position']];
    const availability = row[positionFilterHeaderIndex['Availability']];
    const skills = row[positionFilterHeaderIndex['Skills']].split(",");
    return {
      position: position,
      availability: availability,
      skills: skills
    };
  });
}

function getApplicantsByStatus() {
  const applicantSheetId = '1MtHdx5cdxcC1_keB5ZOm7sm4gEejGvThXJ0rwSseNL4';
  const applicantSheet = SpreadsheetApp.openById(applicantSheetId).getSheetByName('Data');
  const applicantData = applicantSheet.getDataRange().getValues();
  const headers = applicantData[0];
  var headerIndexMap = {};

  // Map headers to their respective indices
  headers.forEach((header, index) => {
      if (['Name', 'Applied Position', 'Applicant ID', 'Processed Education', 'Processed Skills', 'CV_PDF_File', 'Application Status'].includes(header)) {
          headerIndexMap[header] = index;
      }
  });

  // return applicantData.filter(row => row[headerIndexMap['Application Status']] === 'Successful' || row[headerIndexMap['Application Status']] === 'Unsuccessful').slice(1).map(row => {
  return applicantData.slice(1).map(row => {
    const id = row[headerIndexMap['Applicant ID']];
    const name = row[headerIndexMap['Name']];
    const education = (row[headerIndexMap['Processed Education']]) ? JSON.parse(row[headerIndexMap['Processed Education']]): "";
    const skills = row[headerIndexMap['Processed Skills']];
    const status = row[headerIndexMap['Application Status']];
    const position = row[headerIndexMap['Applied Position']];
    const cv = row[headerIndexMap['CV_PDF_File']];

    return {
      id: id,
      name: name,
      status: status,
      position: position,
      education: (education) ? education : "",
      skills: (skills) ? skills : "",
      cv: cv
    };
  });
}