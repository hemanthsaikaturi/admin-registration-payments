//AppScript to import data from Firestore into Google Sheets
// Configuration - Only change this collection name as needed
var FIREBASE_PROJECT_ID = 'testing-registration-admin2'; // Use your actual Project ID
var FIRESTORE_COLLECTION = 'CareerLinkParticipants'; // Update this for each collection as required
var SHEET_NAME = 'Sheet1';

// Create UI menu when spreadsheet opens
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Firebase Importer')
    .addItem('Import Registrations', 'importTeamDataFromFirestore')
    .addToUi();
}

function importTeamDataFromFirestore() {
  var ui = SpreadsheetApp.getUi();  
  
  try {
    var firestoreUrl = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/(default)/documents/' + FIRESTORE_COLLECTION;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      ui.alert('Sheet "' + SHEET_NAME + '" not found. Please create the sheet first.');
      return;
    }

    sheet.clear();

    // --- MODIFIED HEADERS START ---
    var headers = [
      'Timestamp', 'Category',
      // Participant / Faculty
      'Name', 'Email', 'Phone', 'IEEE Member', 'IEEE ID',
      // Student Fields
      'College', 'Roll No', 'Year', 'Branch', 'Section',
      // Faculty Field
      'Department',
      // Payment Fields
      'Transaction ID', 'Screenshot URL', 'Verification Status',
      // Custom Questions
      'Custom Q1', 'Custom Q2', 'Custom Q3', 'Custom Q4', 'Custom Q5'
    ];
    // --- MODIFIED HEADERS END ---
    
    sheet.appendRow(headers);

    // =========== CRITICAL FIX START: Add Authentication ===========
    var options = {
      'method': 'get',
      'headers': {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
      },
      'muteHttpExceptions': true // Continue even if there's an error
    };
    // =========== CRITICAL FIX END ===========

    var nextPageToken = '';
    var totalRecords = 0;
    var rows = []; // Batch rows for faster writing

    do {
      var response = UrlFetchApp.fetch(firestoreUrl + '?pageSize=300&pageToken=' + nextPageToken, options);
      var responseCode = response.getResponseCode();
      var responseBody = response.getContentText();

      if (responseCode !== 200) {
        throw new Error("Error fetching data from Firestore: " + responseBody);
      }

      var jsonData = JSON.parse(responseBody);

      if (jsonData.documents && jsonData.documents.length > 0) {
        jsonData.documents.forEach(function (doc) {
          var data = doc.fields;
          var category = getFieldValue(data, 'participantCategory') || 'student';
          
          var rowData = [
            convertUTCToIST(data.timeStamp ? data.timeStamp.timestampValue : ''),
            category,
            // Participant / Faculty Data
            getFieldValue(data, 'p1_name'),
            getFieldValue(data, 'p1_email'),
            getFieldValue(data, 'p1_phone'),
            getFieldValue(data, 'p1_ieee_member'),
            getFieldValue(data, 'p1_ieee_id'),
            // Student-Specific Data
            category === 'student' ? getFieldValue(data, 'p1_college') : '',
            category === 'student' ? getFieldValue(data, 'p1_roll') : '',
            category === 'student' ? getFieldValue(data, 'p1_year') : '',
            category === 'student' ? getFieldValue(data, 'p1_branch') : '',
            category === 'student' ? getFieldValue(data, 'p1_section') : '',
            // Faculty-Specific Data
            category === 'faculty' ? getFieldValue(data, 'p1_dept') : '',
            // Payment Data
            getFieldValue(data, 'transactionId'),
            getFieldValue(data, 'screenshotURL'),
            getFieldValue(data, 'verificationStatus'),
            // Custom Questions
            getFieldValue(data, 'custom_q1'),
            getFieldValue(data, 'custom_q2'),
            getFieldValue(data, 'custom_q3'),
            getFieldValue(data, 'custom_q4'),
            getFieldValue(data, 'custom_q5')
          ];
          rows.push(rowData);
          totalRecords++;
        });
      }

      nextPageToken = jsonData.nextPageToken || '';

    } while (nextPageToken);

    if(rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      sheet.autoResizeColumns(1, headers.length);
    }
    
    Logger.log('Import Complete: Successfully imported ' + totalRecords + ' records from collection "' + FIRESTORE_COLLECTION + '"');
    ui.alert('Success!', 'Imported ' + totalRecords + ' records.', ui.ButtonSet.OK);

  } catch (error) {
    Logger.log('Error during import: ' + error.toString());
    ui.alert('Import Error', 'An error occurred: ' + error.toString(), ui.ButtonSet.OK);
  }
}

function getFieldValue(data, fieldName, type) {
  if (!data || !data[fieldName]) {
    return '';
  }
  var field = data[fieldName];
  
  if (type === 'timestamp') {
    return convertUTCToIST(field.timestampValue || '');
  }
  return field.stringValue || field.integerValue || field.doubleValue || field.booleanValue || '';
}

function convertUTCToIST(utcTimestamp) {
  if (!utcTimestamp) {
    return '';
  }
  try {
    var date = new Date(utcTimestamp);
    var indianTime = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    return indianTime;
  } catch (error) {
    Logger.log('Error converting timestamp: ' + error.toString());
    return utcTimestamp;
  }
}

function runImportWithCurrentCollection() {
  importDataFromFirestore();
}