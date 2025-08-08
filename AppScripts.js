//AppScript to import data from Firestore into Google Sheets
// Configuration - Only change this collection name as needed
var FIREBASE_PROJECT_ID = 'registration-website-admin';
var FIRESTORE_COLLECTION = 'eventnameParticipants/Teams'; // Update this for each collection as  required - event TeamSize 
var SHEET_NAME = 'sheet1';

// Create UI menu when spreadsheet opens
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Import Data')
    .addItem('Import Data', 'importTeamDataFromFirestore')
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

    // Clear existing data
    sheet.clear();

    // Create comprehensive headers for all possible scenarios
    var headers = [
      'Timestamp',
      // Participant 1
      'P1 Name', 'P1 Email', 'P1 Phone no', 'P1 Roll no', 'P1 College', 'P1 Branch', 'P1 Section', 'P1 Year', 'P1 IEEE Member', 'P1 IEEE ID',

      // Participant 2
      'P2 Name', 'P2 Email', 'P2 Phone no', 'P2 Roll np', 'P2 College', 'P2 Branch', 'P2 Section', 'P2 Year', 'P2 IEEE Member', 'P2 IEEE ID',
      // Participant 3
      'P3 Name', 'P3 Email', 'P3 Phone no', 'P3 Roll no', 'P3 College', 'P3 Branch', 'P3 Section', 'P3 Year', 'P3 IEEE Member', 'P3 IEEE ID',
      // Participant 4
      'P4 Name', 'P4 Email', 'P4 Phone no', 'P4 Roll no', 'P4 College', 'P4 Branch', 'P4 Section', 'P4 Year', 'P4 IEEE Member', 'P4 IEEE ID',
      // Custom Questions
      'Custom Q1', 'Custom Q2', 'Custom Q3', 'Custom Q4', 'Custom Q5',
    ];
    
    sheet.appendRow(headers);

    var nextPageToken = '';
    var totalRecords = 0;

    do {
      var response = UrlFetchApp.fetch(firestoreUrl + '?pageSize=100&pageToken=' + nextPageToken);
      var jsonData = JSON.parse(response.getContentText());

      if (jsonData.documents) {
        jsonData.documents.forEach(function (doc) {
          var data = doc.fields;
          
          // Build row data array
          var rowData = [
            convertUTCToIST(data.timeStamp ? data.timeStamp.timestampValue : '')
          ];

          // Add Participant 1 data
          rowData = rowData.concat([
            getFieldValue(data, 'p1_name'),
            getFieldValue(data, 'p1_email'),
            getFieldValue(data, 'p1_phone'),
            getFieldValue(data, 'p1_roll'),
            getFieldValue(data, 'p1_college'),
            getFieldValue(data, 'p1_branch'),
            getFieldValue(data, 'p1_section'),
            getFieldValue(data, 'p1_year'),
            getFieldValue(data, 'p1_ieee_member'),
            getFieldValue(data, 'p1_ieee_id')
          ]);

          // Add Participant 2 data
          rowData = rowData.concat([
            getFieldValue(data, 'p2_name'),
            getFieldValue(data, 'p2_email'),
            getFieldValue(data, 'p2_phone'),
            getFieldValue(data, 'p2_roll'),
            getFieldValue(data, 'p2_college'),
            getFieldValue(data, 'p2_branch'),
            getFieldValue(data, 'p2_section'),
            getFieldValue(data, 'p2_year'),
            getFieldValue(data, 'p2_ieee_member'),
            getFieldValue(data, 'p2_ieee_id')
          ]);

          // Add Participant 3 data
          rowData = rowData.concat([
            getFieldValue(data, 'p3_name'),
            getFieldValue(data, 'p3_email'),
            getFieldValue(data, 'p3_phone'),
            getFieldValue(data, 'p3_roll'),
            getFieldValue(data, 'p3_college'),
            getFieldValue(data, 'p3_branch'),
            getFieldValue(data, 'p3_section'),
            getFieldValue(data, 'p3_year'),
            getFieldValue(data, 'p3_ieee_member'),
            getFieldValue(data, 'p3_ieee_id')
          ]);

          // Add Participant 4 data
          rowData = rowData.concat([
            getFieldValue(data, 'p4_name'),
            getFieldValue(data, 'p4_email'),
            getFieldValue(data, 'p4_phone'),
            getFieldValue(data, 'p4_roll'),
            getFieldValue(data, 'p4_college'),
            getFieldValue(data, 'p4_branch'),
            getFieldValue(data, 'p4_section'),
            getFieldValue(data, 'p4_year'),
            getFieldValue(data, 'p4_ieee_member'),
            getFieldValue(data, 'p4_ieee_id')
          ]);

          // Add Custom Questions (1-5)
          rowData = rowData.concat([
            getFieldValue(data, 'custom_q1'),
            getFieldValue(data, 'custom_q2'),
            getFieldValue(data, 'custom_q3'),
            getFieldValue(data, 'custom_q4'),
            getFieldValue(data, 'custom_q5')
          ]);

          sheet.appendRow(rowData);
          totalRecords++;
        });
      }

      nextPageToken = jsonData.nextPageToken || '';

    } while (nextPageToken);

    // Log success message (optional)
    Logger.log('Import Complete: Successfully imported ' + totalRecords + ' records from collection "' + FIRESTORE_COLLECTION + '"');

  } catch (error) {
    Logger.log('Error during import: ' + error.toString());
    ui.alert('Import Error', 
             'An error occurred during import: ' + error.toString(), 
             ui.ButtonSet.OK);
  }
}

// Helper function to safely get field values
function getFieldValue(data, fieldName, type) {
  if (!data[fieldName]) {
    return '';
  }
  
  switch (type) {
    case 'integer':
      return data[fieldName].integerValue || '';
    case 'timestamp':
      return convertUTCToIST(data[fieldName].timestampValue || '');
    default:
      return data[fieldName].stringValue || '';
  }
}

// Convert UTC timestamp to IST
function convertUTCToIST(utcTimestamp) {
  if (!utcTimestamp) {
    return '';
  }
  
  try {
    var date = new Date(utcTimestamp);
    
    // Format the date as IST
    var indianTime = Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm:ss");
    
    return indianTime;
  } catch (error) {
    Logger.log('Error converting timestamp: ' + error.toString());
    return utcTimestamp; // Return original if conversion fails
  }
}

// Alternative function to run directly (for testing)
function runImportWithCurrentCollection() {
  // Use this function if you want to run the import directly with the collection name set at the top
  importTeamDataFromFirestore();
}