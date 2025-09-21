// AppScript to import data from Firestore into Google Sheets
// ==========================================================
//      CONFIGURATION - Only change these values
// ==========================================================
var FIREBASE_PROJECT_ID = 'testing-registration-admin2'; // Use your actual Project ID
var FIRESTORE_COLLECTION = 'CareerLinkParticipants';     // UPDATE THIS FOR EACH EVENT
var SHEET_NAME = 'Sheet1';

// ==========================================================
//      CORE SCRIPT - Do not change below this line
// ==========================================================

// Create a custom menu when the spreadsheet is opened
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Firebase Importer')
    .addItem('Import Registrations', 'importRegistrationsFromFirestore')
    .addToUi();
}

/**
 * Main function to import data from the specified Firestore collection.
 */
function importRegistrationsFromFirestore() {
  var ui = SpreadsheetApp.getUi();  
  
  try {
    var firestoreUrl = 'https://firestore.googleapis.com/v1/projects/' + FIREBASE_PROJECT_ID + '/databases/(default)/documents/' + FIRESTORE_COLLECTION;
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      throw new Error('Sheet "' + SHEET_NAME + '" not found. Please create it first.');
    }

    sheet.clear();

    // --- Definitive Headers for All Registration Types ---
    var headers = [
      'Timestamp', 'Category', 'Is IEEE Member',
      'Name', 'Email', 'Phone',
      'College', 'Roll No', 'Year', 'Branch', 'Section', // Student
      'Department', // Faculty
      'Transaction ID', 'Membership ID', 
      'Proof URL (Screenshot/Card)', 'Verification Status'
    ];

    // Find all custom question keys from the first few documents
    var customQuestionHeaders = getCustomQuestionHeaders(firestoreUrl);
    headers = headers.concat(customQuestionHeaders);
    
    sheet.appendRow(headers);

    var options = {
      'method': 'get',
      'headers': {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
      },
      'muteHttpExceptions': true
    };

    var nextPageToken = '';
    var totalRecords = 0;
    var rows = [];

    do {
      var response = UrlFetchApp.fetch(firestoreUrl + '?pageSize=300&pageToken=' + nextPageToken, options);
      var responseCode = response.getResponseCode();
      var responseBody = response.getContentText();

      if (responseCode !== 200) {
        throw new Error("Error fetching data: " + responseBody);
      }

      var jsonData = JSON.parse(responseBody);

      if (jsonData.documents && jsonData.documents.length > 0) {
        jsonData.documents.forEach(function (doc) {
          var data = doc.fields;
          var category = getFieldValue(data, 'participantCategory') || 'student';
          
          var rowData = [
            convertUTCToIST(data.timeStamp ? data.timeStamp.timestampValue : ''),
            category,
            getFieldValue(data, 'isIeeeMember'),
            getFieldValue(data, 'p1_name'),
            getFieldValue(data, 'p1_email'),
            getFieldValue(data, 'p1_phone'),
            category === 'student' ? getFieldValue(data, 'p1_college') : '',
            category === 'student' ? getFieldValue(data, 'p1_roll') : '',
            category === 'student' ? getFieldValue(data, 'p1_year') : '',
            category === 'student' ? getFieldValue(data, 'p1_branch') : '',
            category === 'student' ? getFieldValue(data, 'p1_section') : '',
            category === 'faculty' ? getFieldValue(data, 'p1_dept') : '',
            getFieldValue(data, 'transactionId'),
            getFieldValue(data, 'membershipId'),
            getFieldValue(data, 'screenshotURL') || getFieldValue(data, 'membershipCardURL'),
            getFieldValue(data, 'verificationStatus'),
          ];

          // Add custom question answers in the correct order
          customQuestionHeaders.forEach(function(header) {
              rowData.push(getFieldValue(data, header.replace(/\s+/g, '_')));
          });

          rows.push(rowData);
          totalRecords++;
        });
      }

      nextPageToken = jsonData.nextPageToken || '';

    } while (nextPageToken);

    if (rows.length > 0) {
      sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
      sheet.autoResizeColumns(1, headers.length);
    }
    
    Logger.log('Import Complete: ' + totalRecords + ' records from "' + FIRESTORE_COLLECTION + '"');
    ui.alert('Success!', 'Imported ' + totalRecords + ' records.', ui.ButtonSet.OK);

  } catch (error) {
    Logger.log('Error during import: ' + error.toString());
    ui.alert('Import Error', 'An error occurred: ' + error.toString(), ui.ButtonSet.OK);
  }
}

/**
 * Helper function to extract a field's value from Firestore's JSON format.
 */
function getFieldValue(data, fieldName) {
  if (!data || !data[fieldName]) {
    return '';
  }
  var field = data[fieldName];
  
  return field.stringValue || field.integerValue || field.doubleValue || (typeof field.booleanValue !== 'undefined' ? field.booleanValue : '') || '';
}

/**
 * Helper function to convert a UTC timestamp string to IST format.
 */
function convertUTCToIST(utcTimestamp) {
  if (!utcTimestamp) return '';
  try {
    var date = new Date(utcTimestamp);
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
  } catch (error) {
    Logger.log('Error converting timestamp: ' + error.toString());
    return utcTimestamp;
  }
}

/**
 * Helper function to dynamically find all custom question headers.
 */
function getCustomQuestionHeaders(firestoreUrl) {
    var options = {
      'method': 'get',
      'headers': {
        'Authorization': 'Bearer ' + ScriptApp.getOAuthToken()
      },
      'muteHttpExceptions': true
    };

    var response = UrlFetchApp.fetch(firestoreUrl + '?pageSize=10', options); // Check first 10 docs
    var responseBody = response.getContentText();
    var jsonData = JSON.parse(responseBody);
    var questionKeys = new Set();

    if (jsonData.documents) {
        jsonData.documents.forEach(function(doc) {
            Object.keys(doc.fields).forEach(function(key) {
                if (key.startsWith('custom_q_')) {
                    questionKeys.add(key.replace(/_/g, ' '));
                }
            });
        });
    }
    return Array.from(questionKeys).sort();
}